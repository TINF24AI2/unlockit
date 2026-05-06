<script setup lang="ts">
const { user, fetch: refreshSession, clear } = useUserSession()

async function login(data: { email: string, password: string }) {
  try {
    await clear()

    await $fetch('/api/auth/login', {
      method: 'POST',
      body: data
    })

    await refreshSession()

    const CurrentUser = user.value as LoggedInUser

    if (CurrentUser.permissions.includes('ADMIN')) {
      return navigateTo('/admin/homepage')
    } else {
      return navigateTo('/')
    }
  } catch {
    alert('Bad Credentials')
  }
}
</script>

<template>
  <AuthForm @submit="login" />
</template>
