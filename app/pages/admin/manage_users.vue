<template>
  <Container class="p-6 relative pb-20">
    <!-- Header -->
    <div class="grid mb-6 gap-2">
      <h2
        class="mb-4 text-xl font-semibold"
        align="center"
      >
        User-Verwaltung
      </h2>

      <input
        v-model="search"
        type="text"
        placeholder="Suchen..."
        class="justify-self-end w-1/3 bg-white rounded-md pl-3 pr-3 py-1"
      >
    </div>

    <!-- Scrollbar -->
    <div
      class="bg-white rounded-3xl p-4 space-y-3 max-h-96 overflow-y-auto"
    >
      <div
        v-for="item in filteredUsers"
        :key="item.id"
        class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 rounded-2xl border border-gray-200 p-4 md:items-center"
      >
        <div class="text-sm">
          <span class="font-medium">{{ item.name || 'Ohne Benutzername' }}</span>
          <span class="text-gray-500">
            | {{ item.email }}
          </span>
          <span class="text-gray-500">
            | {{ item.admin ? 'Admin' : 'User' }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <StandardButton @click="toggleAdmin(item.id)">
            {{ item.admin ? 'Zum User machen' : 'Zum Admin machen' }}
          </StandardButton>

          <DangerButton @click="deleteUser(item.id)">
            Löschen
          </DangerButton>
        </div>
      </div>
    </div>

    <div class="absolute bottom-6 right-6">
      <StandardButton @click="goCreateUser">
        User hinzufügen
      </StandardButton>
    </div>
  </Container>
</template>

<script setup>
import { ref, computed } from 'vue'

// Navigation
const goCreateUser = () => {
  navigateTo('/admin/add_users')
}

const search = ref('')

// API call
const { data: usersResponse, refresh } = await useFetch('/api/users/users')

// normalising the user data
const users = computed(() =>
  (usersResponse.value?.data || []).map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    admin: user.permissions.includes('ADMIN')
  }))
)

// filter for name and email and sort
const filteredUsers = computed(() => {
  const query = search.value.toLowerCase()

  return users.value
    .filter((user) => {
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
const toggleAdmin = async (id) => {
  const selectedUser = users.value.find(user => user.id === id)
  if (!selectedUser) return
  // if user is admin => remove admin permissions otherwise add them
  const nextPermissions = selectedUser.admin ? [] : ['ADMIN']

  await $fetch('/api/users/user-permissions', {
    method: 'PATCH',
    body: {
      id,
      permissions: nextPermissions
    }
  })

  await refresh()
}

const deleteUser = () => {
  alert('Löschen ist aktuell noch nicht implementiert.') // TODO
  // Placeholder
}
</script>
