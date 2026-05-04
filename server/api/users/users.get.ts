import { createError, defineEventHandler, type H3Event } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event: H3Event) => {
  const session = await requireUserSession(event)
  const sessionUser = session as { user?: { id?: number, permissions?: string[] } }

  if (!sessionUser.user?.permissions?.includes('ADMIN')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only admins can view users'
    })
  }

  const createdById = Number(sessionUser.user.id)

  if (!Number.isInteger(createdById)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Session user is missing'
    })
  }

  const users = await prisma.user.findMany({
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
