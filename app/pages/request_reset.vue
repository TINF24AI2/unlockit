<script setup lang="ts">
import RequestReset from '~/components/RequestReset.vue'

const { clear } = useUserSession()
const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

await clear()

async function reset(data: { email: string }) {
  notification.value = null

  try {
    await $fetch('/api/auth/password-reset', {
      method: 'POST',
      body: data
    })

    return navigateTo({
      path: '/login',
      query: {
        reset: 'sent'
      }
    })
  } catch {
    notification.value = {
      message: 'Fehler beim Anfordern des Passwort-Reset-Links',
      type: 'failure'
    }
  }
}
</script>

<template>
  <div class="grid gap-4">
    <NotificationContainer
      v-if="notification"
      class="mt-10 w-1/2 mx-auto"
      :message="notification.message"
      :type="notification.type"
      @close="notification = null"
    />

    <RequestReset @submit="reset" />
  </div>
</template>
