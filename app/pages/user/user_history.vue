<script setup lang="ts">
import HistoryTable from '~/components/HistoryTable.vue'
import type { LicenseAssignmentHistoryEntry } from '~~/shared/types/user'

definePageMeta({
  middleware: ['authenticated']
})

const { data, pending } = await useFetch<{
  success: boolean
  data: LicenseAssignmentHistoryEntry[]
}>('/api/users/history')

const assignments = computed(() => {
  return data.value?.data ?? []
})
</script>

<template>
  <Container>
    <HistoryTable
      :rows="assignments"
      :loading="pending"
    />
  </Container>
</template>
