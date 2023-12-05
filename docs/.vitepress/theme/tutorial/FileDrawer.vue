<template>
  <div class="px-2.5">
    <ul class="font-mono text-14">
      <li v-for="file of container.files">
        <FileTree :file="file" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useWebContainer } from '../../store'
import FileTree from './FileTree.vue'

const container = useWebContainer()
</script>