<script setup lang="ts">
const props = defineProps({
  id: {
    type: String,
    default: null
  },
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'text'
  }
})

const emit = defineEmits(['update:modelValue'])

let uniqueIdCounter = 0

const inputId = computed(() => {
  // use provided id when availabe
  if (props.id) {
    return props.id
  }

  // generate unique id based on label and counter
  uniqueIdCounter++
  const sanitizedLabel = props.label.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return `${sanitizedLabel}-${uniqueIdCounter}`
})

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="relative">
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      class="w-full px-6 py-4 rounded-full bg-white border-none focus:outline-none focus:ring-2 focus:ring-brand peer placeholder-transparent"
      :placeholder="label"
      @input="onInput"
    >
    <label
      :for="inputId"
      class="absolute left-6 top-4 text-gray-500 transition-all
                   peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
                   peer-focus:top-1 peer-focus:text-sm peer-focus:text-brand peer-focus:font-bold
                   peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-brand peer-[:not(:placeholder-shown)]:font-bold"
    >
      {{ label }}
    </label>
  </div>
</template>
