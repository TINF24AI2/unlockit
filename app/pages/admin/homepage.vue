<script setup lang="ts">
import { computed, ref } from 'vue'
import Container from '@/components/Container.vue'

definePageMeta({
  middleware: ['is-admin']
})

// Navigation
const goManageUsers = () => {
  navigateTo('/admin/manage_users')
}

const goManageProducts = () => {
  navigateTo('/admin/licenselist')
}

const goManageAssignments = () => {
  navigateTo('/admin/manage_assignments')
}

const goApply = () => {
  navigateTo('/user/licenselist')
}

const goHistory = () => {
  navigateTo('/user/user_history')
}

const goAudit = () => {
  navigateTo('/user/audit')
}

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

// Fetch pending license assignments for preview
const { data: pendingAssignments } = await useFetch<LicenseAssignment[]>('/api/assignments/', {
  method: 'GET'
})

const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

// Show only the first 3 requests
const previewAssignments = computed(() => {
  return (pendingAssignments.value || []).slice(0, 3)
})

async function handleAssignment(assignmentId: string, change: 'approve' | 'reject') {
  try {
    await $fetch(`/api/assignments/${change}/${assignmentId}`, {
      method: 'POST'
    })

    // Refresh the list after each action
    await refreshNuxtData()

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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}
</script>

<template>
  <div class="p-6">
    <!-- Title -->
    <h1 class="text-center mb-6 text-2xl font-semibold">
      Herzlich Willkommen Admin
    </h1>

    <!-- Options menu -->
    <div class="grid grid-cols-[1fr_3fr] gap-20 items-start">
      <Container class="grid gap-4 w-full h-fit p-6">
        <UButton
          color="secondary"
          class="justify-center"
          @click="goManageProducts"
        >
          Verwaltung von Produkte/Lizenzen
        </UButton>

        <UButton
          color="secondary"
          class="justify-center"
          @click="goManageAssignments"
        >
          Lizenzgenehmigung
        </UButton>

        <UButton
          color="secondary"
          class="justify-center"
          @click="goApply"
        >
          Produkte/Lizenzen beantragen
        </UButton>

        <UButton
          color="secondary"
          class="justify-center"
          @click="goManageUsers"
        >
          Verwaltung User
        </UButton>

        <UButton
          color="secondary"
          class="justify-center"
          @click="goAudit"
        >
          Historie aller Lizenz-Anfragen
        </UButton>

        <UButton
          color="secondary"
          class="justify-center"
          @click="goHistory"
        >
          Persönliche Historie
        </UButton>
      </Container>

      <!-- Preview panel -->
      <Container class="p-6">
        <NotificationContainer
          v-if="notification"
          class="mb-4"
          :message="notification.message"
          :type="notification.type"
          @close="notification = null"
        />

        <div class="grid mb-6 gap-2">
          <span class="text-center font-semibold text-xl">
            Einblick in offene Lizenzanfragen
          </span>
        </div>
        <div class="bg-white rounded-3xl p-4 space-y-3">
          <div
            v-if="previewAssignments.length === 0"
            class="text-sm text-gray-500 text-center p-4"
          >
            Keine offenen Anfragen vorhanden.
          </div>
          <div
            v-for="item in previewAssignments"
            :key="item.id"
            class="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
          >
            <div class="min-w-0 text-sm break-words">
              <div class="flex flex-wrap gap-x-2 gap-y-1">
                <span class="font-medium break-words">{{ item.licenseKey.product.productName }} - {{ item.licenseKey.licenseName }}</span>
                <span class="text-gray-600">angefragt von</span>
                <span class="font-medium break-words">{{ item.user.email }}</span>
              </div>
              <div
                v-if="item.assignmentNote"
                class="mt-1 text-sm italic text-gray-500 break-words whitespace-normal md:max-w-[52ch]"
              >
                {{ item.assignmentNote }}
              </div>
              <div class="mt-2 text-xs text-gray-400">
                Angefragt am {{ formatDate(item.requestedAt) }}
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 justify-items-center md:w-56 md:shrink-0">
              <div class="flex w-full justify-center">
                <UPopover
                  :key="`popover-accept-${item.id}`"
                  class="inline-flex"
                >
                  <UButton
                    type="button"
                    color="primary"
                    variant="solid"
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
              </div>

              <div class="flex w-full justify-center">
                <UPopover
                  :key="`popover-reject-${item.id}`"
                  class="inline-flex"
                >
                  <UButton
                    type="button"
                    color="error"
                    variant="solid"
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
        </div>
      </Container>
    </div>
  </div>
</template>
