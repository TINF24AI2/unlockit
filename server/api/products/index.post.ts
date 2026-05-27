import { randomUUID } from 'node:crypto'
import { createError, defineEventHandler, readBody, type H3Event } from 'h3'
import { prisma } from '../../utils/prisma'
import { ProductStatus } from '../../../generated/prisma/client'

interface ProductPayload {
  productName?: string
  description?: string
  vendor?: string
}

export default defineEventHandler(async (event: H3Event) => {
  await authorize(event, isAdmin)

  const session = await requireUserSession(event)
  const sessionUser = session.user as LoggedInUser

  const createdById = Number(sessionUser.id)

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

  // Check for existing ACTIVE products with the same name (to allow reuse of deleted product names)
  const existingProduct = await prisma.product.findFirst({
    where: {
      productName,
      createdById,
      status: ProductStatus.ACTIVE
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
      // status will default to ACTIVE via Prisma schema
    }
  })

  return {
    success: true,
    data: product
  }
})
