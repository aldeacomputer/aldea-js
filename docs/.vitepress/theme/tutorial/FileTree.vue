<template>
  <div
    v-if="isDir(node)">
    <div class="flex items-center gap-2 py-2">
      <CaFolders class="text-18" />
      <span>{{ name }}</span>
    </div>
    <ul class="pl-6 pb-2">
      <li v-for="nestedNode, name of node.directory">
        <FileTree :base="fullPath" :name="(name as string)" :node="nestedNode" />
      </li>
    </ul>
  </div>

  <div
    v-else
    class="flex items-center gap-2 py-1 hover:text-interactive transition-colors cursor-pointer"
    @click="openFile">
    <CaDocumentBlank class="text-18" />
    <span>{{ name }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FileNode, DirectoryNode } from '@webcontainer/api'
import { CaDocumentBlank, CaFolders } from '@kalimahapps/vue-icons'
import { useMonaco } from '../../store'

const monaco = useMonaco()

const props = withDefaults(defineProps<{
  base?: string;
  name: string;
  node: FileNode | DirectoryNode;
}>(), {
  base: ''
})

const fullPath = computed(() => {
  return [props.base, props.name].join('/').replace(/^\//, '')
})

function isDir(node: FileNode | DirectoryNode): node is DirectoryNode {
  return 'directory' in node
}

function isFile(node: FileNode | DirectoryNode): node is FileNode {
  return 'file' in node
}

function openFile() {
  if ('file' in props.node) monaco.openFile(fullPath.value)
}
</script>