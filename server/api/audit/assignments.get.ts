export default defineEventHandler(async (event) => {
  await authorize(event, isUser)

  const session = await requireUserSession(event)
  const sessionUser = session.user as LoggedInUser
  const userId = Number(sessionUser.id)

  const isAdminUser = await allows(event, isAdmin)

  const query = getQuery(event)
  const id = query.id as string
  const asUser = query.role === 'user'

  const history = await prisma.assignmentHistory.findMany({
    where: {
      licenseAssignment: asUser || !isAdminUser
        ? {
            userId: userId
          }
        : undefined,
      id: id ? id : undefined
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
