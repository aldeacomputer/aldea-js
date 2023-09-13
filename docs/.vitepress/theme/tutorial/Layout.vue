<template>
  <div class="Layout tutorial">
    <VPNav :inert="false" />

    <main class="flex flex-auto">
      <article class="flex flex-col w-2/5">
        <NavSelect />
        <div class="flex-auto px-9 py-6 overflow-y-auto">
          <Content class="w-full max-w-2xl mx-auto | vp-doc" />
        </div>
        <Pager />
      </article>
      <div class="flex flex-auto flex-col bg-neutral-800">
        <div class="flex flex-auto border-b border-neutral-700">
          <FileDrawer class="w-52 border-r border-neutral-700" />
          <Editor class="flex-auto" />
        </div>
        <div class="flex flex-col h-2/5">
          <Terminal class="flex-auto" />
          <StatusBar />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import VPNav from 'vitepress/dist/client/theme-default/components/VPNav.vue'
import Editor from './Editor.vue'
import FileDrawer from './FileDrawer.vue'
import NavSelect from './NavSelect.vue'
import Pager from './Pager.vue'
import StatusBar from './StatusBar.vue'
import Terminal from './Terminal.vue'
</script>

<style scoped>
.Layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}


.code-wrap .editor {
  flex: auto;
}

.terminal-wrap {
  display: flex;
  flex-direction: column;
  height: 38.2%;
}
</style>