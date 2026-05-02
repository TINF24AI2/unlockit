<script setup lang="ts">
import { ref, onMounted } from 'vue' // for automatically generating a password on page load

const username = ref('')
const email = ref('')
const password = ref('')
const admin = ref(false)

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

const submit = async () => {

  // Placeholder

}

const goHomepage = () => {
  navigateTo('/admin/homepage')
}

const goBack = () => {
  // Placeholder for previous page
}
</script>

<template>
  <Container>
    <h2 class="mb-4 text-xl font-semibold">
      Benutzer hinzufügen
    </h2>

    <div class="w-full max-w-4xl mx-auto">
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
          <SubmitButton class="w-full">
            Hinzufügen
          </SubmitButton>
          <DangerButton
            class="w-full"
            @click="goBack"
          >
            Abbrechen
          </DangerButton>
        </div>
      </form>
      <div class="fixed bottom-6 right-6">
        <StandardButton @click="goHomepage">
          Zurück zur Startseite
        </StandardButton>
      </div>
    </div>
  </Container>
</template>
