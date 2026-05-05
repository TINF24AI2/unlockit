<script setup lang="ts">
import { ref, onMounted } from 'vue' // for automatically generating a password on page load

const username = ref('')
const email = ref('')
const password = ref('')
const admin = ref(false)
const isSubmitting = ref(false)
const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

// generating the password
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return out
}

function generateNewPassword() {
  password.value = generatePassword()
}

onMounted(() => {
  generateNewPassword()
})

// submit
const submit = async () => {
  if (isSubmitting.value) return

  // validation
  if (!email.value || !password.value) {
    notification.value = {
      message: 'Bitte alle Pflichtfelder ausfüllen',
      type: 'failure'
    }
    return
  }

  isSubmitting.value = true
  notification.value = null

  try {
    await $fetch('/api/users/users', {
      method: 'POST',
      body: {
        email: email.value,
        username: username.value,
        password: password.value,
        admin: admin.value
      }
    })

    notification.value = {
      message: `Der User für die E-Mail ${email.value} wurde erfolgreich hinzugefügt.`,
      type: 'success'
    }

    // Reset form
    email.value = ''
    username.value = ''
    admin.value = false
    generateNewPassword()
  } catch (error: unknown) {
    let message = 'User konnte nicht erstellt werden.'

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
  } finally {
    isSubmitting.value = false
  }
}

// navigations
const goHomepage = () => {
  navigateTo('/admin/homepage')
}

const goBack = () => {
  navigateTo('/admin/manage_users')
}
</script>

<template>
  <Container>
    <h2 class="mb-4 text-xl font-semibold">
      Benutzer hinzufügen
    </h2>

    <NotificationContainer
      v-if="notification"
      class="mb-4"
      :message="notification.message"
      :type="notification.type"
      @close="notification = null"
    />
    <form
      class="grid gap-y-4"
      @submit.prevent="submit"
    >
      <FormInput
        v-model="email"
        type="email"
        label="E-Mail Adresse"
        required
      />
      <FormInput
        v-model="username"
        type="text"
        label="Benutzername"
        required
      />
      <div class="flex items-center gap-2">
        <div class="flex-1">
          <FormInput
            v-model="password"
            type="text"
            label="Generiertes Passwort"
            readonly
          />
        </div>
        <UButton
          color="neutral"
          @click.prevent="generateNewPassword"
        >
          Neu
        </UButton>
      </div>
      <div>
        <input
          id="admin"
          v-model="admin"
          type="checkbox"
          class="w-4 h-4 text-brand rounded focus:ring-brand focus:ring-2"
        >
        <label
          for="admin"
          class="text-sm font-medium text-gray-900"
        >
          Administratorrechte
        </label>
      </div>

      <div class="grid grid-cols-2 gap-4 pt-4">
        <SubmitButton
          class="w-full"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Wird erstellt...' : 'Hinzufügen' }}
        </SubmitButton>
        <DangerButton
          class="w-full"
          @click="goBack"
        >
          Abbrechen
        </DangerButton>
      </div>
    </form>

    <div class="flex justify-end mt-6">
      <StandardButton @click="goHomepage">
        Zurück zur Startseite
      </StandardButton>
    </div>
  </Container>
</template>
