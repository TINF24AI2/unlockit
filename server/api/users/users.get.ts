import { defineEventHandler, type H3Event } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event: H3Event) => {
  await authorize(event, isAdmin)

  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: '@'
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      permissions: true,
      createdById: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  return {
    success: true,
    data: users
  }
})
