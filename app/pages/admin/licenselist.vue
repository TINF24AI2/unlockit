<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FetchError } from 'ofetch'
import type { LicenseListing } from '../../../server/services/licenses'

// licence types
const statusLabels: Record<LicenseStatus, string> = {
  ACTIVE: 'Lizenz aktiv',
  INACTIVE: 'Lizenz inaktiv',
  EXPIRED: 'Lizenz abgelaufen', // not used
  EXHAUSTED: 'Vollständig vergeben' // not used
}

type LicenseStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'EXHAUSTED'
type ProductStatus = 'ACTIVE' | 'DEACTIVATED' | 'DELETED'

type ProductListItem = {
  id: string
  productName: string
  status: ProductStatus
}

type ProductsResponse = {
  success: boolean
  data: ProductListItem[]
}

type LicenseResponse = {
  success: boolean
  data: LicenseListing[]
}

type DisplayLicense = LicenseListing & {
  productStatus: ProductStatus | null
}

const productStatusLabels: Record<Exclude<ProductStatus, 'DELETED'>, string> = {
  ACTIVE: 'Produkt aktiv',
  DEACTIVATED: 'Produkt deaktiviert'
}

definePageMeta({
  middleware: ['is-admin']
})

const search = ref('')
const statusFilter = ref<LicenseStatus | null>(null)
const productFilter = ref<string | null>(null)
const deactivationReasons = ref<Record<string, string>>({})
const productDeactivationReasons = ref<Record<string, string>>({})
const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

const { data: productsResponse, refresh: refreshProducts } = await useFetch<ProductsResponse>('/api/products')

// fetch all licenses includig deactivated ones
const queryParams = computed(() => {
  const params: { view: string, status?: LicenseStatus, productId?: string } = { view: 'admin' } // need to specify admin view show get deactivated licenses
  if (statusFilter.value) {
    params.status = statusFilter.value
  }
  if (productFilter.value) {
    params.productId = productFilter.value
  }
  return params
})

// get licences with given query params
const { data: licenceResponse, refresh: refreshLicenses } = await useFetch<LicenseResponse>('/api/license-keys', {
  method: 'GET',
  query: queryParams,
  watch: [queryParams]
})

// map of all existing products
const productOptions = computed(() => {
  // deleted products stay hidden from the selector
  const products = (productsResponse.value?.data || []).filter(p => p.status !== 'DELETED')
  return [
    { label: 'Alle Produkte', value: null },
    ...products.map(p => ({ label: p.productName, value: p.id }))
  ]
})

watch([productOptions, productFilter], ([options, selectedProductId]) => {
  if (selectedProductId && !options.some(option => option.value === selectedProductId)) {
    productFilter.value = null
  }
}, { immediate: true })

// keep all products in the lookup so we can derive the current product state once.
const productMap = computed(() => {
  const products = productsResponse.value?.data || []
  return new Map(products.map(product => [product.id, product]))
})

const getProductStatus = (productId: string): ProductStatus | null => {
  return productMap.value.get(productId)?.status ?? null
}

const getProductStatusColor = (status: ProductStatus | null) => {
  switch (status) {
    case 'ACTIVE': return 'success'
    case 'DEACTIVATED': return 'warning'
    default: return 'neutral'
  }
}

// map for all existing status values
const statusOptions = computed(() => [
  { label: 'Jeder Status', value: null },
  { label: 'Lizenz aktiv', value: 'ACTIVE' },
  { label: 'Lizenz inaktiv', value: 'INACTIVE' }
])

// sort by product name
const sortByProductName = (leftLicense: LicenseListing, rightLicense: LicenseListing) => {
  return (leftLicense.product.productName || '').localeCompare(rightLicense.product.productName || '')
}

// filter rows, sort them by product name and attach the status
const filteredLicenses = computed(() => {
  const licenses = licenceResponse.value?.data || []
  const query = search.value.toLowerCase()
  const filtered = !query
    ? licenses
    : licenses
        .filter((license) => {
          const name = (license.licenseName || '').toLowerCase()
          const productName = (license.product.productName || '').toLowerCase()
          const key = (license.licenseKey || '').toLowerCase()
          return name.includes(query) || productName.includes(query) || key.includes(query)
        })
  return filtered
    .filter(license => getProductStatus(license.product.id) !== 'DELETED')
    .sort(sortByProductName)
    .map(license => ({
      ...license,
      productStatus: getProductStatus(license.product.id)
    }))
})

const shouldShowProductActions = (licenseId: string) => {
  const index = filteredLicenses.value.findIndex(item => item.id === licenseId)
  if (index === -1) {
    return false
  }

  // only show product actions for the first license of the product
  const productId = filteredLicenses.value[index]?.product.id
  if (!productId) {
    return false
  }

  return filteredLicenses.value.findIndex(item => item.product.id === productId) === index
}

const goAddProduct = () => {
  navigateTo('/admin/add_product')
}

const changeProduct = async (productId: string, change: 'deactivate' | 'reactivate' | 'delete', reason?: string) => {
  try {
    if (change === 'deactivate' || change === 'delete') {
      // retrieve all licenses of the product and deactivate them with a reasoning
      const licensesResponse = await $fetch<LicenseResponse>('/api/license-keys', {
        method: 'GET',
        query: {
          view: 'admin',
          productId
        }
      })
      const licenseIdsToRevoke = licensesResponse.data
        .filter(license => license.status !== 'INACTIVE')
        .map(license => license.id)

      await Promise.all(
        licenseIdsToRevoke.map(licenseId => $fetch(`/api/license-keys/deactivate/${licenseId}`, {
          method: 'POST',
          body: { reason: reason ?? `Produkt ${change === 'delete' ? 'gelöscht' : 'deaktiviert'}` }
        }))
      )
    }

    await $fetch(`/api/products/${change}/${productId}`, {
      method: 'POST',
      body: reason ? { reason } : undefined
    })
    await Promise.all([refreshLicenses(), refreshProducts()])
    productDeactivationReasons.value[productId] = ''
    notification.value = {
      message: 'Die Aktion wurde erfolgreich ausgeführt.',
      type: 'success'
    }
  } catch (error) {
    let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.'
    if (error instanceof FetchError && error.data?.statusMessage) {
      errorMessage = error.data.statusMessage
    }
    notification.value = {
      message: `Die Aktion konnte nicht ausgeführt werden: ${errorMessage}`,
      type: 'failure'
    }
  }
}

const deactivateProduct = async (productId: string) => {
  const reason = productDeactivationReasons.value[productId]
  if (!reason || !reason.trim()) {
    alert('Bitte geben Sie einen Grund an.')
    return
  }

  await changeProduct(productId, 'deactivate', reason.trim())
}

const reactivateProduct = async (productId: string) => {
  await changeProduct(productId, 'reactivate')
}

const deleteProduct = async (productId: string) => {
  await changeProduct(productId, 'delete')
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

const canReactivateLicense = (item: DisplayLicense) => {
  return item.status === 'INACTIVE' && item.productStatus === 'ACTIVE'
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

      <NotificationContainer
        v-if="notification"
        class="mb-4"
        :message="notification.message"
        :type="notification.type"
        @close="notification = null"
      />

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
              size="md"
              class="ml-2"
            >
              {{ statusLabels[item.status] }}
            </UBadge>
            <UBadge
              v-if="item.productStatus && item.productStatus !== 'DELETED'"
              :color="getProductStatusColor(item.productStatus)"
              variant="subtle"
              size="md"
              class="ml-2"
            >
              {{ productStatusLabels[item.productStatus] }}
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
              color="warning"
              variant="solid"
              block
            >
              Lizenz deaktivieren
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
                  color="warning"
                  block
                  @click="disableLicence(item.id)"
                >
                  Bestätigen
                </UButton>
              </div>
            </template>
          </UPopover>
          <UButton
            v-else-if="canReactivateLicense(item)"
            type="button"
            color="success"
            variant="solid"
            block
            @click="reactivateLicence(item.id)"
          >
            Reaktivieren
          </UButton>
          <div
            v-if="shouldShowProductActions(item.id)"
            class="grid gap-2"
          >
            <UPopover
              v-if="item.productStatus === 'ACTIVE'"
              :popper="{ placement: 'top-end' }"
              :ui="{ content: 'border border-brand' }"
            >
              <UButton
                color="error"
                variant="solid"
                block
              >
                Produkt deaktivieren
              </UButton>

              <template #content>
                <div class="p-4 w-64">
                  <p class="text-sm mb-2">
                    Grund für die Deaktivierung:
                  </p>
                  <UTextarea
                    v-model="productDeactivationReasons[item.product.id]"
                    class="w-full"
                  />
                  <UButton
                    class="mt-2"
                    size="xs"
                    color="error"
                    block
                    @click="deactivateProduct(item.product.id)"
                  >
                    Bestätigen
                  </UButton>
                </div>
              </template>
            </UPopover>

            <template v-else-if="item.productStatus === 'DEACTIVATED'">
              <UButton
                type="button"
                color="success"
                variant="solid"
                block
                @click="reactivateProduct(item.product.id)"
              >
                Produkt reaktivieren
              </UButton>
              <UPopover
                :popper="{ placement: 'top-end' }"
                :ui="{ content: 'border border-brand' }"
              >
                <UButton
                  type="button"
                  color="error"
                  variant="solid"
                  block
                >
                  Produkt löschen
                </UButton>

                <template #content="{ close }">
                  <div class="p-4 w-64">
                    <p class="text-sm mb-2">
                      Sind Sie sich sicher, dass Sie das Produkt löschen und somit alle Lizenzen des Produkts deaktivieren wollen? Dies ist nicht rückgängig zu machen.
                    </p>
                    <div class="flex gap-2">
                      <UButton
                        class="flex-1"
                        size="xs"
                        color="primary"
                        block
                        @click="deleteProduct(item.product.id)"
                      >
                        Produkt löschen
                      </UButton>
                      <UButton
                        class="flex-1"
                        size="xs"
                        color="error"
                        block
                        @click="close"
                      >
                        Abbrechen
                      </UButton>
                    </div>
                  </div>
                </template>
              </UPopover>
            </template>
          </div>
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
