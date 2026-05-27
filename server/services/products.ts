import { prisma } from '#server/utils/prisma'
import { AssignmentStatus, LicenseStatus, ProductStatus } from '../../generated/prisma/client'

// DeactivateProductPayload - structure returned when deactivating a product
export interface DeactivateProductPayload {
  success: boolean
  data: {
    productId: string
    productName: string
    deactivatedAt: Date
    deactivatedBy: number
    affectedAssignments: {
      count: number
      ids: string[]
    }
    affectedLicenses: {
      count: number
      ids: string[]
    }
  }
}

// deactivateProduct - deactivates a product and updates related licenses and assignments
// When a product is deactivated:
// - Product status: ACTIVE → DEACTIVATED
// - All licenses WITHOUT approved assignments: set to INACTIVE
// - PENDING assignments: REJECTED (with reason)
export async function deactivateProduct(
  productId: string,
  adminId: number,
  reason?: string
): Promise<DeactivateProductPayload> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      licenseKeys: {
        select: {
          id: true,
          assignments: {
            select: {
              id: true,
              status: true
            }
          }
        }
      }
    }
  })

  if (!product) {
    throw new Error(`Product with ID ${productId} not found`)
  }

  if (product.status === ProductStatus.DEACTIVATED) {
    throw new Error('Product is already deactivated')
  }

  // Collect PENDING assignment IDs and license IDs
  const pendingAssignmentIds: string[] = []
  const licenseIdsToDeactivate: string[] = []

  for (const license of product.licenseKeys) {
    const hasApprovedAssignment = license.assignments.some(
      a => a.status === AssignmentStatus.APPROVED
    )
    const pendingAssignments = license.assignments.filter(
      a => a.status === AssignmentStatus.PENDING
    )

    // Only deactivate licenses that don't have APPROVED assignments
    if (!hasApprovedAssignment) {
      licenseIdsToDeactivate.push(license.id)
    }

    // Collect PENDING assignments regardless of license deactivation status
    pendingAssignmentIds.push(...pendingAssignments.map(a => a.id))
  }

  // Prepare database operations: update product, licenses, and related assignments in a transaction
  const transactionOperations: Array<ReturnType<typeof prisma.product.update> | ReturnType<typeof prisma.licenseKey.updateMany> | ReturnType<typeof prisma.licenseAssignment.update>> = []

  // Update product status to DEACTIVATED
  transactionOperations.push(
    prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.DEACTIVATED
      }
    })
  )

  // Update licenses without APPROVED assignments to INACTIVE
  if (licenseIdsToDeactivate.length > 0) {
    transactionOperations.push(
      prisma.licenseKey.updateMany({
        where: { id: { in: licenseIdsToDeactivate } },
        data: {
          status: LicenseStatus.INACTIVE
        }
      })
    )
  }

  // Update PENDING assignments to REJECTED with a note about the product deactivation
  // Use individual update operations to create AssignmentHistory entries
  if (pendingAssignmentIds.length > 0) {
    const noteMessage = reason
      ? `Product deactivated by admin. Reason: ${reason}`
      : 'Product deactivated by admin'

    for (const assignmentId of pendingAssignmentIds) {
      transactionOperations.push(
        prisma.licenseAssignment.update({
          where: { id: assignmentId },
          data: {
            status: AssignmentStatus.REJECTED,
            assignmentNote: noteMessage,
            history: {
              create: {
                id: crypto.randomUUID(),
                oldStatus: AssignmentStatus.PENDING,
                newStatus: AssignmentStatus.REJECTED,
                changedBy: {
                  connect: {
                    id: adminId
                  }
                }
              }
            }
          }
        })
      )
    }
  }

  await prisma.$transaction(transactionOperations)

  return {
    success: true,
    data: {
      productId: product.id,
      productName: product.productName,
      deactivatedAt: new Date(),
      deactivatedBy: adminId,
      affectedAssignments: {
        count: pendingAssignmentIds.length,
        ids: pendingAssignmentIds
      },
      affectedLicenses: {
        count: licenseIdsToDeactivate.length,
        ids: licenseIdsToDeactivate
      }
    }
  }
}

// ReactivateProductPayload - structure returned when reactivating a product
export interface ReactivateProductPayload {
  success: boolean
  data: {
    productId: string
    productName: string
    reactivatedAt: Date
    reactivatedBy: number
  }
}

// reactivateProduct - sets a product from DEACTIVATED back to ACTIVE and reactivates all INACTIVE licenses
// When a product is reactivated:
// - Product status: DEACTIVATED → ACTIVE
// - All INACTIVE licenses for this product: set back to ACTIVE
export async function reactivateProduct(
  productId: string,
  adminId: number
): Promise<ReactivateProductPayload> {
  const product = await prisma.product.findUnique({
    where: { id: productId }
  })

  if (!product) {
    throw new Error(`Product with ID ${productId} not found`)
  }

  if (product.status === ProductStatus.ACTIVE) {
    throw new Error('Product is already active')
  }

  if (product.status === ProductStatus.DELETED) {
    throw new Error('Cannot reactivate a deleted product')
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.ACTIVE
      }
    }),
    prisma.licenseKey.updateMany({
      where: {
        productId: productId,
        status: LicenseStatus.INACTIVE
      },
      data: {
        status: LicenseStatus.ACTIVE
      }
    })
  ])

  return {
    success: true,
    data: {
      productId: product.id,
      productName: product.productName,
      reactivatedAt: new Date(),
      reactivatedBy: adminId
    }
  }
}

// DeleteProductPayload - structure returned when deleting a product
export interface DeleteProductPayload {
  success: boolean
  data: {
    productId: string
    productName: string
    deletedAt: Date
    deletedBy: number
    affectedLicenses: {
      count: number
      ids: string[]
    }
  }
}

// deleteProduct - performs a soft delete of a product
// Rules for deleting a product:
// - Product must be in DEACTIVATED status
// - All licenses are set to DEACTIVATED (soft delete, not hard delete)
// - Licenses linked to a DELETED product cannot be reactivated
export async function deleteProduct(
  productId: string,
  adminId: number
): Promise<DeleteProductPayload> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      licenseKeys: {
        select: {
          id: true
        }
      }
    }
  })

  if (!product) {
    throw new Error(`Product with ID ${productId} not found`)
  }

  if (product.status !== ProductStatus.DEACTIVATED) {
    throw new Error('Product must be deactivated before deletion')
  }

  const licenseIds = product.licenseKeys.map(l => l.id)

  // Prepare database operations: update product and all related licenses in a transaction
  const transactionOperations: Array<
    ReturnType<typeof prisma.product.update> | ReturnType<typeof prisma.licenseKey.updateMany>
  > = []

  transactionOperations.push(
    prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.DELETED
      }
    })
  )

  if (licenseIds.length > 0) {
    transactionOperations.push(
      prisma.licenseKey.updateMany({
        where: { id: { in: licenseIds } },
        data: {
          status: LicenseStatus.INACTIVE
        }
      })
    )
  }

  await prisma.$transaction(transactionOperations)

  return {
    success: true,
    data: {
      productId: product.id,
      productName: product.productName,
      deletedAt: new Date(),
      deletedBy: adminId,
      affectedLicenses: {
        count: licenseIds.length,
        ids: licenseIds
      }
    }
  }
}
