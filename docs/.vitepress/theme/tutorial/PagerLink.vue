<template>
  <component
    :is="linkComponent"
    :href="link"
    class="w-40 px-4 py-3"
    :class="!!link ? 'text-neutral-100 bg-neutral-700 hover:bg-neutral-600 transition-colors' : 'text-neutral-400'">
    <slot></slot>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  link?: string
}>()

const linkComponent = computed(() => {
  return !!props.link ? 'a' : 'div'
})
</script>