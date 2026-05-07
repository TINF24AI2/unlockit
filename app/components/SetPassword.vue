<script setup lang="ts">
import * as z from 'zod'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'

const fields = ref<AuthFormField[]>([
  {
    name: 'email',
    type: 'text',
    label: 'Email',
    required: true
  },
  {
    name: 'oldPassword',
    type: 'password',
    label: 'Altes Passwort',
    required: true
  },
  {
    name: 'newPassword',
    type: 'password',
    label: 'Neues Passwort',
    required: true
  },
  {
    name: 'confirmPassword',
    type: 'password',
    label: 'Neues Passwort bestätigen',
    required: true
  }
])

const schema = z.object({
  // change to z.email('Ungültige Email-Adresse') later
  email: z.string('Nutzername ist erforderlich').min(1, 'Nutzername ist erforderlich'),

  oldPassword: z.string('Altes Passwort ist erforderlich').min(1, 'Altes Passwort ist erforderlich'),

  newPassword: z.string('Passwort ist erforderlich')
    .min(12, 'Passwort muss mindestens 12 Zeichen lang sein.')
    .regex(/[a-z]/, 'Mindestens ein Kleinbuchstabe erforderlich.')
    .regex(/[A-Z]/, 'Mindestens ein Großbuchstabe erforderlich.')
    .regex(/\d/, 'Mindestens eine Zahl erforderlich.')
    .regex(/[!#$%&]/, 'Mindestens ein Sonderzeichen erforderlich. \nErlaubte Sonderzeichen: !#$%&'),

  confirmPassword: z.string('Passwort wiederholen').min(1, 'Passwort wiederholen')
})
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword']
  })

type Schema = z.output<typeof schema>

const emit = defineEmits(['submit'])

function onSubmit(payload: FormSubmitEvent<Schema>) {
  emit('submit', payload.data)
}

const route = useRoute()

const isFirstLogin = computed(() => route.query.from === 'firstlogin')
</script>

<template>
  <div class="flex justify-center pt-1">
    <div class="w-full max-w-md">
      <UAlert
        v-if="isFirstLogin"
        title="Neues Passwort erforderlich"
        description="Sie melden sich zum ersten Mal an. Bitte wählen Sie ein neues Passwort."
        color="warning"
        class="mb-4"
      />

      <UPageCard class="w-full max-w-md bg-gray-400 border-3 border-green-400">
        <UAuthForm
          :schema="schema"
          title="Passwort wählen"
          :fields="fields"
          :submit="{
            label: 'Passwort zurücksetzen',
            color: 'neutral'
          }"
          class="max-w-md"
          @submit="onSubmit"
        />
      </UPageCard>
    </div>
  </div>
</template>
