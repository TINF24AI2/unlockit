import { defineEventHandler, getQuery, type H3Event } from 'h3'
import { LicenseStatus } from '../../../generated/prisma/client'
import { listLicenses, getLicensesWithUserContext } from '../../services/licenses'

export default defineEventHandler(async (event: H3Event) => {
  await authorize(event, isUser)

  const session = await requireUserSession(event)
  const sessionUser = session.user as LoggedInUser
  const userId = Number(sessionUser.id)

  const isAdministrator = await allows(event, isAdmin)

  // Extract query parameters
  const query = getQuery(event)
  const view = (query.view as string | undefined)?.toLowerCase()

  // Admin view: show all licenses with optional filters
  if (isAdministrator && view === 'admin') {
    const productId = query.productId as string | undefined
    const statusQuery = query.status as string | undefined
    const status = statusQuery && Object.values(LicenseStatus).includes(statusQuery as LicenseStatus)
      ? statusQuery as LicenseStatus
      : undefined
    const onlyActive = query.onlyActive === 'true' || query.onlyActive === true

    // Fetch licenses with optional filters
    const licenses = await listLicenses({
      productId,
      status,
      onlyActive
    })

    // Return the list of licenses along with metadata
    return {
      success: true,
      data: licenses
    }
  }

  // User view: show only active licenses with user context
  const availableLicenses = await getLicensesWithUserContext(userId)
  return {
    success: true,
    data: availableLicenses
  }
})
