<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  middleware: ['is-admin']
})

const search = ref('')
const onlyActiveFilter = ref(false)
const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

// API call
const { data: usersResponse, refresh } = await useFetch('/api/users', {
  method: 'GET'
})

// normalising the user data
const users = computed(() =>
  (usersResponse.value?.data || []).map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    admin: user.permissions.includes('ADMIN'),
    status: user.status
  }))
)

// filter for name and email and sort
const filteredUsers = computed(() => {
  const query = search.value.toLowerCase()

  return users.value
    .filter((user) => {
      if (onlyActiveFilter.value && user.status !== 'ACTIVE') {
        return false
      }
      const name = (user.name || '').toLowerCase()
      const email = user.email.toLowerCase()
      return name.includes(query) || email.includes(query)
    })
    // sort by name
    .sort((lUser, rUser) =>
      (lUser.name || lUser.email).localeCompare(rUser.name || rUser.email)
    )
})

// Admin toggle
const toggleAdmin = async (id: number) => {
  const selectedUser = users.value.find(user => user.id === id)
  if (!selectedUser) return
  // if user is admin => remove admin permissions otherwise add them
  const nextPermissions = selectedUser.admin ? [] : ['ADMIN']

  try {
    await $fetch(`/api/users/permissions/${id}`, {
      method: 'POST',
      body: {
        permissions: nextPermissions
      }
    })

    await refresh()
  } catch {
    alert('Berechtigung kann nicht geändert werden.')
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'Aktiv'
    case 'DEACTIVATED': return 'Deaktiviert'
    case 'DELETED': return 'Gelöscht'
    default: return status
  }
}

// get badge color based on status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'primary'
    case 'DEACTIVATED': return 'warning'
    default: return 'neutral'
  }
}

const updateUserStatus = async (id: number, status: 'ACTIVE' | 'DEACTIVATED' | 'DELETED') => {
  const selectedUser = users.value.find(user => user.id === id)
  if (!selectedUser) return

  try {
    await $fetch(`/api/users/status`, {
      method: 'POST',
      body: { id, status }
    })
    await refresh()
    notification.value = {
      message: `Der Status von ${selectedUser.email} wurde auf ${getStatusLabel(status)} gesetzt.`,
      type: 'success'
    }
  } catch (error) {
    notification.value = {
      message: `Der Nutzerstatus konnte nicht geändert werden: ${error}`,
      type: 'failure'
    }
  }
}

const deactivateUser = (id: number) => updateUserStatus(id, 'DEACTIVATED')
const reactivateUser = (id: number) => updateUserStatus(id, 'ACTIVE')
const deleteUser = (id: number) => updateUserStatus(id, 'DELETED')

// Navigation
const goCreateUser = () => {
  navigateTo('/admin/add_users')
}
</script>

<template>
  <Container class="p-6 relative pb-20">
    <!-- Header -->
    <div class="grid mb-6 gap-2">
      <h2 class="mb-4 text-xl text-center font-semibold">
        User-Verwaltung
      </h2>

      <NotificationContainer
        v-if="notification"
        class="mb-4"
        :message="notification.message"
        :type="notification.type"
        @close="notification = null"
      />

      <div class="flex justify-between items-center gap-4">
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
        v-for="item in filteredUsers"
        :key="item.id"
        class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 rounded-2xl border border-gray-200 p-4"
      >
        <div class="text-sm space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ item.name || 'Ohne Benutzername' }}</span>
            <UBadge
              :color="getStatusColor(item.status)"
              variant="subtle"
              size="md"
            >
              {{ getStatusLabel(item.status) }}
            </UBadge>
          </div>
          <div class="text-gray-500">
            <span class="font-semibold text-gray-700">{{ item.email }}</span>
            <span> | {{ item.admin ? 'Admin' : 'User' }}</span>
          </div>
        </div>

        <div class="flex flex-col md:flex-row gap-2 md:items-center">
          <!-- Common Button -->
          <UButton
            type="button"
            color="primary"
            variant="solid"
            class="md:w-36 justify-center whitespace-nowrap"
            @click="toggleAdmin(item.id)"
          >
            {{ item.admin ? 'Zum User machen' : 'Zum Admin machen' }}
          </UButton>

          <!-- Active User Buttons -->
          <div
            v-if="item.status === 'ACTIVE'"
            class="flex flex-col md:flex-row gap-2"
          >
            <UPopover
              :key="`popover-deactivate-${item.id}`"
              :ui="{ content: 'border border-brand' }"
            >
              <UButton
                color="error"
                variant="solid"
                class="w-full md:w-36 justify-center"
              >
                Deaktivieren
              </UButton>
              <template #content="{ close }">
                <div class="p-4">
                  <p class="text-sm mb-2">
                    Möchten Sie den Nutzer wirklich deaktivieren?
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
                      @click="deactivateUser(item.id)"
                    >
                      Bestätigen
                    </UButton>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>

          <!-- Deactivated User Buttons -->
          <div
            v-if="item.status === 'DEACTIVATED'"
            class="flex flex-col md:flex-row gap-2"
          >
            <UButton
              type="button"
              color="primary"
              variant="solid"
              class="md:w-36 justify-center"
              @click="reactivateUser(item.id)"
            >
              Reaktivieren
            </UButton>
            <UPopover
              :key="`popover-delete-${item.id}`"
              :ui="{ content: 'border border-brand' }"
            >
              <UButton
                color="error"
                variant="solid"
                class="w-full md:w-36 justify-center"
              >
                Löschen
              </UButton>
              <template #content="{ close }">
                <div class="p-4">
                  <p class="text-sm mb-2">
                    Möchten Sie den Nutzer wirklich löschen?
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
                      @click="deleteUser(item.id)"
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

    <div class="absolute bottom-6 right-6">
      <UButton
        type="button"
        color="success"
        variant="solid"
        block
        @click="goCreateUser"
      >
        User hinzufügen
      </UButton>
    </div>
  </Container>
</template>
