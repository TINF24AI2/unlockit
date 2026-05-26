import { defineEventHandler, type H3Event } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event: H3Event): Promise<{ success: boolean, data: LicenseAssignmentHistoryEntry[] }> => {
  await authorize(event, isUser)

  const session = await requireUserSession(event)
  const sessionUser = session.user as LoggedInUser
  const userId = Number(sessionUser.id)

  const assignments = await prisma.licenseAssignment.findMany({
    where: { userId },
    orderBy: { requestedAt: 'desc' },
    select: {
      id: true,
      status: true,
      requestedAt: true,
      assignmentNote: true,
      history: {
        take: 1,
        orderBy: { changedAt: 'desc' },
        select: {
          id: true,
          changedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          changedAt: true
        }
      },
      licenseKey: {
        select: {
          id: true,
          licenseName: true,
          licenseType: true,
          licenseKey: true,
          status: true,
          expiresAt: true,
          product: {
            select: {
              id: true,
              productName: true,
              vendor: true
            }
          }
        }
      }
    }
  })

  const formattedAssignments: LicenseAssignmentHistoryEntry[] = assignments.map(assignment => ({
    id: assignment.id,
    status: assignment.status,
    requestedAt: assignment.requestedAt,
    assignmentNote: assignment.assignmentNote,
    processedAt: assignment.history.length > 0 ? assignment.history[0]!.changedAt : null,
    processedBy: assignment.history.length > 0
      ? {
          id: assignment.history[0]!.changedBy.id,
          name: assignment.history[0]!.changedBy.name,
          email: assignment.history[0]!.changedBy.email
        }
      : null,
    licenseKey: {
      id: assignment.licenseKey.id,
      licenseName: assignment.licenseKey.licenseName,
      licenseType: assignment.licenseKey.licenseType,
      licenseKey: assignment.status == 'APPROVED' ? assignment.licenseKey.licenseKey : null,
      status: assignment.licenseKey.status,
      expiresAt: assignment.licenseKey.expiresAt,
      product: {
        id: assignment.licenseKey.product.id,
        productName: assignment.licenseKey.product.productName,
        vendor: assignment.licenseKey.product.vendor
      }
    }
  }))

  return {
    success: true,
    data: formattedAssignments
  }
})
