export default defineNuxtRouteMiddleware(async () => {
  const { user } = useUserSession()

  if (await denies(isAdmin, user.value)) {
    return navigateTo('/')
  }
})
