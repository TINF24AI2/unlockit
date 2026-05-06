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
  }
])

const schema = z.object({
  // change to z.email('Ungültige Email-Adresse') later
  email: z.string().min(1, 'Nutzername ist erforderlich'),
  oldPassword: z.string().min(1, 'Altes Passwort ist erforderlich'),
  newPassword: z.string('Passwort ist erforderlich')
    .min(12, 'Passwort muss mindestens 12 Zeichen lang sein')
    .regex(/^[A-Za-z0-9!#$%&]+$/, 'Schwaches Passwort')
})

type Schema = z.output<typeof schema>

const emit = defineEmits(['submit'])

function onSubmit(payload: FormSubmitEvent<Schema>) {
  emit('submit', payload.data)
}
</script>

<template>
  <div class="flex justify-center">
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
</template>
