<script setup lang="ts">
import HistoryTable from '~/components/HistoryTable.vue'
import type { LicenseAssignmentHistoryEntry } from '~~/shared/types/user'

definePageMeta({
  middleware: ['authenticated']
})

const search = ref('')

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING': return 'In Bearbeitung'
    case 'APPROVED': return 'Akzeptiert'
    case 'REJECTED': return 'Abgelehnt'
    case 'REVOKED': return 'Zurückgezogen'
    default: return status
  }
}

// searchbar
const filteredHistory = computed(() => {
  const assignments = data.value?.data || []
  const query = search.value.toLowerCase()
  if (!query) {
    return assignments
  }
  return assignments.filter((assignment) => {
    const requestedAt = new Date(assignment.requestedAt).toLocaleDateString('de-DE').toLowerCase()
    const status = getStatusLabel(assignment.status).toLowerCase()
    const processedAt = assignment.processedAt ? new Date(assignment.processedAt).toLocaleDateString('de-DE').toLowerCase() : ''
    const processedByEmail = (assignment.processedBy?.email || '').toLowerCase()
    const licenseName = (assignment.licenseKey.licenseName || '').toLowerCase()
    const licenseType = (assignment.licenseKey.licenseType || '').toLowerCase()
    const productName = (assignment.licenseKey.product.productName || '').toLowerCase()
    const licenseKey = (assignment.licenseKey.licenseKey || '').toLowerCase()
    const assignmentNote = (assignment.assignmentNote || '').toLowerCase()

    return (
      requestedAt.includes(query)
      || status.includes(query)
      || processedAt.includes(query)
      || processedByEmail.includes(query)
      || licenseName.includes(query)
      || licenseType.includes(query)
      || productName.includes(query)
      || licenseKey.includes(query)
      || assignmentNote.includes(query)
    )
  })
})

const { data, pending } = await useFetch<{
  success: boolean
  data: LicenseAssignmentHistoryEntry[]
}>('/api/users/history')
</script>

<template>
  <Container>
    <div class="relative mb-4 text-xl font-semibold">
      <h2 class="text-center mb-6 text-2xl">
        Nutzerhistorie
      </h2>
      <UInput
        v-model="search"
        type="text"
        placeholder="Suchen..."
        class="absolute right-0 top-1/2 -translate-y-1/ w-1/3 rounded-md pl-3 pr-3 py-1"
      />
    </div>
    <HistoryTable
      :rows="filteredHistory"
      :loading="pending"
    />
  </Container>
</template>
