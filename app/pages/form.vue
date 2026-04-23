<script setup lang="ts">
const field = ref('')
const value = ref('')
const result = ref<{ data: { id: number } } | null>(null)

const submit = async () => {
  const res = await $fetch('/api/settings', {
    method: 'POST',
    body: {
      field: field.value,
      value: value.value
    }
  })

  result.value = res
}
</script>

<template>
  <div>
    <form @submit.prevent="submit">
      <input
        v-model="field"
        placeholder="field"
      >
      <input
        v-model="value"
        placeholder="value"
      >
      <button type="submit">
        Submit
      </button>
    </form>

    <div v-if="result">
      <p>It worked!</p>
      <p>ID: {{ result.data.id }}</p>
    </div>
    <div v-else>
      <p>No Data</p>
    </div>
  </div>
</template>
