import { defineEventHandler, getQuery, type H3Event } from 'h3'
import { LicenseStatus } from '../../../generated/prisma/client'
import { listLicenses } from '../../services/licenses'

export default defineEventHandler(async (event: H3Event) => {
  await authorize(event, isAdmin)

  // Extract optional query parameters for filtering (relies on licenses service)
  const query = getQuery(event)
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
    data: licenses,
    meta: {
      total: licenses.length
    }
  }
})
