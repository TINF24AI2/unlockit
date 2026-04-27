<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
}>(), {
  label: 'Button'
})
</script>

<template>
  <UButton
    v-bind="$attrs"
    :label="label"
    class="!bg-white !text-gray-900 hover:!bg-gray-100 active:!bg-gray-200"
  />
</template>
