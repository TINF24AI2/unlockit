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
</script>

<template>
  <Container class="p-6 relative pb-20">
    <div class="text-center">
      <h2
        class="mb-4 text-xl font-semibold"
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
    </div>

    <div
      class="bg-white rounded-3xl p-4 space-y-3 max-h-96 overflow-y-auto"
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
        class="grid grid-cols-2 gap-x-4 gap-y-1 rounded-2xl border border-gray-200 p-4 items-center"
      >
        <!-- Left side: Product and Status -->
        <div class="text-sm">
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
        <div class="text-xs text-gray-400 justify-self-end text-right">
          Geändert von
          <span class="font-semibold">{{ item.changedBy.email }}</span>
          <div>am {{ formatDate(item.changedAt) }}</div>
        </div>
      </div>
    </div>
  </Container>
</template>
