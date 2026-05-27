import { createError, defineEventHandler, readBody, getRouterParam, type H3Event } from 'h3'
import { deactivateProduct, reactivateProduct, deleteProduct } from '../../../services/products'

interface ChangeBody {
  reason?: string
}

export default defineEventHandler(async (event: H3Event) => {
  await authorize(event, isAdmin)

  const session = await requireUserSession(event)
  const sessionUser = session.user as LoggedInUser
  const adminId = Number(sessionUser.id)

  const change = getRouterParam(event, 'change')?.toLowerCase()
  const productId = getRouterParam(event, 'id')

  const allowedChanges = ['deactivate', 'reactivate', 'delete']

  if (!allowedChanges.includes(change ?? '')) {
    throw createError({ statusCode: 400, statusMessage: 'invalid change parameter' })
  }

  if (!productId || !productId.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'productId is required' })
  }

  const body = await readBody<ChangeBody>(event)

  try {
    if (change === 'deactivate') {
      const result = await deactivateProduct(productId, adminId, body.reason?.trim())
      return { success: true, data: result.data }
    }

    if (change === 'reactivate') {
      const result = await reactivateProduct(productId, adminId)
      return { success: true, data: result.data }
    }

    if (change === 'delete') {
      const result = await deleteProduct(productId, adminId)
      return { success: true, data: result.data }
    }

    throw createError({ statusCode: 400, statusMessage: 'unknown change' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      throw createError({ statusCode: 404, statusMessage: message })
    }

    if (
      message.includes('already deactivated')
      || message.includes('already active')
      || message.includes('already deleted')
      || message.includes('must be deactivated before deletion')
      || message.includes('Cannot reactivate a deleted product')
    ) {
      throw createError({ statusCode: 400, statusMessage: message })
    }

    throw createError({ statusCode: 500, statusMessage: 'Failed to perform action on product' })
  }
})
