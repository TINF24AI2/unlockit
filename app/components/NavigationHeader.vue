<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { clear: clearSession, session } = useUserSession()

const route = useRoute()

async function logout() {
  await clearSession()
  await navigateTo('/login')
}

const isAdmin = computed(() =>
  (session.value?.user as LoggedInUser | null)?.permissions?.includes('ADMIN') ?? false
)

const home = computed(() => isAdmin.value ? '/admin/homepage' : '/user/homepage')

const adminItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Produkte/ Lizenzen verwalten',
    to: '/admin/licenselist',
    active: route.path.startsWith('/admin/licenselist')
  },
  {
    label: 'Lizenzanfragen',
    to: '/admin/manage_assignments',
    active: route.path.startsWith('/admin/manage_assignments')
  },
  {
    label: 'Nutzer verwalten',
    to: '/admin/manage_users',
    active: route.path.startsWith('/admin/manage_users')
  },
  {
    label: 'Reporting',
    to: '/admin/audit',
    active: route.path.startsWith('/admin/audit')
  }
])

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Lizenz beantragen',
    to: '/user/licenselist',
    active: route.path.startsWith('/user/licenselist')
  },

  ...(isAdmin.value ? adminItems.value : [])
])
</script>

<template>
  <UHeader
    v-if="session?.user"
    title="UNLOCKIT"
    :toggle="false"
  >
    <UNavigationMenu :items="items" />

    <template #right>
      <div class="flex items-center gap-2">
        <UTooltip text="Startseite">
          <UButton
            :to="home"
            icon="i-lucide-home"
            variant="subtle"
          />
        </UTooltip>
        <UButton
          label="Logout"
          icon="i-lucide-log-out"
          variant="subtle"
          @click="logout"
        />
      </div>
    </template>
  </UHeader>
</template>
