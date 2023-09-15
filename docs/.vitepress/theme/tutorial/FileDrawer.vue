<template>
  <div class="px-2.5">
    <ul class="font-mono text-14">
      <li v-for="node, name of container.files">
        <FileTree :name="(name as string)" :node="node" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useMonaco, useWebContainer } from '../../store'
import FileTree from './FileTree.vue'

const container = useWebContainer()
</script>