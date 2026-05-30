<script setup lang="ts">
import * as z from 'zod'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'

const fields = ref<AuthFormField[]>([
  {
    name: 'email',
    type: 'text',
    label: 'Email',
    required: true
  }
])

const schema = z.object({
  email: z.string().email('Ungültige Email-Adresse')
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
        title="Passwort zurücksetzen"
        :fields="fields"
        :submit="{
          label: 'Link senden',
          color: 'neutral'
        }"
        class="max-w-md"
        @submit="onSubmit"
      />
    </UPageCard>
  </div>
</template>
