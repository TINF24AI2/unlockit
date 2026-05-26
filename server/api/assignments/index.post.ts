import { createError, defineEventHandler, readBody, type H3Event } from 'h3'
import { prisma } from '#server/utils/prisma'
import { requestLicense } from '#server/services/licenses'

interface AssignmentRequestBody {
  productId: string
  reason: string
}

interface AssignmentRequestResponse {
  success: boolean
  data: {
    assignmentId: string
    licenseKeyId: string
    productId: string
    status: string
    requestedAt: string
    message: string
  }
}

export default defineEventHandler(async (event: H3Event): Promise<AssignmentRequestResponse> => {
  const session = await requireUserSession(event)
  const sessionUser = session.user as LoggedInUser

  const userId = Number(sessionUser.id)

  const body = await readBody<AssignmentRequestBody>(event)

  const productId = body.productId?.trim()
  const reason = body.reason?.trim()

  if (!productId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'productId is required'
    })
  }

  if (!reason) {
    throw createError({
      statusCode: 400,
      statusMessage: 'reason is required'
    })
  }

  const product = await prisma.product.findUnique({
    where: { id: productId }
  })

  if (!product) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Product not found'
    })
  }

  // Check if user already has a pending or approved request for this product
  const existingRequest = await prisma.licenseAssignment.findFirst({
    where: {
      userId,
      licenseKey: {
        productId
      },
      status: {
        in: ['PENDING', 'APPROVED']
      }
    }
  })

  if (existingRequest) {
    const message = existingRequest.status === 'PENDING'
      ? 'You already have a pending license request for this product'
      : 'You already have an approved license for this product'
    throw createError({
      statusCode: 409,
      statusMessage: message
    })
  }

  // Create the license request (relies on functions defined in server/services/licenses.ts)
  const assignment = await requestLicense(userId, productId, reason)

  return {
    success: true,
    data: {
      assignmentId: assignment.id,
      licenseKeyId: assignment.licenseKeyId,
      productId: assignment.licenseKey.productId,
      status: assignment.status,
      requestedAt: assignment.requestedAt.toISOString(),
      message: assignment.status === 'APPROVED'
        ? 'License was automatically assigned'
        : 'License request submitted and awaiting admin approval'
    }
  }
})
