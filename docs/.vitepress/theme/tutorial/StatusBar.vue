<template>
  <footer class="flex items-center justify-end h-12 text-14 bg-dark-elv">
    <div
      class="w-40 px-4 py-3 text-neutral-100 bg-sky-600 hover:bg-sky-500 transition-colors cursor-pointer"
      @click="monaco.solveFiles(frontmatter.solution)">
      Solve
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useData } from 'vitepress'
import { useMonaco } from '../../store'

const monaco = useMonaco()
const { frontmatter } = useData()
</script>