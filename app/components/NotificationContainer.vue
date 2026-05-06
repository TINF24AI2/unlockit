<script setup lang="ts">
const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'success',
    validator: (value: string) => ['success', 'error'].includes(value)
  }
})

const notificationClasses = computed(() => {
  return {
    'bg-brand border-brand': props.type === 'success',
    'bg-brandred border-brandred': props.type === 'failure'
  }
})
</script>

<template>
  <div
    class="border px-4 py-3 rounded-4xl relative"
    :class="notificationClasses"
    role="alert"
  >
    <span class="block sm:inline text-white">{{ message }}</span>
  </div>
</template>
