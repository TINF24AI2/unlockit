<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  middleware: ['is-admin']
})

const schema = z.object({
  selectedProductId: z.string().nullable(),
  productName: z.string().optional(),
  licenseName: z.string().min(1, 'Lizenzname ist erforderlich'),
  requiresAdminApproval: z.boolean(),
  numberOfVolumeLicences: z.number().min(0),
  numberOfSingleLicences: z.number().min(0),
  volumeLicenceCodes: z.array(z.object({
    code: z.string().min(1, 'Lizenzcode ist erforderlich'),
    maxUsage: z.number().min(1, 'Max. Nutzung muss mindestens 1 sein')
  })),
  singleLicenceCodes: z.array(z.object({
    code: z.string().min(1, 'Lizenzcode ist erforderlich')
  }))
})

type Schema = z.output<typeof schema>

const state = reactive({
  selectedProductId: null as string | null,
  productName: '',
  licenseName: '',
  requiresAdminApproval: true,
  numberOfVolumeLicences: 0,
  numberOfSingleLicences: 0,
  volumeLicenceCodes: [] as { code: string, maxUsage: number }[],
  singleLicenceCodes: [] as { code: string }[]
})

const isSubmitting = ref(false)
const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

const { data: existingProducts, refresh: refreshProducts } = await useFetch<{ data: { id: string, productName: string, status: string }[] }>('/api/products', {
  method: 'GET'
})

const productOptions = computed(() => [
  { label: '-- Neues Produkt erstellen --', value: null },
  ...((existingProducts.value?.data || [])
    .filter(product => product.status !== 'DELETED')
    .map(product => ({ label: product.productName, value: product.id })))
])

watch(() => state.numberOfVolumeLicences, (newCount) => {
  const count = newCount || 0
  const difference = count - state.volumeLicenceCodes.length
  if (difference > 0) {
    for (let i = 0; i < difference; i++) {
      state.volumeLicenceCodes.push({ code: '', maxUsage: 1 })
    }
  } else if (difference < 0) {
    state.volumeLicenceCodes.splice(count)
  }
})

watch(() => state.numberOfSingleLicences, (newCount) => {
  const count = newCount || 0
  const difference = count - state.singleLicenceCodes.length
  if (difference > 0) {
    for (let i = 0; i < difference; i++) {
      state.singleLicenceCodes.push({ code: '' })
    }
  } else if (difference < 0) {
    state.singleLicenceCodes.splice(count)
  }
})

// Formular zurücksetzen
const resetForm = () => {
  state.selectedProductId = null
  state.productName = ''
  state.licenseName = ''
  state.numberOfVolumeLicences = 0
  state.numberOfSingleLicences = 0
  state.volumeLicenceCodes = []
  state.singleLicenceCodes = []
}

const submit = async (event: FormSubmitEvent<Schema>) => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  notification.value = null

  try {
    let productId = state.selectedProductId
    const data = event.data

    if (!productId && data.productName) {
      const productResponse = await $fetch('/api/products', {
        method: 'POST',
        body: { productName: data.productName }
      })
      productId = productResponse.data.id
      await refreshProducts()
    }

    if (!productId) {
      throw new Error('Kein Produkt ausgewählt oder erstellt.')
    }

    // check if selected product is deactivated
    const selectedProduct = existingProducts.value?.data?.find(product => product.id === productId)
    if (selectedProduct?.status === 'DEACTIVATED') {
      notification.value = {
        message: 'Dieses Produkt ist deaktiviert. Bitte aktivieren Sie es zuerst, bevor Sie Lizenzen hinzufügen.',
        type: 'failure'
      }
      return
    }

    const licensePromises = [
      ...data.volumeLicenceCodes.map(licence => $fetch('/api/license-keys', {
        method: 'POST',
        body: {
          productId,
          licenseName: data.licenseName,
          licenseKey: licence.code,
          licenseType: 'VOLUME',
          maxUsages: licence.maxUsage,
          requiresAdminApproval: data.requiresAdminApproval
        }
      })),
      ...data.singleLicenceCodes.map(licence => $fetch('/api/license-keys', {
        method: 'POST',
        body: {
          productId,
          licenseName: data.licenseName,
          licenseKey: licence.code,
          licenseType: 'SINGLE',
          maxUsages: 1,
          requiresAdminApproval: data.requiresAdminApproval
        }
      }))
    ]
    await Promise.all(licensePromises)

    notification.value = { message: 'Produkt und/oder Lizenzen erfolgreich hinzugefügt!', type: 'success' }
    resetForm()
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error)
    notification.value = { message: 'Fehler beim Hinzufügen des Produkts oder der Lizenzen.', type: 'failure' }
  } finally {
    isSubmitting.value = false
  }
}

const goBack = () => {
  navigateTo('/admin/licenselist')
}
</script>

<template>
  <Container>
    <h2 class="mb-4 text-xl font-semibold">
      Produkt/Lizenzen hinzufügen
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
        label="Produkt auswählen"
        name="selectedProductId"
      >
        <USelect
          v-model="state.selectedProductId"
          :items="productOptions"
          value-attribute="value"
          option-attribute="label"
          class="w-full"
        />
      </UFormField>

      <UFormField
        v-if="state.selectedProductId === null"
        label="Neuer Produktname"
        name="productName"
        required
      >
        <UInput
          v-model="state.productName"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Lizenzname"
        name="licenseName"
        required
      >
        <UInput
          v-model="state.licenseName"
          class="w-full"
        />
      </UFormField>

      <UCheckbox
        v-model="state.requiresAdminApproval"
        label="Die Lizenzanfrage muss von einem Admin genehmigt werden"
      />

      <UFormField
        label="Anzahl Volumenlizenzen"
        name="numberOfVolumeLicences"
      >
        <UInput
          v-model.number="state.numberOfVolumeLicences"
          type="number"
          class="w-full"
          min="0"
        />
      </UFormField>

      <div
        v-if="state.volumeLicenceCodes.length > 0"
        class="grid gap-y-4 pl-8"
      >
        <div
          v-for="(licence, index) in state.volumeLicenceCodes"
          :key="`vol-${index}`"
          class="flex items-start gap-x-4"
        >
          <UFormField
            :label="`Volumenlizenzcode ${index + 1}`"
            :name="`volumeLicenceCodes.${index}.code`"
            class="flex-grow"
            required
          >
            <UInput
              v-model="licence.code"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Max. Nutzung"
            :name="`volumeLicenceCodes.${index}.maxUsage`"
            class="w-48"
            required
          >
            <UInput
              v-model.number="licence.maxUsage"
              type="number"
              class="w-full"
              min="1"
            />
          </UFormField>
        </div>
      </div>

      <UFormField
        label="Anzahl Einzellizenzen"
        name="numberOfSingleLicences"
      >
        <UInput
          v-model.number="state.numberOfSingleLicences"
          type="number"
          class="w-full"
          min="0"
        />
      </UFormField>

      <div
        v-if="state.singleLicenceCodes.length > 0"
        class="grid gap-y-4 pl-8"
      >
        <UFormField
          v-for="(licence, index) in state.singleLicenceCodes"
          :key="`single-${index}`"
          :label="`Einzellizenzcode ${index + 1}`"
          :name="`singleLicenceCodes.${index}.code`"
          required
        >
          <UInput
            v-model="licence.code"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="grid grid-cols-2 gap-4 pt-4">
        <UButton
          type="submit"
          color="success"
          block
          :loading="isSubmitting"
          :label="isSubmitting ? 'Wird hinzugefügt...' : 'Hinzufügen'"
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
