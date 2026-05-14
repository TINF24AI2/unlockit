<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LicenseListing } from '../../../server/services/licenses'

// licence types
const LicenseStatusValues = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
  DEACTIVATED: 'DEACTIVATED'
} as const

const statusLabels: Record<LicenseStatus, string> = {
  ACTIVE: 'Aktiv',
  INACTIVE: 'Inaktiv',
  EXPIRED: 'Abgelaufen',
  DEACTIVATED: 'Deaktiviert'
}

type LicenseStatus = typeof LicenseStatusValues[keyof typeof LicenseStatusValues]

definePageMeta({
  middleware: ['is-admin']
})

const search = ref('')
const statusFilter = ref<LicenseStatus | null>(null)
const productFilter = ref<string | null>(null)
const onlyActiveFilter = ref(false)

const { data: productsResponse } = await useFetch<{ data: { id: string, productName: string }[] }>('/api/products')

const queryParams = computed(() => {
  const params: { status?: LicenseStatus, productId?: string, onlyActive?: boolean } = {}
  if (statusFilter.value) {
    params.status = statusFilter.value
  }
  if (productFilter.value) {
    params.productId = productFilter.value
  }
  if (onlyActiveFilter.value) {
    params.onlyActive = true
  }
  return params
})

// get licences with given query params
const { data: licenceResponse } = await useFetch<{ success: boolean, data: LicenseListing[] }>('/api/license-keys', {
  method: 'GET',
  query: queryParams,
  watch: [queryParams]
})

// map of all existing products
const productOptions = computed(() => {
  const products = productsResponse.value?.data || []
  return [
    { label: 'Alle Produkte', value: null },
    ...products.map(p => ({ label: p.productName, value: p.id }))
  ]
})

// map for all existing status values
const statusOptions = computed(() => [
  { label: 'Jeder Status', value: null },
  ...Object.values(LicenseStatusValues).map(status => ({ label: statusLabels[status], value: status }))
])

const licenses = computed(() =>
  (licenceResponse.value?.data || []).map(license => ({
    id: license.id,
    name: license.licenseName,
    key: license.licenseKey,
    productName: license.product.productName,
    status: license.status,
    type: license.licenseType,
    currentUsages: license.currentUsages,
    maxUsages: license.maxUsages
  }))
)

// searchbar
const filteredLicenses = computed(() => {
  const query = search.value.toLowerCase()
  if (!query) {
    return licenses.value
  }
  return licenses.value.filter((license) => {
    const name = (license.name || '').toLowerCase()
    const productName = (license.productName || '').toLowerCase()
    const key = (license.key || '').toLowerCase()
    return name.includes(query) || productName.includes(query) || key.includes(query)
  })
})

const goAddProduct = () => {
  navigateTo('/admin/add_product')
}
</script>

<template>
  <Container class="p-6 relative pb-20">
    <!-- Header -->
    <div class="grid mb-6 gap-2">
      <h2
        class="mb-4 text-xl font-semibold"
        align="center"
      >
        Lizenz-Verwaltung
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
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          class="flex-1"
          value-attribute="value"
          option-attribute="label"
          placeholder="Status auswählen"
        />
        <UCheckbox
          v-model="onlyActiveFilter"
          label="Nur aktive"
        />
        <input
          v-model="search"
          type="text"
          placeholder="Suchen..."
          class="justify-self-end w-1/3 bg-white rounded-md pl-3 pr-3 py-1"
        >
      </div>
    </div>

    <!-- Scrollbar -->
    <div
      class="bg-white rounded-3xl p-4 space-y-3 max-h-96 overflow-y-auto"
    >
      <div
        v-for="item in filteredLicenses"
        :key="item.id"
        class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 rounded-2xl border border-gray-200 p-4 md:items-center"
      >
        <div class="text-sm">
          <span class="font-medium">{{ item.productName }} - {{ item.name }}</span>
          <span class="text-gray-500">
            | {{ item.key }}
          </span>
          <span class="text-gray-500">
            | Status: {{ item.status }}
          </span>
          <span class="text-gray-500">
            | Typ: {{ item.type }}
          </span>
          <span class="text-gray-500">
            | Nutzung: {{ item.currentUsages }} / {{ item.maxUsages }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <UButton
            type="button"
            color="error"
            variant="solid"
            block
          >
            Deaktivieren
          </UButton>
        </div>
      </div>
    </div>
    <div class="absolute bottom-6 right-6">
      <UButton
        type="button"
        color="success"
        variant="solid"
        block
        @click="goAddProduct"
      >
        Produkt/Lizenz hinzufügen
      </UButton>
    </div>
  </Container>
</template>
