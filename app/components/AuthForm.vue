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
    name: 'password',
    type: 'password',
    label: 'Passwort',
    required: true
  }
])

const schema = z.object({
  // change to z.email('Ungültige Email-Adresse') later
  email: z.string().min(1, 'Nutzername ist erforderlich'),
  password: z.string('Passwort ist erforderlich')
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
        title="Login"
        :fields="fields"
        :submit="{
          label: 'Anmelden',
          color: 'neutral'
        }"
        class="max-w-md"
        @submit="onSubmit"
      />
    </UPageCard>
  </div>
</template>
