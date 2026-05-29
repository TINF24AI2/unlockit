import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { createRequire } from 'node:module'
import type { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces'
import type { AuditRecord } from '../services/audit'

// Format a date to a readable string (DD.MM.YYYY HH:mm)
function formatDate(date: Date): string {
  return new Date(date).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin'
  })
}

// Map internal status codes to labels in German
function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'In Bearbeitung'
    case 'APPROVED': return 'Akzeptiert'
    case 'REJECTED': return 'Abgelehnt'
    case 'REVOKED': return 'Zurückgezogen'
    default: return status
  }
}

// Escape CSV special characters
function escapeCSVField(field: string | null | undefined): string {
  if (field === null || field === undefined) return ''
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Generates CSV content from audit records
export function generateCSV(records: AuditRecord[]): string {
  const headers = [
    'Änderungs-ID', 'Datum', 'Lizenz', 'Produkt', 'Lizenztyp',
    'Nutzer', 'Alter Status', 'Neuer Status',
    'Geändert von', 'Antrag-Datum', 'Notiz'
  ]
  const headerLine = headers.map(escapeCSVField).join(',')
  const rows = records.map((record) => {
    const fields = [
      record.id,
      formatDate(record.changedAt),
      record.licenseAssignment.licenseKey.licenseName,
      record.licenseAssignment.licenseKey.product.productName,
      record.licenseAssignment.licenseKey.licenseType,
      record.licenseAssignment.user.email,
      getStatusLabel(record.oldStatus),
      getStatusLabel(record.newStatus),
      record.changedBy.email,
      formatDate(record.licenseAssignment.requestedAt),
      record.licenseAssignment.assignmentNote || ''
    ]
    return fields.map(field => escapeCSVField(String(field))).join(',')
  })
  return [headerLine, ...rows].join('\n')
}

// Generates a PDF buffer from audit records (pdfmake 0.3.x server-side)
export async function generatePDF(
  records: AuditRecord[],
  startDate?: Date,
  endDate?: Date
): Promise<Buffer> {
  const _require = createRequire(import.meta.url)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfmake = _require('pdfmake') as any

  const robotoPkgDir = path.dirname(_require.resolve('roboto-font/package.json'))
  pdfmake.setUrlAccessPolicy(() => false)
  pdfmake.setLocalAccessPolicy((filePath: string) => filePath.startsWith(robotoPkgDir))

  pdfmake.addFonts({
    Roboto: {
      normal: _require.resolve('roboto-font/fonts/Roboto/roboto-regular-webfont.ttf'),
      bold: _require.resolve('roboto-font/fonts/Roboto/roboto-medium-webfont.ttf'),
      italics: _require.resolve('roboto-font/fonts/Roboto/roboto-italic-webfont.ttf'),
      bolditalics: _require.resolve('roboto-font/fonts/Roboto/roboto-mediumitalic-webfont.ttf')
    }
  })

  let dateRangeText = ''
  if (startDate || endDate) {
    const start = startDate ? formatDate(startDate) : 'Anfang'
    const end = endDate ? formatDate(endDate) : 'Heute'
    dateRangeText = ` (${start} – ${end})`
  }

  // color constants oriented on UnlockIT UI design
  const COLOR_HEADER_BG = '#d3dfdb'
  const COLOR_TABLE_HEAD = '#e8f2f1'
  const COLOR_ROW_ALT = '#f7fafa'
  const COLOR_TEXT = '#1a1a1a'
  const COLOR_FOOTNOTE = '#666666'

  const tableBody: TableCell[][] = [
    [
      { text: 'Änderungs-ID', bold: true, fillColor: COLOR_TABLE_HEAD },
      { text: 'Datum', bold: true, fillColor: COLOR_TABLE_HEAD },
      { text: 'Lizenz', bold: true, fillColor: COLOR_TABLE_HEAD },
      { text: 'Produkt', bold: true, fillColor: COLOR_TABLE_HEAD },
      { text: 'Nutzer', bold: true, fillColor: COLOR_TABLE_HEAD },
      { text: 'Alter Status', bold: true, fillColor: COLOR_TABLE_HEAD },
      { text: 'Neuer Status', bold: true, fillColor: COLOR_TABLE_HEAD },
      { text: 'Geändert von', bold: true, fillColor: COLOR_TABLE_HEAD },
      { text: 'Notiz', bold: true, fillColor: COLOR_TABLE_HEAD }
    ],
    ...records.map((record, i) => {
      const fill = i % 2 === 0 ? COLOR_ROW_ALT : null
      return [
        { text: String(record.id), fillColor: fill },
        { text: formatDate(record.changedAt), fillColor: fill },
        { text: record.licenseAssignment.licenseKey.licenseName ?? '', fillColor: fill },
        { text: record.licenseAssignment.licenseKey.product.productName ?? '', fillColor: fill },
        { text: record.licenseAssignment.user.email ?? '', fillColor: fill },
        { text: getStatusLabel(record.oldStatus) ?? '', fillColor: fill },
        { text: getStatusLabel(record.newStatus) ?? '', fillColor: fill },
        { text: record.changedBy.email ?? '', fillColor: fill },
        { text: record.licenseAssignment.assignmentNote || '–', fillColor: fill }
      ] as TableCell[]
    })
  ]

  const docDefinition: TDocumentDefinitions = {
    defaultStyle: { font: 'Roboto', fontSize: 8, color: COLOR_TEXT },
    content: [
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                {
                  text: 'UnlockIT – Audit-Bericht',
                  fontSize: 18,
                  bold: true,
                  color: COLOR_TEXT,
                  margin: [0, 0, 0, 4]
                },
                {
                  text: `Lizenzzuweisungshistorie  ·  ${records.length} Einträge  ·  Erstellt: ${formatDate(new Date())}${dateRangeText}`,
                  fontSize: 9,
                  color: COLOR_TEXT
                }
              ],
              fillColor: COLOR_HEADER_BG,
              margin: [16, 14, 16, 14]
            }
          ]]
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0
        },
        margin: [0, 0, 0, 16]
      },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ['14%', '8%', '11%', '11%', '13%', '9%', '9%', '13%', '12%'],
          body: tableBody
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1) ? 0 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#d0dedd',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5
        }
      }
    ],
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 24, 24, 36],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: 'UnlockIT Lizenzmanagement', color: COLOR_FOOTNOTE, fontSize: 8, margin: [24, 0, 0, 0] },
        { text: `Seite ${currentPage} von ${pageCount}`, color: COLOR_FOOTNOTE, fontSize: 8, alignment: 'right', margin: [0, 0, 24, 0] }
      ],
      margin: [0, 8, 0, 0]
    })
  }

  const tmpFile = path.join(os.tmpdir(), `audit-${Date.now()}.pdf`)
  const pdf = pdfmake.createPdf(docDefinition)
  await pdf.write(tmpFile)

  const buffer = fs.readFileSync(tmpFile)
  fs.unlinkSync(tmpFile)

  return buffer
}
