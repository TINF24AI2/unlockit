<script setup lang="ts">
const { fetch: refreshSession } = useUserSession()

async function login(data: { email: string, password: string }) {
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: data
    })

    console.log('Login worked')

    await refreshSession()

    await navigateTo('/')
  } catch {
    alert('Bad Credentials')
  }
}
</script>

<template>
  <AuthForm @submit="login" />
</template>
