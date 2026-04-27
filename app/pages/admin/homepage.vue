<template>
  <div class="p-6">

    <!-- Seitentitel -->
    <h1 class="text-center mb-6 text-2xl"> Herzlich Willkommen Admin</h1>

    <!-- Menüoptionen -->
    <div class="flex gap-6 items-start">

      <Container class="flex flex-col justify-between gap-4 w-1/4 flex-shrink-0 h-fit p-6 !bg-[var(--color-brand)]">
        <UButton color="neutral" class="justify-center">
          Produkte/Lizenzen <br> hinzufügen und verwalten
        </UButton>

        <UButton color="neutral" class="justify-center">
          Lizenzgenehmigung
        </UButton>

        <UButton color="neutral" class="justify-center">
          Verwaltung User
        </UButton>

        <UButton color="neutral" class="justify-center">
          Accountpasswort <br> ändern
        </UButton>
      </Container>

      <!-- Historie -->
      <Container class="flex-1 p-6">

        <!-- Titel -->
        <div class="flex flex-col mb-6 gap-2">
          <span class="text-center">
            Historie genehmigter Beantragungen
          </span>
          <input v-model="search" type="text" placeholder="Suchen..." class="self-end bg-white rounded-md pl-3 pr-3 py-1" />
        </div>
        <div class="bg-white rounded-3xl p-4">
          <!-- Mock-Up Datenausgabe -->
          <div v-for="item in filteredData" :key="item.id"class="mb-2 text-sm">
            <span>{{ [item.product, item.user, item.date, item.status].join(' | ') }}</span>
          </div>
        </div>
      </Container>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Container from '@/components/Container.vue'

const search = ref('')
// Mock-Daten für die Beantragungen
const mockData = [
  { id: 1, product: "Microsoft Word 2017", user: "Mia Müller", date: "26.04.2026", status: "genehmigt" },
  { id: 2, product: "Microsoft Word 2017", user: "Max Münzner", date: "17.03.2026", status: "abgelehnt" },
  { id: 3, product: "Microsoft Word 2020", user: "Mia Müller", date: "02.02.2026", status: "in Bearbeitung" },
  { id: 4, product: "Microsoft Excel 2019", user: "Max Münzner", date: "19.01.2026", status: "abgelehnt" }
]

// Filtert die Daten basierend auf der Suchanfrage
const filteredData = computed(() => {
  if (!search.value) return mockData

  const s = search.value.toLowerCase()

  return mockData.filter(item =>
    item.product.toLowerCase().includes(s) ||
    item.user.toLowerCase().includes(s) ||
    item.status.toLowerCase().includes(s) ||
    item.date.toLowerCase().includes(s)
  )
})
</script>