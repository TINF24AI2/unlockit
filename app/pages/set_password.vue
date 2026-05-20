<script setup lang="ts">
import SetPassword from '~/components/SetPassword.vue'

async function reset(data: {
  email: string
  oldPassword: string
  newPassword: string
}) {
  try {
    await $fetch('/api/auth/password-reset', {
      method: 'POST',
      body: data
    })

    return navigateTo('/login')
  } catch {
    alert('Fehler beim Zurücksetzen des Passworts')
  }
}
</script>

<template>
  <SetPassword @submit="reset" />
</template>
