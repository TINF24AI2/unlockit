<script setup lang="ts">
import SetPassword from '~/components/SetPassword.vue'

const { clear } = useUserSession()
const route = useRoute()

await clear()

async function submit(data: {
  password: string
  confirmPassword: string
}) {
  const token = route.query.token

  if (typeof token !== 'string' || token.length === 0) {
    alert('Ungültiger oder fehlender Token')
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

    alert(message)
  }
}
</script>

<template>
  <SetPassword @submit="submit" />
</template>
