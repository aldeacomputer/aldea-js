<template>
  <div
    v-if="isDir">
    <div class="flex items-center gap-2 py-1">
      <CaFolders class="text-18" />
      <span>{{ file.name }}</span>
    </div>
    <ul class="pl-6">
      <li v-for="child of file.children">
        <FileTree :base="file.path" :file="child" />
      </li>
    </ul>
  </div>

  <div
    v-else
    class="flex items-center gap-2 py-1 hover:text-interactive transition-colors cursor-pointer"
    :class="{'text-interactive underline': file.path === monaco.currentFile}"
    @click="monaco.openFile(file.path)">
    <CaDocumentBlank class="text-18" />
    <span>{{ file.name }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CaDocumentBlank, CaFolders } from '@kalimahapps/vue-icons'
import { useMonaco, FileListNode } from '../../store'

const monaco = useMonaco()

const props = withDefaults(defineProps<{
  base?: string;
  file: FileListNode;
}>(), {
  base: ''
})

const isDir = computed(() => Array.isArray(props.file.children))
</script>