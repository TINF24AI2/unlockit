<script setup>
definePageMeta({
  middleware: ['authenticated']
})

// Navigation
const goHistory = () => {
  navigateTo('/user/user_history')
}

const goApply = () => {
  navigateTo('/user/licenselist')
}
</script>

<template>
  <div class="p-6">
    <!-- Title -->
    <h1 class="text-center mb-6 text-2xl">
      Herzlich Willkommen Nutzer
    </h1>

    <!-- Options menu -->
    <div class="flex justify-center">
      <Container class="grid gap-4 h-fit p-6 !bg-[var(--color-brand)]">
        <UButton
          color="neutral"
          class="justify-center"
          @click="goHistory"
        >
          Historie
        </UButton>

        <UButton
          color="neutral"
          class="justify-center"
          @click="goApply"
        >
          Lizenz beantragen
        </UButton>

        <UButton
          color="neutral"
          class="justify-center"
        >
          Accountpasswort ändern
        </UButton>
      </Container>
    </div>
  </div>
</template>
