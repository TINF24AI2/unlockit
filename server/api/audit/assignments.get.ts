export default defineEventHandler(async (event) => {
  await authorize(event, isAdmin)

  const query = getQuery(event)
  const id = query.id as string

  const whereClause = id ? { id } : undefined

  const history = await prisma.assignmentHistory.findMany({
    where: whereClause,
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
  })

  return history
})
