<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  middleware: ['is-admin']
})

// Define the type for pending license assignments
type LicenseAssignment = {
  id: string
  assignmentNote: string
  requestedAt: string
  status: string
  user: {
    id: string
    email: string
    name: string | null
  }
  licenseKey: {
    id: string
    currentUsages: number
    maxUsages: number
    licenseName: string
    licenseType: string
    status: string
    product: {
      id: string
      productName: string
    }
  }
}

const search = ref('')
const productFilter = ref<string | null>(null)
const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

const { data: pendingAssignments, refresh: refreshAssignments } = await useFetch<LicenseAssignment[]>('/api/assignments/', {
  method: 'GET'
})

const { data: productsResponse } = await useFetch<{ data: { id: string, productName: string }[] }>('/api/products')

// Generating the product filter options for the dropdown
const productOptions = computed(() => {
  const products = productsResponse.value?.data || []
  return [
    { label: 'Alle Produkte', value: null },
    ...products.map(p => ({ label: p.productName, value: p.id }))
  ]
})

const filteredAssignments = computed(() => {
  const assignments = pendingAssignments.value || []
  const query = search.value.toLowerCase()

  return assignments.filter((item) => {
    const productName = (item.licenseKey.product.productName || '').toLowerCase()
    const licenseName = (item.licenseKey.licenseName || '').toLowerCase()
    const userName = (item.user.name || '').toLowerCase()
    const userEmail = (item.user.email || '').toLowerCase()

    const matchesSearch = !query
      || productName.includes(query)
      || licenseName.includes(query)
      || userName.includes(query)
      || userEmail.includes(query)

    const matchesProduct = !productFilter.value || item.licenseKey.product.id === productFilter.value

    return matchesSearch && matchesProduct
  })
})

async function handleAssignment(assignmentId: string, change: 'approve' | 'reject') {
  try {
    await $fetch(`/api/assignments/${change}/${assignmentId}`, {
      method: 'POST'
    })
    await refreshAssignments()

    notification.value = {
      message: `Die Lizenz wurde erfolgreich ${change === 'approve' ? 'genehmigt' : 'abgelehnt'}`,
      type: 'success'
    }
  } catch (error) {
    notification.value = {
      message: `Die Lizenzanfrage konnte nicht bearbeitet werden: ${error}`,
      type: 'failure'
    }
  }
}

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}
</script>

<template>
  <Container class="p-6 relative pb-20">
    <!-- Header -->
    <div class="mb-6">
      <h2
        class="mb-4 text-xl text-center font-semibold"
      >
        Lizenzanfragen verwalten
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
        <UInput
          v-model="search"
          type="text"
          placeholder="Suchen..."
          class="justify-self-end w-1/3 rounded-md pl-3 pr-3 py-1"
        />
      </div>
    </div>

    <div
      class="bg-white rounded-3xl p-4 space-y-3"
    >
      <div
        v-if="filteredAssignments.length === 0"
        class="text-sm text-gray-500 p-4 text-center"
      >
        Keine offenen Anfragen gefunden.
      </div>
      <div
        v-for="item in filteredAssignments"
        :key="item.id"
        class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 rounded-2xl border border-gray-200 p-4 md:items-center"
      >
        <!-- Left side: Assignment Info -->
        <div class="text-sm">
          <div>
            <span class="font-medium">{{ item.licenseKey.product.productName }} - {{ item.licenseKey.licenseName }}</span>
            <span class="text-gray-600"> angefragt von </span>
            <span class="font-medium">{{ item.user.email }}</span>
          </div>
          <div
            v-if="item.assignmentNote"
            class="text-sm text-gray-500 mt-1 italic"
          >
            "{{ item.assignmentNote }}"
          </div>
          <div class="text-xs text-gray-400 mt-1">
            Angefragt am {{ formatDate(item.requestedAt) }}
          </div>
        </div>

        <!-- Right side: Action Buttons -->
        <div class="grid grid-cols-2 gap-2">
          <UPopover
            :key="`popover-accept-${item.id}`"
          >
            <UButton
              type="button"
              color="primary"
              variant="solid"
              block
            >
              Genehmigen
            </UButton>
            <template #content="{ close }">
              <div class="p-4">
                <p class="mb-4">
                  Möchten Sie diese Anfrage wirklich genehmigen?
                </p>
                <div class="flex justify-end gap-2">
                  <UButton
                    variant="ghost"
                    @click="close"
                  >
                    Abbrechen
                  </UButton>
                  <UButton
                    color="primary"
                    @click="() => { handleAssignment(item.id, 'approve'); close(); }"
                  >
                    Bestätigen
                  </UButton>
                </div>
              </div>
            </template>
          </UPopover>

          <UPopover
            :key="`popover-reject-${item.id}`"
          >
            <UButton
              type="button"
              color="error"
              variant="solid"
              block
            >
              Ablehnen
            </UButton>
            <template #content="{ close }">
              <div class="p-4">
                <p class="mb-4">
                  Möchten Sie diese Anfrage wirklich ablehnen?
                </p>
                <div class="flex justify-end gap-2">
                  <UButton
                    variant="ghost"
                    @click="close"
                  >
                    Abbrechen
                  </UButton>
                  <UButton
                    color="error"
                    @click="() => { handleAssignment(item.id, 'reject'); close(); }"
                  >
                    Bestätigen
                  </UButton>
                </div>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </div>
  </Container>
</template>
