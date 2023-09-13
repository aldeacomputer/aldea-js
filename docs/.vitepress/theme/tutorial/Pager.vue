<template>
  <footer class="flex items-center h-12 text-14 bg-neutral-800">
    <PagerLink :link="control.prev?.link">&laquo; Prev</PagerLink>
    <div class="flex-auto px-4 text-neutral-200 text-center">
      Page x / y
    </div>
    <PagerLink :link="control.next?.link" class="text-right">Next &raquo;</PagerLink>
  </footer>
</template>

<script setup lang="ts">
import { usePrevNext } from 'vitepress/dist/client/theme-default/composables/prev-next'
import PagerLink from './PagerLink.vue'

const control = usePrevNext()

</script>