import { defineEventHandler } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  await authorize(event, isUser)

  const isAdmininistrator = await allows(event, isAdmin)

  let products

  if (isAdmininistrator) {
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
