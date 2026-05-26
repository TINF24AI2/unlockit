export type LoggedInUser = {
  id: number
  name: string
  permissions: string[]
}

export type LicenseAssignmentHistoryEntry = {
  id: string
  status: string
  requestedAt: Date
  assignmentNote: string | null
  processedAt: Date | null
  processedBy: {
    id: number
    name: string | null
    email: string
  } | null
  licenseKey: {
    id: string
    licenseName: string
    licenseType: string
    licenseKey: string | null
    status: string
    expiresAt: Date | null
    product: {
      id: string
      productName: string
      vendor: string | null
    }
  }
}
