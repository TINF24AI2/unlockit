export default defineNitroPlugin(() => {
  const { appUrl } = useRuntimeConfig()
  if (!appUrl || appUrl === '') {
    throw new Error('NUXT_APP_URL environment variable is required but not set. The server cannot start without a canonical base URL for email links.')
  }
})
