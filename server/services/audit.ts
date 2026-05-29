import { prisma } from '#server/utils/prisma'
import type { Prisma } from '../../generated/prisma/client'

// AuditRecord - structure of a single audit history entry
export interface AuditRecord {
  id: string
  changedAt: Date
  newStatus: string
  oldStatus: string
  changedBy: {
    id: number
    email: string
    name: string | null
  }
  licenseAssignment: {
    id: string
    requestedAt: Date
    assignmentNote: string | null
    licenseKey: {
      id: string
      licenseName: string
      licenseType: string
      product: {
        id: string
        productName: string
      }
    }
    user: {
      id: number
      email: string
      name: string | null
    }
  }
}

// AuditFilter - optional filter criteria for getAuditHistory()
export interface AuditFilter {
  startDate?: Date
  endDate?: Date
  userId?: number
  productId?: string
}

// getAuditHistory - retrieves audit history records based on optional filters
export async function getAuditHistory(filter?: AuditFilter): Promise<AuditRecord[]> {
  type AssignmentHistoryWithRelations = Prisma.AssignmentHistoryGetPayload<{
    select: {
      id: true
      changedAt: true
      newStatus: true
      oldStatus: true
      changedBy: {
        select: {
          id: true
          email: true
          name: true
        }
      }
      licenseAssignment: {
        select: {
          id: true
          requestedAt: true
          licenseKey: {
            select: {
              id: true
              licenseName: true
              licenseType: true
              product: {
                select: {
                  id: true
                  productName: true
                }
              }
            }
          }
          user: {
            select: {
              id: true
              email: true
              name: true
            }
          }
        }
      }
    }
  }>

  const history = await prisma.assignmentHistory.findMany({
    where: {
      changedAt: {
        gte: filter?.startDate,
        lte: filter?.endDate
      },
      licenseAssignment: filter?.userId
        ? {
            userId: filter.userId
          }
        : filter?.productId
          ? {
              licenseKey: {
                productId: filter.productId
              }
            }
          : undefined
    },
    orderBy: {
      changedAt: 'desc'
    },
    select: {
      id: true,
      changedAt: true,
      newStatus: true,
      oldStatus: true,
      changedBy: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      licenseAssignment: {
        select: {
          id: true,
          requestedAt: true,
          assignmentNote: true,
          licenseKey: {
            select: {
              id: true,
              licenseName: true,
              licenseType: true,
              product: {
                select: {
                  id: true,
                  productName: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      }
    }
  }) as AssignmentHistoryWithRelations[]

  return history as AuditRecord[]
}
