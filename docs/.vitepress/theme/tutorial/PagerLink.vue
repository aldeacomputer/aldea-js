<template>
  <component
    :is="linkComponent"
    :href="link"
    class="flex items-center gap-4 px-4 py-3"
    :class="{
      'text-neutral-300 hover:text-neutral-100 hover:bg-white/5 transition-colors': link,
      'text-neutral-600': !link,
      'flex-row-reverse': next
    }">
    <component :is="iconComponent" />
    <slot></slot>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CaChevronLeft, CaChevronRight } from '../../icons'

const props = defineProps<{
  link?: string;
  prev?: boolean;
  next?: boolean;
}>()

const linkComponent = computed(() => {
  return !!props.link ? 'a' : 'div'
})

const iconComponent = computed(() => {
  return props.next ? CaChevronRight : CaChevronLeft
})
</script>