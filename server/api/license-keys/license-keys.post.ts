import { randomUUID } from 'node:crypto'
import { createError, defineEventHandler, readBody, type H3Event } from 'h3'
import { prisma } from '../../utils/prisma'
import { LicenseStatus, LicenseType } from '../../../generated/prisma/client'

interface LicenseKeyPayload {
  productId?: string
  licenseName?: string
  licenseKey?: string
  licenseType?: LicenseType
  maxUsages?: number
  requiresAdminApproval?: boolean
  expiresAt?: string | null
}

type SessionUser = {
  user?: {
    id?: number
    permissions?: Array<string>
  }
}

export default defineEventHandler(async (event: H3Event) => {
  const session = await requireUserSession(event)
  const sessionUser = session as SessionUser

  if (!sessionUser.user?.permissions?.includes('ADMIN')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only admins can create license keys'
    })
  }

  const uploadedById = Number(sessionUser.user.id)

  if (!Number.isInteger(uploadedById)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Session user is missing'
    })
  }

  const body = await readBody<LicenseKeyPayload>(event)

  const productId = body.productId?.trim()
  const licenseName = body.licenseName?.trim()
  const licenseKey = body.licenseKey?.trim()
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

  if (!productId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'productId is required'
    })
  }

  if (!licenseName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'licenseName is required'
    })
  }

  if (!licenseKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'licenseKey is required'
    })
  }

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'expiresAt is not a valid date'
    })
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, createdById: true }
  })

  if (!product) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Product not found'
    })
  }

  if (product.createdById !== uploadedById) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You cannot create license keys for products you did not create'
    })
  }

  const existingLicense = await prisma.licenseKey.findFirst({
    where: {
      productId,
      licenseKey
    }
  })

  if (existingLicense) {
    throw createError({
      statusCode: 409,
      statusMessage: 'License key with this value already exists for this product'
    })
  }

  const license = await prisma.licenseKey.create({
    data: {
      id: randomUUID(),
      productId,
      licenseName,
      licenseKey,
      licenseType: body.licenseType ?? LicenseType.SINGLE,
      maxUsages: body.maxUsages ?? 1,
      requiresAdminApproval: body.requiresAdminApproval ?? true,
      status: LicenseStatus.ACTIVE,
      expiresAt: expiresAt || undefined,
      uploadedById
    }
  })

  return {
    success: true,
    data: license
  }
})
