import { z } from 'zod'

const bodySchema = z.object({
  id: z.number(),
  status: z.enum(['ACTIVE', 'DEACTIVATED', 'DELETED'])
})

export default defineEventHandler(async (event) => {
  await authorize(event, isAdmin)

  const { id, status } = await readValidatedBody(event, bodySchema.parse)

  await authorize(event, noSelfChange, id)

  const user = await prisma.user.findUnique({
    where: { id: id },
    select: {
      id: true,
      email: true,
      name: true,
      status: true
    }
  })

  if (user == null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  // Check for valid status transition
  if (user.status === status) {
    throw createError({
      statusCode: 400,
      statusMessage: `User is already ${status.toLowerCase()}`
    })
  }
  if (user.status === 'ACTIVE' && status !== 'DEACTIVATED') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only deactivation is allowed for active users'
    })
  }
  if (user.status === 'DELETED') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot update status of deleted user'
    })
  }

  await prisma.user.update({
    where: { id },
    data: {
      status: status,

      // Clear user data on deletion
      email: status === 'DELETED' ? 'anonymous' + id : user.email,
      name: status === 'DELETED' ? 'Deleted User' : user.name
    }
  })

  return {
    success: true
  }
})
