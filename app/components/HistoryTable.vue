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
</script>

<template>
  <UTable
    :data="rows"
    :columns="columns"
    :loading="loading"
    :ui="{
      th: 'text-black font-semibold',
      td: 'text-gray-700'
    }"
  >
    <template #empty>
      <div class="py-6 text-center text-gray-500">
        Keine Daten vorhanden
      </div>
    </template>
  </UTable>
</template>
