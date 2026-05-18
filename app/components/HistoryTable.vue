<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LicenseAssignmentHistoryEntry } from '~~/shared/types/user'

defineProps<{
  rows: LicenseAssignmentHistoryEntry[]
  loading?: boolean
}>()

const columns: TableColumn<LicenseAssignmentHistoryEntry>[] = [
  {
    accessorKey: 'requestedAt',
    header: 'Angefragt am',
    cell: ({ row }) => new Date(row.original.requestedAt).toLocaleDateString('de-DE')
  },
  {
    accessorKey: 'status',
    header: 'Status'
  },
  {
    accessorKey: 'processedAt',
    header: 'Bearbeitet am',
    cell: ({ row }) => row.original.processedAt ? new Date(row.original.processedAt).toLocaleDateString('de-DE') : '-'
  },
  {
    id: 'processedByEmail',
    header: 'Bearbeitet von',
    cell: ({ row }) => row.original.processedBy?.email ?? '-'
  },
  {
    id: 'licenseName',
    header: 'Lizenz',
    cell: ({ row }) => row.original.licenseKey.licenseName
  },
  {
    id: 'licenseType',
    header: 'Lizenztyp',
    cell: ({ row }) => row.original.licenseKey.licenseType
  },
  {
    id: 'productName',
    header: 'Produkt',
    cell: ({ row }) => row.original.licenseKey.product.productName
  },
  {
    id: 'vendor',
    header: 'Anbieter',
    cell: ({ row }) => row.original.licenseKey.product.vendor ?? '-'
  },
  {
    accessorKey: 'assignmentNote',
    header: 'Begründung für Antrag'
  }
]

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING': return 'In Bearbeitung'
    case 'APPROVED': return 'Akzeptiert'
    case 'REJECTED': return 'Abgelehnt'
    case 'REVOKED': return 'Zurückgezogen'
    default: return status
  }
}

// get badge color based on status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return 'neutral'
    case 'APPROVED': return 'primary'
    case 'REJECTED': return 'error'
    case 'REVOKED': return 'warning'
    default: return 'neutral'
  }
}
</script>

<template>
  <h2 class="text-center mb-6 text-2xl">
    Nutzerhistorie
  </h2>
  <div class="bg-white rounded-3xl p-4 space-y-3 max-h-96 overflow-y-auto">
    <UTable
      :data="rows"
      :columns="columns"
      :loading="loading"
      :ui="{
        td: 'text-gray-500 py-4',
        th: 'text-black-700 font-semibold'
      }"
    >
      <template #status-cell="{ row }">
        <UBadge
          :color="getStatusColor(row.original.status)"
          variant="subtle"
          size="md"
        >
          {{ getStatusLabel(row.original.status) }}
        </UBadge>
      </template>

      <template #empty>
        <div class="py-6 text-center text-gray-500">
          Keine Daten vorhanden
        </div>
      </template>
    </UTable>
  </div>
</template>
