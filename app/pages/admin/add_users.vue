<script setup lang="ts">
import { ref } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  middleware: ['is-admin']
})

const schema = z.object({
  email: z.email('Ungültige E-Mail Adresse'),
  username: z.string().min(1, { message: 'Benutzername ist erforderlich' }),
  admin: z.boolean()
})
type Schema = z.output<typeof schema>

const state = ref({
  email: '',
  username: '',
  admin: false
})

const isSubmitting = ref(false)
const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

// submit
const submit = async (event: FormSubmitEvent<Schema>) => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  notification.value = null

  try {
    await $fetch('/api/users', {
      method: 'POST',
      body: event.data
    })

    notification.value = {
      message: `Der User für die E-Mail ${event.data.email} wurde erfolgreich eingeladen.`,
      type: 'success'
    }

    // Reset form
    state.value = {
      email: '',
      username: '',
      admin: false
    }
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
    <UForm
      :schema="schema"
      :state="state"
      class="grid gap-y-4"
      @submit="submit"
    >
      <UFormField
        label="E-Mail Adresse"
        name="email"
        required
      >
        <UInput
          v-model="state.email"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Benutzername"
        name="username"
        required
      >
        <UInput
          v-model="state.username"
          class="w-full"
        />
      </UFormField>

      <UFormField name="admin">
        <UCheckbox
          v-model="state.admin"
          name="admin"
          label="Administratorrechte"
        />
      </UFormField>

      <div class="grid grid-cols-2 gap-4 pt-4">
        <UButton
          type="submit"
          color="success"
          block
          :loading="isSubmitting"
          :label="isSubmitting ? 'Wird erstellt....' : 'Hinzufügen'"
        />

        <UButton
          type="button"
          color="error"
          variant="solid"
          block
          @click="goBack"
        >
          Abbrechen
        </UButton>
      </div>
    </UForm>
  </Container>
</template>
