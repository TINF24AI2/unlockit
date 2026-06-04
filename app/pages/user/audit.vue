<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  middleware: ['authenticated']
})

// Define the type for the history data based on the API response
type AssignmentHistory = {
  id: string
  changedAt: string
  newStatus: string
  oldStatus: string
  changedBy: {
    id: string
    email: string
    name: string | null
  }
  licenseAssignment: {
    id: string
    requestedAt: string
    licenseKey: {
      id: string
      licenseName: string
      licenseType: string
      product: {
        id: string
        productName: string
      }
    }
    user: {
      id: string
      email: string
      name: string | null
    }
  }
}

const search = ref('')
const productFilter = ref<string | null>(null)

const { user } = useUserSession()
const currentUser = user.value as LoggedInUser
const isAdmin = currentUser.permissions.includes('ADMIN')

const { data: productsResponse } = await useFetch<{ data: { id: string, productName: string, status: string }[] }>('/api/products')

const { data: historyResponse } = await useFetch<AssignmentHistory[]>('/api/audit/assignments', {
  query: {
    role: isAdmin ? undefined : 'user'
  }
})

// Generating the product filter options for the dropdown
const productOptions = computed(() => {
  const products = (productsResponse.value?.data || []).filter(product => product.status !== 'DELETED')
  return [
    { label: 'Alle Produkte', value: null },
    ...products.map(p => ({ label: p.productName, value: p.id }))
  ]
})

// Filter history based on search and product filter
const filteredHistory = computed(() => {
  const history = historyResponse.value || []
  const query = search.value.toLowerCase()

  return history.filter((item) => {
    const productName = (item.licenseAssignment.licenseKey.product.productName || '').toLowerCase()
    const licenseName = (item.licenseAssignment.licenseKey.licenseName || '').toLowerCase()
    const userName = (item.licenseAssignment.user.name || '').toLowerCase()
    const userEmail = (item.licenseAssignment.user.email || '').toLowerCase()

    const matchesSearch = !query
      || productName.includes(query)
      || licenseName.includes(query)
      || userName.includes(query)
      || userEmail.includes(query)

    const matchesProduct = !productFilter.value || item.licenseAssignment.licenseKey.product.id === productFilter.value

    return matchesSearch && matchesProduct
  })
})

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

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

// export related
const exportAll = ref(true)

const exportModalOpen = ref(false)

const exportFormat = ref<'csv' | 'pdf'>('csv')

const exportStartDate = ref('')
const exportEndDate = ref('')

const exportLoad = ref(false)

const exportError = ref <{
  range?: string
  startDate?: string
  endDate?: string
}>({})

const exportAudit = async () => {
  exportError.value = {}
  exportLoad.value = true

  if (!exportAll.value) {
    if (!exportStartDate.value || !exportEndDate.value) {
      exportError.value.range = 'Zeitraum muss angegeben werden!'
      exportLoad.value = false
      return
    }
  }

  if (new Date(exportEndDate.value) < new Date(exportStartDate.value)) {
    exportError.value.range = '"Bis" darf nicht vor "Vor" liegen!'
    exportLoad.value = false
    return
  }

  try {
    const params = new URLSearchParams({
      format: exportFormat.value
    })

    if (!exportAll.value) {
      if (exportStartDate.value) {
        params.append('startDate', exportStartDate.value)
      }

      if (exportEndDate.value) {
        params.append('endDate', exportEndDate.value)
      }
    }

    const response = await fetch(
      `/api/audit/export?${params.toString()}`,
      {
        credentials: 'include'
      }
    )

    if (!response.ok) {
      throw new Error('Export fehlgeschlagen')
    }

    const file = await response.blob()

    const url = window.URL.createObjectURL(file)

    const link = document.createElement('a')
    link.href = url

    link.download = `audit-export`

    link.click()

    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error(error)

    exportError.value = {
      range: 'Fehler beim Export.'
    }
  } finally {
    exportLoad.value = false
  }
}
</script>

<template>
  <Container class="p-6 relative pb-20">
    <div class="grid mb-6 gap-2">
      <h2
        class="mb-4 text-xl font-semibold text-center"
      >
        Historie der Lizenzanfragen
      </h2>

      <div class="flex items-center gap-4">
        <USelect
          v-model="productFilter"
          :items="productOptions"
          class="flex-1"
          value-attribute="value"
          option-attribute="label"
          placeholder="Produkt auswählen"
        />
        <UInput
          v-model="search"
          type="text"
          placeholder="Suchen..."
          class="justify-self-end w-1/3 rounded-md pl-3 pr-3 py-1"
        />
      </div>
      <UButton
        v-if="isAdmin"
        icon="i-lucide-arrow-down-to-line"
        color="primary"
        class="absolute bottom-6 right-6"
        @click="exportModalOpen = true"
      >
        Export
      </UButton>
    </div>

    <div
      class="bg-white rounded-3xl p-4 space-y-3"
    >
      <div
        v-if="filteredHistory.length === 0"
        class="text-sm text-gray-500 p-4"
      >
        Keine Einträge gefunden.
      </div>
      <div
        v-for="item in filteredHistory"
        :key="item.id"
        class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-2xl border border-gray-200 p-4 items-start"
      >
        <!-- Left side: Product and Status -->
        <div class="text-sm min-w-0">
          <div>
            <span class="font-medium">{{ item.licenseAssignment.licenseKey.product.productName }} - {{ item.licenseAssignment.licenseKey.licenseName }}</span>
            <span class="text-gray-600"> für </span>
            <span class="font-medium">{{ item.licenseAssignment.user.email }}</span>
          </div>
          <div class="text-sm text-gray-500 flex items-center gap-2 mt-1">
            <span>Status:</span>
            <UBadge
              :color="getStatusColor(item.oldStatus)"
              variant="subtle"
              size="md"
            >
              {{ getStatusLabel(item.oldStatus) }}
            </UBadge>
            <span>→</span>
            <UBadge
              :color="getStatusColor(item.newStatus)"
              variant="subtle"
              size="md"
            >
              {{ getStatusLabel(item.newStatus) }}
            </UBadge>
          </div>
        </div>

        <!-- Right side: Audit Info -->
        <div class="text-xs text-gray-400 md:justify-self-end md:text-right break-words whitespace-normal">
          Geändert von
          <span class="font-semibold">{{ item.changedBy.email }}</span>
          <div>am {{ formatDate(item.changedAt) }}</div>
        </div>
      </div>
    </div>

    <UModal
      v-model:open="exportModalOpen"
      :ui="{ content: 'max-w-sm w-full' }"
    >
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="mb-4 text-xl font-semibold">
            Audit-Export
          </h3>

          <USelect
            v-model="exportFormat"
            :items="[
              { label: 'CSV', value: 'csv' },
              { label: 'PDF', value: 'pdf' }
            ]"
            value-attribute="value"
            option-attribute="label"
            class="w-full"
          />

          <div class="space-y-4 w-full">
            <UCheckbox
              v-model="exportAll"
              label="Gesamten Zeitraum exportieren"
            />
            <div
              v-if="!exportAll"
            >
              <div>
                <label class="text-sm block mb-1">
                  Von
                </label>

                <UInput
                  v-model="exportStartDate"
                  type="date"
                  class="w-full"
                />
              </div>

              <div>
                <label class="text-sm block mb-1">
                  Bis
                </label>

                <UInput
                  v-model="exportEndDate"
                  type="date"
                  class="w-full"
                />
              </div>
            </div>

            <div
              v-if="exportError.range"
              class="text-red-500 text-sm mt-2"
            >
              {{ exportError.range }}
            </div>

            <div class="flex justify-center gap-2">
              <UButton
                color="neutral"
                variant="subtle"
                @click="exportModalOpen = false"
              >
                Abbrechen
              </UButton>

              <UButton
                :loading="exportLoad"
                @click="exportAudit"
              >
                Exportieren
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </Container>
</template>
