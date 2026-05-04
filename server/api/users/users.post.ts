import { createError, defineEventHandler, readBody, type H3Event } from 'h3'
import { Permission } from '../../../generated/prisma/client'
import { prisma } from '#server/utils/prisma'
import { requireGoodPassword } from '#server/utils/auth'

interface UserPayload {
  email: string
  username?: string
  password: string
  admin?: boolean
}

export default defineEventHandler(async (event: H3Event) => {
  const session = await requireUserSession(event)
  const sessionUser = session as { user?: { id?: number, permissions?: string[] } }

  if (!sessionUser.user?.permissions?.includes('ADMIN')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only admins can create users'
    })
  }

  const createdById = Number(sessionUser.user.id)

  if (!Number.isInteger(createdById)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Session user is missing'
    })
  }

  const body = await readBody<UserPayload>(event)

  const email = body.email?.trim().toLowerCase()
  const name = body.username?.trim()
  const password = body.password

  // Validate required fields
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'email is required' })
  }

  if (!password) {
    throw createError({ statusCode: 400, statusMessage: 'password is required' })
  }

  // Check if email has a valid format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email format' })
  }

  // Check if email is already in use
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw createError({ statusCode: 409, statusMessage: 'Email is already in use' })
  }

  // Check password complexity (length and character requirements from frontend)
  requireGoodPassword(password)

  // Hash the password before storing it in the database
  const hashedPassword = await hashPassword(password)

  // Derivate permissions from frontend boolean checkbox
  const permissions: Permission[] = body.admin === true ? [Permission.ADMIN] : []

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      permissions,
      createdById
    },
    select: {
      id: true,
      email: true,
      name: true,
      permissions: true
    }
  })

  return {
    success: true,
    data: user
  }
})
