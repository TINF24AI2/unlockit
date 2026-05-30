<script setup lang="ts">
import SetPassword from '~/components/SetPassword.vue'

const { clear } = useUserSession()
const route = useRoute()
const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

await clear()

async function submit(data: {
  password: string
  confirmPassword: string
}) {
  notification.value = null

  const token = route.query.token

  if (typeof token !== 'string' || token.length === 0) {
    notification.value = {
      message: 'Ungültiger oder fehlender Token',
      type: 'failure'
    }
    return
  }

  try {
    await $fetch('/api/auth/set-password', {
      method: 'POST',
      body: {
        token,
        password: data.password
      }
    })

    return navigateTo('/login')
  } catch (error: unknown) {
    let message = 'Fehler beim Festlegen des Passworts'

    if (typeof error === 'object' && error !== null && 'data' in error) {
      const err = error as {
        data?: { statusMessage?: string, message?: string }
      }

      message = err.data?.statusMessage || err.data?.message || message
    }

    notification.value = {
      message,
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

    <SetPassword @submit="submit" />
  </div>
</template>
