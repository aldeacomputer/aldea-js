<template>
  <div ref="root"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMonaco } from '../../store'

const monaco = useMonaco()
const root = ref<HTMLElement>()

onMounted(async () => {
  await monaco.ready
  monaco.mountEditor(root.value!)
})
</script>