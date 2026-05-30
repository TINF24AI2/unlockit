<script setup lang="ts">
const route = useRoute()
const { user, fetch: refreshSession, clear } = useUserSession()
const loginNotification = computed(() => {
  if (route.query.reset === 'sent') {
    return {
      message: 'E-Mail wurde versendet. Bitte prüfen Sie Ihr Postfach.', // still only sends the mail if it's a usermail
      type: 'success' as const
    }
  }

  return null
})

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
        return navigateTo('/request_reset')
      }
    }

    await refreshSession()

    const CurrentUser = user.value as LoggedInUser

    if (CurrentUser.permissions.includes('ADMIN')) {
      return navigateTo('/admin/homepage')
    } else {
      return navigateTo('/user/homepage')
    }
  } catch {
    alert('Bad Credentials')
  }
}
</script>

<template>
  <div class="grid gap-4">
    <NotificationContainer
      v-if="loginNotification"
      class="mt-10 w-1/2 mx-auto"
      :message="loginNotification.message"
      :type="loginNotification.type"
      @close="navigateTo('/login')"
    />

    <AuthForm @submit="login" />

    <div class="text-center text-sm text-gray-600">
      <UButton
        to="/request_reset"
        variant="link"
        color="neutral"
      >
        Passwort vergessen?
      </UButton>
    </div>
  </div>
</template>
