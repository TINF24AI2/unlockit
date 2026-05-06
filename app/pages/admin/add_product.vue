<script setup lang="ts">
const productname = ref('')
const licencename = ref('')
const numberOfVolumeLicences = ref(0)
const numberOfSingleLicences = ref(0)

const volumeLicenceCodes = ref<{ code: string, maxUsage: number }[]>([])
const singleLicenceCodes = ref<string[]>([])

const notification = ref<{ message: string, type: 'success' | 'failure' } | null>(null)

const { data: existingProducts } = await useFetch('/api/products/products', {
  method: 'GET',
  default: () => [],
  transform: (response: { data: { id: string, productName: string }[] }) => {
    return response.data
  }
})
const selectedProductId = ref<string | null>(null)

watch(numberOfVolumeLicences, (newCount) => {
  const count = newCount || 0
  const difference = count - volumeLicenceCodes.value.length

  if (difference > 0) {
    for (let i = 0; i < difference; i++) {
      volumeLicenceCodes.value.push({ code: '', maxUsage: 1 })
    }
  } else if (difference < 0) {
    volumeLicenceCodes.value.splice(count)
  }
})

watch(numberOfSingleLicences, (newCount) => {
  const count = newCount || 0
  const difference = count - singleLicenceCodes.value.length

  if (difference > 0) {
    for (let i = 0; i < difference; i++) {
      singleLicenceCodes.value.push('')
    }
  } else if (difference < 0) {
    singleLicenceCodes.value.splice(count)
  }
})

const submit = async () => {
  notification.value = null

  try {
    let productId: string | null = selectedProductId.value

    if (productId === null) {
      const productResponse = await $fetch('/api/products/products', {
        method: 'POST',
        body: {
          productName: productname.value
        }
      })
      productId = productResponse.data.id
    }

    for (const volumeLicence of volumeLicenceCodes.value) {
      if (volumeLicence.code) {
        await $fetch('/api/license-keys/license-keys', {
          method: 'POST',
          body: {
            productId,
            licenseName: licencename.value,
            licenseKey: volumeLicence.code,
            licenseType: 'VOLUME',
            maxUsages: volumeLicence.maxUsage
          }
        })
      }
    }

    for (const singleLicenceCode of singleLicenceCodes.value) {
      if (singleLicenceCode) {
        await $fetch('/api/license-keys/license-keys', {
          method: 'POST',
          body: {
            productId,
            licenseName: licencename.value,
            licenseKey: singleLicenceCode,
            licenseType: 'SINGLE',
            maxUsages: 1
          }
        })
      }
    }

    notification.value = {
      message: 'Produkt und/oder Lizenzen erfolgreich hinzugefügt!',
      type: 'success'
    }

    productname.value = ''
    licencename.value = ''
    numberOfVolumeLicences.value = 0
    numberOfSingleLicences.value = 0
    volumeLicenceCodes.value = []
    singleLicenceCodes.value = []
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error)
    notification.value = {
      message: 'Fehler beim Hinzufügen des Produkts oder der Lizenzen.',
      type: 'failure'
    }
  }
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
      Produkt/Lizenzen hinzufügen
    </h2>

    <div class="w-full max-w-4xl mx-auto">
      <form
        class="flex flex-col space-y-4"
        @submit.prevent="submit"
      >
        <NotificationContainer
          v-if="notification"
          :message="notification.message"
          :type="notification.type"
          @close="notification = null"
        />
        <div class="relative">
          <select
            id="product-select"
            v-model="selectedProductId"
            class="w-full px-6 pt-4 pb-2 rounded-full bg-white border-none focus:outline-none focus:ring-2 focus:ring-brand peer placeholder-transparent"
            placeholder="Produkt auswählen"
          >
            <option :value="null">
              -- Neues Produkt erstellen --
            </option>
            <option
              v-for="product in existingProducts"
              :key="product.id"
              :value="product.id"
            >
              {{ product.productName }}
            </option>
          </select>
          <label
            for="product-select"
            class="absolute left-6 top-4 text-gray-500 transition-all
                            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
                            peer-focus:top-0 peer-focus:text-sm peer-focus:text-brand peer-focus:font-bold
                            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-brand peer-[:not(:placeholder-shown)]:font-bold"
          >
            Produkt auswählen
          </label>
        </div>
        <FormInput
          v-if="selectedProductId === null"
          v-model="productname"
          type="text"
          label="Produktname"
          required
        />
        <FormInput
          v-model="licencename"
          type="text"
          label="Lizenzname"
          required
        />
        <FormInput
          v-model.number="numberOfVolumeLicences"
          type="number"
          label="Anzahl Volumenlizenzen"
          min="0"
          required
        />

        <div
          v-if="volumeLicenceCodes.length > 0"
          class="flex flex-col space-y-4 pl-8"
        >
          <div
            v-for="(licence, index) in volumeLicenceCodes"
            :key="`vol-${index}`"
            class="flex items-end space-x-4"
          >
            <FormInput
              v-model="licence.code"
              type="text"
              :label="`Volumenlizenzcode ${index + 1}`"
              class="flex-grow"
              required
            />
            <FormInput
              v-model.number="licence.maxUsage"
              type="number"
              label="Max. Nutzung"
              min="1"
              class="w-48"
              required
            />
          </div>
        </div>

        <FormInput
          v-model.number="numberOfSingleLicences"
          type="number"
          label="Anzahl Einzellizenzen"
          min="0"
          required
        />

        <div
          v-if="singleLicenceCodes.length > 0"
          class="flex flex-col space-y-4 pl-8"
        >
          <FormInput
            v-for="(code, index) in singleLicenceCodes"
            :key="`single-${index}`"
            v-model="singleLicenceCodes[index]"
            type="text"
            :label="`Einzellizenzcode ${index + 1}`"
            required
          />
        </div>

        <div class="flex space-x-4 pt-4">
          <SubmitButton class="flex-1">
            Hinzufügen
          </SubmitButton>
          <DangerButton
            class="flex-1"
            @click="goBack"
          >
            Abbrechen
          </DangerButton>
        </div>
      </form>
    </div>
    <div class="flex justify-end mt-6">
      <UButton
        color="neutral"
        @click="goHomepage"
      >
        Zurück zur Startseite
      </UButton>
    </div>
  </Container>
</template>
