<script setup lang="ts">
import * as z from 'zod'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'

const fields = ref<AuthFormField[]>([
  {
    name: 'password',
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
  password: z.string('Passwort ist erforderlich')
    .min(12, 'Passwort muss mindestens 12 Zeichen lang sein.')
    .regex(/[a-z]/, 'Mindestens ein Kleinbuchstabe erforderlich.')
    .regex(/[A-Z]/, 'Mindestens ein Großbuchstabe erforderlich.')
    .regex(/\d/, 'Mindestens eine Zahl erforderlich.')
    .regex(/^[A-Za-z0-9!#$%&]+$/, 'Passwort enthält ein unzulässiges Sonderzeichen')
    .regex(/[!#$%&]/, 'Mindestens ein Sonderzeichen erforderlich. Erlaubte Sonderzeichen: !#$%&'),
  confirmPassword: z.string('Passwort wiederholen').min(1, 'Passwort wiederholen')
})
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword']
  })

type Schema = z.output<typeof schema>

const emit = defineEmits<{
  submit: [data: Schema]
}>()

function onSubmit(payload: FormSubmitEvent<Schema>) {
  emit('submit', payload.data)
}
</script>

<template>
  <div class="flex justify-center px-4 pt-6 pb-8">
    <UPageCard class="w-full max-w-md bg-gray-400">
      <UAuthForm
        :schema="schema"
        title="Registrierung abschließen"
        :fields="fields"
        :submit="{
          label: 'Passwort festlegen',
          color: 'neutral'
        }"
        class="max-w-md"
        @submit="onSubmit"
      />
    </UPageCard>
  </div>
</template>
