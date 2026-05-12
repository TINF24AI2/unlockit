import { createError, defineEventHandler, readBody, type H3Event } from 'h3'
import { deactivateLicense, reactivateLicense } from '../../../services/licenses'

interface ChangeBody {
  reason?: string
}

export default defineEventHandler(async (event: H3Event) => {
  await authorize(event, isAdmin)

  const session = await requireUserSession(event)
  const sessionUser = session.user as LoggedInUser
  const adminId = Number(sessionUser.id)

  const params = (event as unknown as { context?: { params?: Record<string, string> } }).context?.params || {}
  const change = params.change?.toLowerCase()
  const licenseId = params.id as string | undefined

  const allowedChanges = ['deactivate', 'reactivate']

  if (!allowedChanges.includes(change ?? '')) {
    throw createError({ statusCode: 400, statusMessage: 'invalid change parameter' })
  }

  if (!licenseId || !licenseId.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'licenseId (path) is required' })
  }

  const body = await readBody<ChangeBody>(event)

  try {
    if (change === 'deactivate') {
      if (!body.reason || !body.reason.trim()) {
        throw createError({ statusCode: 400, statusMessage: 'reason is required for deactivate' })
      }
      const result = await deactivateLicense(licenseId, adminId, body.reason.trim())
      return { success: true, data: result.data }
    }

    if (change === 'reactivate') {
      const result = await reactivateLicense(licenseId, adminId)
      return { success: true, data: result.data }
    }

    throw createError({ statusCode: 400, statusMessage: 'unknown change' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      throw createError({ statusCode: 404, statusMessage: message })
    }

    if (message.includes('already inactive') || message.includes('already active')) {
      throw createError({ statusCode: 400, statusMessage: message })
    }

    throw createError({ statusCode: 500, statusMessage: 'Failed to perform action on license' })
  }
})
