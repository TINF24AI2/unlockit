<script setup lang="ts">
import { ref, computed } from 'vue'

type UserLicense = {
  id: string
  licenseName: string
  status: string
  product: { id: string, productName: string }
  userAssignment: { status: string | null }
  canRequest: boolean
}

const search = ref('')
const productFilter = ref<string | null>(null)
const onlyAvailableFilter = ref(false)

const { data: productsResponse } = await useFetch<{ data: { id: string, productName: string }[] }>('/api/products')

const { data: licenseResponse } = await useFetch<{ success: boolean, data: UserLicense[] }>('/api/license-keys', {
  method: 'GET'
})

// Generating the product filter options for the dropdown
const productOptions = computed(() => {
  const products = productsResponse.value?.data || []
  return [
    { label: 'Alle Produkte', value: null },
    ...products.map(p => ({ label: p.productName, value: p.id }))
  ]
})

// Searchbar filtering
const filteredLicenses = computed(() => {
  const licenses = licenseResponse.value?.data || []
  const query = search.value.toLowerCase()

  return licenses
    .filter((license) => {
      const name = (license.licenseName || '').toLowerCase()
      const productName = (license.product.productName || '').toLowerCase()
      const matchesSearch = !query || name.includes(query) || productName.includes(query)
      const matchesProduct = !productFilter.value || license.product.id === productFilter.value
      const matchesAvailability = !onlyAvailableFilter.value || license.canRequest

      return matchesSearch && matchesProduct && matchesAvailability
    })
    .sort((leftLicense, rightLicense) =>
      (leftLicense.product.productName || leftLicense.licenseName).localeCompare(rightLicense.product.productName || rightLicense.licenseName)
    )
})

// Small status label for the badge.
const getLicenseStatus = (l: UserLicense) => {
  if (l.userAssignment.status === 'APPROVED') return 'Im Besitz'
  if (l.userAssignment.status === 'PENDING') return 'Antrag in Bearbeitung'
  if (l.canRequest) return 'Verfügbar'
  return 'Fehler'
}

// Badge color follows the status
const getStatusColor = (l: UserLicense) => {
  if (l.userAssignment.status === 'APPROVED') return 'neutral'
  if (l.userAssignment.status === 'PENDING') return 'warning'
  if (l.canRequest) return 'primary'
  return 'error'
}

// Go to the request page with the selected product data
const requestLicense = (license: UserLicense) => {
  navigateTo({
    path: '/user/request_license',
    query: {
      productId: license.product.id,
      productName: license.product.productName,
      licenseName: license.licenseName
    }
  })
}
</script>

<template>
  <Container class="p-6 relative pb-20">
    <div class="grid mb-6 gap-2">
      <h2
        class="mb-4 text-xl font-semibold"
        align="center"
      >
        Produkte & verfügbare Lizenzen
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
        <UCheckbox
          v-model="onlyAvailableFilter"
          label="Nur verfügbar"
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
      <!-- If searchbar deons't match anything -->
      <div
        v-if="filteredLicenses.length === 0"
        class="text-sm text-gray-500 p-4"
      >
        Keine Produkte/Lizenzen gefunden.
      </div>
      <div
        v-for="item in filteredLicenses"
        :key="item.id"
        class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 rounded-2xl border border-gray-200 p-4 md:items-center"
      >
        <div class="text-sm">
          <span class="font-medium">{{ item.product.productName }} - {{ item.licenseName }}</span>
          <UBadge
            :color="getStatusColor(item)"
            variant="subtle"
            class="ml-2"
          >
            {{ getLicenseStatus(item) }}
          </UBadge>
        </div>

        <div class="grid grid-cols-1 gap-2">
          <UButton
            v-if="item.canRequest"
            color="primary"
            variant="solid"
            block
            @click="requestLicense(item)"
          >
            Lizenz beantragen
          </UButton>
          <UButton
            v-else
            color="neutral"
            variant="soft"
            block
            disabled
          >
            {{ getLicenseStatus(item) }}
          </UButton>
        </div>
      </div>
    </div>
  </Container>
</template>
