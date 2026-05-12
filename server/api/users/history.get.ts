import { defineEventHandler, type H3Event } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event: H3Event) => {
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
      processedAt: true,
      assignmentNote: true,
      processedBy: {
        select: {
          email: true,
          name: true
        }
      },
      licenseKey: {
        select: {
          id: true,
          licenseName: true,
          licenseType: true,
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

  return {
    success: true,
    data: assignments
  }
})
