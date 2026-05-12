// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-auth-utils',
    'nuxt-authorization',
    'nuxt-nodemailer'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: false }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  nodemailer: {
    from: '"SE-SSP" <se-ssp@tix4u.de>',
    host: '127.0.0.1',
    port: 1025,
    secure: false,
    auth: {
      user: '',
      pass: ''
    }
  }
})
