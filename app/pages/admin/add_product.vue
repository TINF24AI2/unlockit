<script setup lang="ts">
const productname = ref('')
const licencename = ref('')
const numberOfVolumeLicences = ref(0)
const numberOfSingleLicences = ref(0)

const volumeLicenceCodes = ref<{ code: string, maxUsage: number }[]>([])
const singleLicenceCodes = ref<string[]>([])

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

  // Placeholder

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
        <FormInput
          v-model="productname"
          type="text"
          label="Produktname"
        />
        <FormInput
          v-model="licencename"
          type="text"
          label="Lizenzname"
        />
        <FormInput
          v-model.number="numberOfVolumeLicences"
          type="number"
          label="Anzahl Volumenlizenzen"
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
            />
            <FormInput
              v-model.number="licence.maxUsage"
              type="number"
              label="Max. Nutzung"
              class="w-48"
            />
          </div>
        </div>

        <FormInput
          v-model.number="numberOfSingleLicences"
          type="number"
          label="Anzahl Einzellizenzen"
        />

        <div
          v-if="singleLicenceCodes.length > 0"
          class="flex flex-col space-y-4 pl-8"
        >
          <FormInput
            v-for="(_, index) in singleLicenceCodes"
            :key="index"
            v-model="singleLicenceCodes[index]"
            type="text"
            :label="`Einzellizenzcode ${index + 1}`"
          />
        </div>

        <div class="flex space-x-4 pt-4">
          <SubmitButton class="flex-1">
            Hinzufügen
          </SubmitButton>
          <DangerButton class="flex-1">
            Abbrechen
          </DangerButton>
        </div>
      </form>
    </div>
  </Container>
</template>
