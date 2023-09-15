<template>
  <div ref="root" class="px-2.5" />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useWebContainer } from '../../store'
import 'xterm/css/xterm.css'

const container = useWebContainer()
const root = ref<HTMLElement>()

onMounted(async () => {
  await container.ready
  container.mountTerminal(root.value!)
})
</script>
