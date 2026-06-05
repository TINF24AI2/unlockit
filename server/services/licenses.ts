import { randomUUID } from 'node:crypto'
import { prisma } from '#server/utils/prisma'
import { AssignmentStatus, LicenseStatus, ProductStatus, type LicenseType, type Prisma } from '../../generated/prisma/client'

// LicenseFilter - optional filter criteria for listLicenses()
export interface LicenseFilter {
  productId?: string
  status?: LicenseStatus
  onlyActive?: boolean
}

// LicenseListing - structure of a license as returned in listLicenses()
// Includes license info, status, related product and assignment stats
export interface LicenseListing {
  id: string
  licenseName: string
  licenseKey: string
  licenseType: LicenseType
  maxUsages: number
  currentUsages: number
  requiresAdminApproval: boolean
  expiresAt: Date | null
  status: LicenseStatus
  product: {
    id: string
    productName: string
  }
  assignments: {
    total: number
    pending: number
    approved: number
    rejected: number
    revoked: number
  }
  uploadedAt: Date
}

// listLicenses - retrieves licenses from the database with optional filtering
export async function listLicenses(filter?: LicenseFilter): Promise<LicenseListing[]> {
  type LicenseKeyWithRelations = Prisma.LicenseKeyGetPayload<{
    include: {
      product: {
        select: {
          id: true
          productName: true
        }
      }
      assignments: {
        select: {
          status: true
        }
      }
    }
  }>

  // Dynamic query construction based on provided filters
  const licenseKeys = await prisma.licenseKey.findMany({
    where: {
      productId: filter?.productId,
      status: filter?.status,
      ...(filter?.onlyActive ? { status: LicenseStatus.ACTIVE } : {})
    },
    include: {
      product: {
        select: {
          id: true,
          productName: true
        }
      },
      assignments: {
        select: {
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }) as LicenseKeyWithRelations[]

  // Map database records to LicenseListing format and calculate assignment stats
  return licenseKeys.map((license) => {
    const assignmentStats = license.assignments.reduce(
      (acc, assignment) => {
        acc.total += 1
        acc[assignment.status.toLowerCase() as keyof Omit<typeof acc, 'total'>] += 1
        return acc
      },
      { total: 0, pending: 0, approved: 0, rejected: 0, revoked: 0 }
    )
    // Return the structured license listing
    return {
      id: license.id,
      licenseName: license.licenseName,
      licenseKey: license.licenseKey,
      licenseType: license.licenseType,
      maxUsages: license.maxUsages,
      currentUsages: license.currentUsages,
      requiresAdminApproval: license.requiresAdminApproval,
      expiresAt: license.expiresAt,
      status: license.status,
      product: license.product,
      assignments: assignmentStats,
      uploadedAt: license.createdAt
    }
  })
}

// DeactivateLicensePayload - expected structure of the request body for deactivating a license
export interface DeactivateLicensePayload {
  success: boolean
  data: {
    licenseId: string
    licenseName: string
    deactivatedAt: Date
    deactivatedBy: number
    affectedAssignments: {
      count: number
      ids: string[]
    }
  }
}

// deactivateLicense - deactivates a license and updates related assignments
export async function deactivateLicense(
  licenseId: string,
  adminId: number,
  reason: string
): Promise<DeactivateLicensePayload> {
  // Fetch the license along with its active/pending assignments to determine impact
  const license = await prisma.licenseKey.findUnique({
    where: { id: licenseId },
    include: {
      assignments: {
        where: {
          status: { in: [AssignmentStatus.PENDING, AssignmentStatus.APPROVED] }
        }
      }
    }
  })

  if (!license) {
    throw new Error(`License with ID ${licenseId} not found`)
  }

  if (license.status === LicenseStatus.INACTIVE) {
    throw new Error('License is already inactive')
  }

  // Prepare database operations: update license status and related assignments in a transaction
  const pendingAssignmentIds = license.assignments
    .filter(assignment => assignment.status === AssignmentStatus.PENDING)
    .map(assignment => assignment.id)
  const approvedAssignmentIds = license.assignments
    .filter(assignment => assignment.status === AssignmentStatus.APPROVED)
    .map(assignment => assignment.id)

  const transactionOperations: Array<ReturnType<typeof prisma.licenseKey.update> | ReturnType<typeof prisma.licenseAssignment.update>> = []

  // Update license status to INACTIVE
  transactionOperations.push(
    prisma.licenseKey.update({
      where: { id: licenseId },
      data: {
        status: LicenseStatus.INACTIVE
      }
    })
  )

  // Update pending assignments to REJECTED with history entries
  if (pendingAssignmentIds.length > 0) {
    const noteMessage = `License deactivated by admin. Reason: ${reason}`
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

  // Update approved assignments to REVOKED with history entries
  // Approved assignments are revoked (not rejected) to indicate they were valid but are now invalid due to deactivation
  if (approvedAssignmentIds.length > 0) {
    const noteMessage = `License revoked due to deactivation by admin. Reason: ${reason}`
    for (const assignmentId of approvedAssignmentIds) {
      transactionOperations.push(
        prisma.licenseAssignment.update({
          where: { id: assignmentId },
          data: {
            status: AssignmentStatus.REVOKED,
            assignmentNote: noteMessage,
            history: {
              create: {
                id: crypto.randomUUID(),
                oldStatus: AssignmentStatus.APPROVED,
                newStatus: AssignmentStatus.REVOKED,
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
    // Decrement currentUsages for each revoked APPROVED assignment
    transactionOperations.push(
      prisma.licenseKey.update({
        where: { id: licenseId },
        data: {
          currentUsages: { decrement: approvedAssignmentIds.length }
        }
      })
    )
  }

  await prisma.$transaction(transactionOperations)

  // Return details about the deactivated license and the impact on assignments
  const affectedAssignmentIds = [...pendingAssignmentIds, ...approvedAssignmentIds]

  return {
    success: true,
    data: {
      licenseId: license.id,
      licenseName: license.licenseName,
      deactivatedAt: new Date(),
      deactivatedBy: adminId,
      affectedAssignments: {
        count: affectedAssignmentIds.length,
        ids: affectedAssignmentIds
      }
    }
  }
}

// ReactivateLicensePayload - structure returned when reactivating a license
export interface ReactivateLicensePayload {
  success: boolean
  data: {
    licenseId: string
    licenseName: string
    reactivatedAt: Date
    reactivatedBy: number
  }
}

// reactivateLicense - sets a license from INACTIVE to ACTIVE
// Note: Cannot reactivate a license if its product is not ACTIVE
export async function reactivateLicense(
  licenseId: string,
  adminId: number
): Promise<ReactivateLicensePayload> {
  const license = await prisma.licenseKey.findUnique({
    where: { id: licenseId },
    include: {
      product: {
        select: {
          id: true,
          status: true
        }
      }
    }
  })

  if (!license) {
    throw new Error(`License with ID ${licenseId} not found`)
  }

  if (license.status === LicenseStatus.ACTIVE) {
    throw new Error('License is already active')
  }

  if (license.product.status !== ProductStatus.ACTIVE) {
    throw new Error('Cannot reactivate a license for a deactivated or deleted product')
  }

  await prisma.licenseKey.update({
    where: { id: licenseId },
    data: {
      status: LicenseStatus.ACTIVE
    }
  })

  return {
    success: true,
    data: {
      licenseId: license.id,
      licenseName: license.licenseName,
      reactivatedAt: new Date(),
      reactivatedBy: adminId
    }
  }
}

// UserLicenseListing - structure of a license as returned for users viewing available licenses
export interface UserLicenseListing {
  id: string
  licenseName: string
  licenseType: LicenseType
  maxUsages: number
  currentUsages: number
  availableSlots: number
  requiresAdminApproval: boolean
  expiresAt: Date | null
  status: LicenseStatus
  product: {
    id: string
    productName: string
    description: string | null
  }
  userAssignment: {
    status: AssignmentStatus | null
    myApprovedCount: number
  }
  canRequest: boolean
}

// getLicensesWithUserContext - retrieves active licenses with user context
export async function getLicensesWithUserContext(
  userId: number
): Promise<UserLicenseListing[]> {
  type LicenseKeyWithAssignments = Prisma.LicenseKeyGetPayload<{
    include: {
      product: {
        select: {
          id: true
          productName: true
          description: true
        }
      }
      assignments: {
        select: {
          status: true
        }
      }
    }
  }>

  // Fetch all active licenses
  const licenseKeys = await prisma.licenseKey.findMany({
    where: {
      status: LicenseStatus.ACTIVE
    },
    include: {
      product: {
        select: {
          id: true,
          productName: true,
          description: true
        }
      },
      assignments: {
        where: { userId: userId },
        orderBy: { requestedAt: 'desc' },
        select: {
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }) as LicenseKeyWithAssignments[]

  // Map to user context
  return licenseKeys.map((license) => {
    const userAssignments = license.assignments
    const approvedCount = userAssignments.filter(a => a.status === AssignmentStatus.APPROVED).length
    const hasPendingRequest = userAssignments.some(a => a.status === AssignmentStatus.PENDING)
    const hasApprovedAssignment = approvedCount > 0

    // User can request if: no approved assignment exists AND no pending request exists AND slots available
    const canRequest = !hasApprovedAssignment && !hasPendingRequest && license.currentUsages < license.maxUsages

    return {
      id: license.id,
      licenseName: license.licenseName,
      licenseType: license.licenseType,
      maxUsages: license.maxUsages,
      currentUsages: license.currentUsages,
      availableSlots: license.maxUsages - license.currentUsages,
      requiresAdminApproval: license.requiresAdminApproval,
      expiresAt: license.expiresAt,
      status: license.status,
      product: license.product,
      userAssignment: {
        status: userAssignments.length > 0 ? userAssignments[0]?.status ?? null : null,
        myApprovedCount: approvedCount
      },
      canRequest
    }
  })
}

// RequestLicenseResult - structure returned when creating a license request
export interface RequestLicenseResult {
  id: string
  licenseKeyId: string
  userId: number
  status: AssignmentStatus
  requestedAt: Date
  licenseKey: {
    productId: string
  }
}

// requestLicense - creates a new license request for a user
// Selects the first available license for the product and creates a PENDING assignment
export async function requestLicense(
  userId: number,
  productId: string,
  reason: string
): Promise<RequestLicenseResult> {
  // Find first available active license for this product with available slots and not expired
  const availableLicense = await prisma.licenseKey.findFirst({
    where: {
      productId,
      status: LicenseStatus.ACTIVE,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    orderBy: [
      { requiresAdminApproval: 'asc' },
      { createdAt: 'asc' }
    ],
    select: {
      id: true,
      productId: true,
      maxUsages: true,
      currentUsages: true,
      requiresAdminApproval: true,
      expiresAt: true
    }
  })

  // Check if license has available slots
  if (availableLicense && availableLicense.currentUsages >= availableLicense.maxUsages) {
    throw new Error(`All licenses for product with ID ${productId} have reached their usage limit`)
  }

  if (!availableLicense) {
    throw new Error(`No available licenses found for product with ID ${productId}`)
  }

  // Create a new assignment with PENDING status
  const assignmentId = randomUUID()
  const assignment = await prisma.licenseAssignment.create({
    data: {
      id: assignmentId,
      licenseKeyId: availableLicense.id,
      userId,
      status: AssignmentStatus.PENDING,
      assignmentNote: reason,
      history: {
        create: {
          id: randomUUID(),
          oldStatus: AssignmentStatus.PENDING, // oldStatus can't be NULL, so initial entry is also PENDING
          newStatus: AssignmentStatus.PENDING,
          changedBy: {
            connect: { id: userId }
          }
        }
      }
    },
    select: {
      id: true,
      licenseKeyId: true,
      userId: true,
      status: true,
      requestedAt: true,
      licenseKey: {
        select: {
          productId: true
        }
      }
    }
  })

  // If the license does not require admin approval, automatically approve it and update usage count
  if (!availableLicense.requiresAdminApproval) {
    const systemUser = await prisma.user.findFirst({
      where: { email: 'system' },
      select: { id: true }
    })

    if (!systemUser) {
      throw new Error('System user not found – cannot auto-approve assignment')
    }

    // Determine if the license will be exhausted after increment
    const willBeExhausted
      = availableLicense.maxUsages !== null
        && (availableLicense.currentUsages ?? 0) + 1 >= availableLicense.maxUsages

    await prisma.$transaction([
      prisma.licenseAssignment.update({
        where: { id: assignmentId },
        data: {
          status: AssignmentStatus.APPROVED,
          history: {
            create: {
              id: randomUUID(),
              oldStatus: AssignmentStatus.PENDING,
              newStatus: AssignmentStatus.APPROVED,
              changedBy: {
                connect: { id: systemUser.id }
              }
            }
          }
        }
      }),
      prisma.licenseKey.update({
        where: { id: availableLicense.id },
        data: {
          currentUsages: { increment: 1 },
          ...(willBeExhausted ? { status: LicenseStatus.EXHAUSTED } : {})
        }
      })
    ])

    return { ...assignment, status: AssignmentStatus.APPROVED }
  }

  return assignment
}
