import { randomUUID } from 'node:crypto'
import { createError, defineEventHandler, readBody, type H3Event } from 'h3'
import { prisma } from '../../utils/prisma'

interface ProductPayload {
  productName?: string
  description?: string
  vendor?: string
}

export default defineEventHandler(async (event: H3Event) => {
  const session = await requireUserSession(event)
  const sessionUser = session as { user?: { id?: number, permissions?: string[] } }

  if (!sessionUser.user?.permissions?.includes('ADMIN')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only admins can create products'
    })
  }

  const createdById = Number(sessionUser.user.id)

  if (!Number.isInteger(createdById)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Session user is missing'
    })
  }

  const body = await readBody<ProductPayload>(event)

  const productName = body.productName?.trim()
  const description = body.description?.trim()
  const vendor = body.vendor?.trim()

  if (!productName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'productName is required'
    })
  }
  const existingProduct = await prisma.product.findFirst({
    where: {
      productName,
      createdById
    }
  })

  if (existingProduct) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Product with this name already exists'
    })
  }
  const product = await prisma.product.create({
    data: {
      id: randomUUID(),
      productName,
      description: description || undefined,
      vendor: vendor || undefined,
      createdById
    }
  })

  return {
    success: true,
    data: product
  }
})
