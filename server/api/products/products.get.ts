import { createError, defineEventHandler } from 'h3'
import { prisma } from '../../utils/prisma'

type SessionUser = {
  user?: {
    id?: number
    permissions?: Array<string>
  }
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const sessionUser = session as SessionUser

  const userId = Number(sessionUser.user?.id)

  if (!Number.isInteger(userId)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Session user is missing'
    })
  }

  const isAdmin = sessionUser.user?.permissions?.includes('ADMIN') ?? false

  let products

  if (isAdmin) {
    products = await prisma.product.findMany({
      include: { licenseKeys: true },
      orderBy: { createdAt: 'desc' }
    })
  } else {
    products = await prisma.product.findMany({
      select: {
        id: true,
        productName: true,
        description: true,
        vendor: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  return {
    success: true,
    data: products
  }
})
