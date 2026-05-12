export default defineEventHandler(async (event) => {
  await authorize(event, isAdmin)

  const result = await prisma.licenseAssignment.findMany({
    where: {
      status: 'PENDING'
    },
    orderBy: {
      requestedAt: 'desc'
    },
    select: {
      id: true,
      requestedAt: true,
      status: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      licenseKey: {
        select: {
          id: true,
          currentUsages: true,
          maxUsages: true,
          licenseName: true,
          licenseType: true,
          status: true,
          product: {
            select: {
              id: true,
              productName: true
            }
          }
        }
      }
    }
  })

  return result
})
