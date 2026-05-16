<script setup lang="ts">
import { ref } from 'vue' // for form state and submission handling
import * as z from 'zod' // for form validation
import type { FormSubmitEvent } from '#ui/types' // for typing the form submission event

definePageMeta({
  middleware: ['authenticated']
})

const schema = z.object({
  productId: z.string().min(1, 'Produkt-ID ist erforderlich'),
  reason: z.string().min(3, 'Eine Begründung ist erforderlich')
})

type Schema = z.output<typeof schema>

const route = useRoute()
// Product details come from the click from the user/licenselist.vue
const initialProductId = typeof route.query.productId === 'string' ? route.query.productId : ''
const selectedProductName = typeof route.query.productName === 'string' ? route.query.productName : ''
const selectedLicenseName = typeof route.query.licenseName === 'string' ? route.query.licenseName : ''

// Form state and submission handling
const state = ref({ productId: initialProductId, reason: '' })
const isSubmitting = ref(false)
const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

// Submit the license request to the backend
const submit = async (event: FormSubmitEvent<Schema>) => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  notification.value = null

  try {
    await $fetch('/api/assignments', {
      method: 'POST',
      body: {
        productId: event.data.productId,
        reason: event.data.reason
      }
    })

    // Show success message and automatically navigate back to license list
    notification.value = { message: 'Lizenzanfrage erfolgreich gesendet.', type: 'success' }
    setTimeout(async () => {
      await navigateTo('/user/licenselist')
    }, 1500)
  } catch (error) {
    console.error(error)
    notification.value = { message: 'Fehler bei der Anfrage. Zum Produkt besteht bereits eine Lizenzabfrage', type: 'failure' }
  } finally {
    isSubmitting.value = false
  }
}

const goBack = async () => {
  await navigateTo('/user/licenselist')
}
</script>

<template>
  <Container>
    <h2 class="mb-4 text-xl font-semibold">
      Lizenz anfragen
    </h2>

    <!-- Show the selected product ID for quick reference. -->
    <div class="mb-4 text-sm text-gray-600">
      <div v-if="initialProductId">
        Produkt-ID: {{ initialProductId }}
      </div>
    </div>

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
      <!-- Read-only fields for the selected product -->
      <UFormField label="Produkt">
        <UInput
          :model-value="selectedProductName"
          class="w-full"
          readonly
          placeholder="Produkt"
        />
      </UFormField>

      <UFormField label="Lizenz">
        <UInput
          :model-value="selectedLicenseName"
          class="w-full"
          readonly
          placeholder="Lizenz"
        />
      </UFormField>

      <!-- Reasoning from the user -->
      <UFormField
        label="Begründung"
        name="reason"
        required
      >
        <UTextarea
          v-model="state.reason"
          class="w-full"
          placeholder="Kurz begründen, wofür die Lizenz benötigt wird"
        />
      </UFormField>

      <div class="grid grid-cols-2 gap-4 pt-4">
        <UButton
          type="submit"
          color="success"
          block
          :loading="isSubmitting"
          :label="isSubmitting ? 'Wird gesendet...' : 'Anfrage senden'"
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
