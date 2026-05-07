<script setup lang="ts">
const { user, fetch: refreshSession, clear } = useUserSession()

async function login(data: { email: string, password: string }) {
  try {
    await clear()

    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: data
    })

    if (result == null) {
      throw new Error()
    }
    if (!result.success) {
      if ('errorCode' in result && result.errorCode == 'PASSWORD_RESET_REQUIRED') {
        return navigateTo({
          path: '/set_password',
          query: {
            from: 'firstlogin'
          }
        })
      }
    }

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
