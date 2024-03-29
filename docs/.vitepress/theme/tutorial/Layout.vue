<template>
  <div class="Layout tutorial">
    <VPNav :inert="false" />

    <main class="flex flex-auto main">
      <article class="relative flex flex-col w-2/5 shrink-0">
        <NavSelect />
        <div class="flex-auto px-9 pt-6 pb-12 overflow-y-auto | VPDoc" ref="docs">
          <Content class="w-full max-w-2xl mx-auto | vp-doc" />
        </div>
        <Pager />
      </article>
      <ClientOnly>
        <div class="flex flex-col w-3/5 grow-0 bg-dark-alt">
          <div class="flex h-3/5 grow-0 border-b border-gray-800">
            <FileDrawer class="w-52 border-r border-gray-800" />
            <Editor class="flex-auto" />
          </div>
          <Terminal class="terminal overflow-hidden" />
          <StatusBar />
        </div>
      </ClientOnly>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'
import { useMonaco, useWebContainer } from '../../store'
import VPNav from 'vitepress/dist/client/theme-default/components/VPNav.vue'
import Editor from './Editor.vue'
import FileDrawer from './FileDrawer.vue'
import NavSelect from './NavSelect.vue'
import Pager from './Pager.vue'
import StatusBar from './StatusBar.vue'
import Terminal from './Terminal.vue'

const route = useRoute()
const { frontmatter } = useData()
const container = useWebContainer()
const monaco = useMonaco()
const docs = ref<HTMLElement>()

async function init() {
  await container.ready
  await container.execAll(frontmatter.value.setup)
  await container.loadFiles(frontmatter.value.files)
  monaco.openFile(frontmatter.value.open!)
}

watch(() => route.path, (path) => {
  if (/^\/tutorial/.test(path)) {
    init()
    // Force scroll to top
    docs.value!.scrollTop = 0
  }
})
init()
</script>

<style scoped>
.Layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main {
  max-height: calc(100vh - 64px);
}

.terminal {
  height: calc(40% - 48px)
}
</style>