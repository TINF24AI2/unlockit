import { createError, defineEventHandler, readBody, getRouterParam, type H3Event } from 'h3'
import { Permission } from '../../../../generated/prisma/client'
import { prisma } from '../../../utils/prisma'

interface PermissionPayload {
  permissions: Permission[]
}

export default defineEventHandler(async (event: H3Event) => {
  await authorize(event, isAdmin)

  const targetId = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(targetId) || targetId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid user ID'
    })
  }

  // Prevent admins from modifying their own permissions
  await authorize(event, noSelfChange, targetId)

  const body = await readBody<PermissionPayload>(event)
  // Validate permissions array
  if (!body.permissions || !Array.isArray(body.permissions)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Permissions array is required'
    })
  }

  // Validate that all provided permissions are valid enum values
  const validPermissions = Object.values(Permission)
  const hasInvalidPermission = body.permissions.some(p => !validPermissions.includes(p))

  if (hasInvalidPermission) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid permission value. Allowed: ${validPermissions.join(', ')}`
    })
  }

  // Check if target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetId }
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  // Update permissions of the target user
  const updatedUser = await prisma.user.update({
    where: { id: targetId },
    data: {
      permissions: body.permissions
    },
    select: {
      id: true,
      email: true,
      name: true,
      permissions: true,
      updatedAt: true
    }
  })

  return {
    success: true,
    data: updatedUser
  }
})
