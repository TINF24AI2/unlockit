<template>
  <div class="flex flex-col justify-center my-6 mx-4 md:mx-16 lg:mx-24 px-4 sm:px-8 py-8 rounded-4xl bg-white">
    <slot />
  </div>
</template>

<script setup>
defineOptions({
  name: 'AppContainer'
})
</script>
