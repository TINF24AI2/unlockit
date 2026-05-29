import { createError, getQuery, setResponseHeader } from 'h3'
import { getAuditHistory } from '../../services/audit'
import { generateCSV, generatePDF } from '../../utils/export'

// Parse and validate query parameters for date filtering
function parseStartDate(dateString?: string): Date | undefined {
  if (!dateString) return undefined
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return undefined
  return date
}

function parseEndDate(dateString?: string): Date | undefined {
  if (!dateString) return undefined
  if (!dateString.includes('T')) {
    const date = new Date(dateString + 'T23:59:59.999Z')
    if (isNaN(date.getTime())) return undefined
    return date
  }
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return undefined
  return date
}

// Build a filename based on the provided date range and format
function buildFilename(ext: string, startDate?: Date, endDate?: Date): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  if (startDate && endDate) {
    return `audit-export_${fmt(startDate)}_to_${fmt(endDate)}.${ext}`
  } else if (startDate) {
    return `audit-export_from_${fmt(startDate)}.${ext}`
  } else if (endDate) {
    return `audit-export_until_${fmt(endDate)}.${ext}`
  } else {
    return `audit-export_all.${ext}`
  }
}

export default defineEventHandler(async (event) => {
  await authorize(event, isAdmin)

  try {
    const query = getQuery(event)
    const format = (query.format as string)?.toLowerCase() || 'csv'
    const startDate = parseStartDate(query.startDate as string)
    const endDate = parseEndDate(query.endDate as string)

    if (!['csv', 'pdf'].includes(format)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'format must be either "csv" or "pdf"'
      })
    }

    if (startDate && endDate && startDate > endDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'startDate can not be after the endDate'
      })
    }

    const auditRecords = await getAuditHistory({
      startDate,
      endDate
    })

    if (format === 'csv') {
      const csvContent = generateCSV(auditRecords)

      // Set response headers for CSV download
      setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
      setResponseHeader(
        event,
        'Content-Disposition',
        `attachment; filename="${buildFilename('csv', startDate, endDate)}"`
      )

      return csvContent
    } else if (format === 'pdf') {
      // Generate PDF
      const pdfBuffer = await generatePDF(auditRecords, startDate, endDate)

      // Set response headers for PDF download
      setResponseHeader(event, 'Content-Type', 'application/pdf')
      setResponseHeader(
        event,
        'Content-Disposition',
        `attachment; filename="${buildFilename('pdf', startDate, endDate)}"`
      )

      return new Uint8Array(pdfBuffer)
    }
  } catch (error) {
    const httpError = error as { statusCode?: number } | null
    if (error instanceof Error && httpError?.statusCode) {
      throw error
    }

    // Handle unexpected errors
    console.error('Error generating export:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error generating export'
    })
  }
})
