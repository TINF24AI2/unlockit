<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LicenseListing } from '../../../server/services/licenses'

// licence types
const LicenseStatusValues = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
  EXHAUSTED: 'EXHAUSTED'
} as const

const statusLabels: Record<LicenseStatus, string> = {
  ACTIVE: 'Aktiv',
  INACTIVE: 'Inaktiv',
  EXPIRED: 'Abgelaufen',
  EXHAUSTED: 'Vergeben'
}

type LicenseStatus = typeof LicenseStatusValues[keyof typeof LicenseStatusValues]

definePageMeta({
  middleware: ['is-admin']
})

const search = ref('')
const statusFilter = ref<LicenseStatus | null>(null)
const productFilter = ref<string | null>(null)
const onlyActiveFilter = ref(false)
const deactivationReasons = ref<Record<string, string>>({})

const { data: productsResponse } = await useFetch<{ data: { id: string, productName: string }[] }>('/api/products')

const queryParams = computed(() => {
  const params: { view: string, status?: LicenseStatus, productId?: string, onlyActive?: boolean } = { view: 'admin' } // need to specify admin view show get deactivated licenses
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
const { data: licenceResponse, refresh: refreshLicenses } = await useFetch<{ success: boolean, data: LicenseListing[] }>('/api/license-keys', {
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

// searchbar
const filteredLicenses = computed(() => {
  const licenses = licenceResponse.value?.data || []
  const query = search.value.toLowerCase()
  if (!query) {
    return licenses
  }
  return licenses.filter((license) => {
    const name = (license.licenseName || '').toLowerCase()
    const productName = (license.product.productName || '').toLowerCase()
    const key = (license.licenseKey || '').toLowerCase()
    return name.includes(query) || productName.includes(query) || key.includes(query)
  })
})

const goAddProduct = () => {
  navigateTo('/admin/add_product')
}

const disableLicence = async (licenceId: string) => {
  const reason = deactivationReasons.value[licenceId]
  if (!reason || !reason.trim()) {
    alert('Bitte geben Sie einen Grund an.')
    return
  }

  try {
    await $fetch(`/api/license-keys/deactivate/${licenceId}`, {
      method: 'POST',
      body: { reason }
    })
    await refreshLicenses()
    deactivationReasons.value[licenceId] = ''
  } catch (error) {
    alert(`Fehler beim Deaktivieren der Lizenz ${error}`)
  }
}

const reactivateLicence = async (licenceId: string) => {
  try {
    await $fetch(`/api/license-keys/reactivate/${licenceId}`, {
      method: 'POST'
    })
    await refreshLicenses()
  } catch (error) {
    alert(`Fehler beim Reaktivieren der Lizenz ${error}`)
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'primary'
    case 'INACTIVE': return 'error'
    case 'EXPIRED': return 'neutral'
    case 'EXHAUSTED': return 'warning'
    default: return 'neutral'
  }
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
        <UInput
          v-model="search"
          type="text"
          placeholder="Suchen..."
          class="justify-self-end w-1/3 rounded-md pl-3 pr-3 py-1"
        />
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
        <div class="text-sm space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ item.product.productName }} - {{ item.licenseName }}</span>
            <UBadge
              :color="getStatusColor(item.status)"
              variant="subtle"
            >
              {{ statusLabels[item.status] }}
            </UBadge>
          </div>
          <div>
            <span class="text-gray-500">Schlüssel: </span>
            <span class="font-semibold text-gray-700">{{ item.licenseKey }}</span>
          </div>
          <div class="text-gray-500">
            Typ: {{ item.licenseType }} | Nutzung: {{ item.currentUsages }} / {{ item.maxUsages }}
          </div>
        </div>

        <div class="grid grid-cols-1 gap-2">
          <UPopover
            v-if="item.status === 'ACTIVE'"
            :key="`popover-${item.id}`"
            :popper="{ placement: 'top-end' }"
            :ui="{ content: 'border border-brand' }"
          >
            <UButton
              color="error"
              variant="solid"
              block
            >
              Deaktivieren
            </UButton>

            <template #content>
              <div class="p-4 w-64">
                <p class="text-sm mb-2">
                  Grund für die Deaktivierung:
                </p>
                <UTextarea
                  v-model="deactivationReasons[item.id]"
                  class="w-full"
                />
                <UButton
                  class="mt-2"
                  size="xs"
                  color="error"
                  block
                  @click="disableLicence(item.id)"
                >
                  Bestätigen
                </UButton>
              </div>
            </template>
          </UPopover>
          <UButton
            v-else-if="item.status === 'INACTIVE'"
            type="button"
            color="success"
            variant="solid"
            block
            @click="reactivateLicence(item.id)"
          >
            Reaktivieren
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
