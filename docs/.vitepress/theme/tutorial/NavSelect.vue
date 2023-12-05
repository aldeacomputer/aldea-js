<template>
  <div ref="root">
    <div class="flex items-center justify-between h-12 bg-dark-elv">
      <div
        class="flex items-center justify-center w-12 h-12 border-r border-gray-700/60 hover:bg-white/5 cursor-pointer transition-colors"
        @click="open = true">
        <CaMenu class="text-20" />
      </div>
      <div class="flex-auto px-6">{{ page.title }}</div>    
    </div>

    <aside
      class="absolute top-0 bottom-12 right-full z-20 w-80 bg-dark-alt shadow-lg transition-transform duration-300 ease-in-out"
      :class="open ? 'translate-x-80' : 'translate-x-0'">
      <div class="flex items-center justify-end border-b border-gray-700/60">
        <div
          class="flex items-center justify-center w-12 h-12 hover:bg-white/5 cursor-pointer transition-colors"
          @click="open = false">
          <CaClose class="text-20" />
        </div>
      </div>

      <nav class="VPSidebarNav p-4">

        <div v-for="item in sidebarGroups" :key="item.text" class="group">
          <VPSidebarItem :item="item" :depth="0" />
        </div>

      </nav>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'
import { CaClose, CaMenu } from '@kalimahapps/vue-icons'
import { getSidebar, getSidebarGroups } from 'vitepress/dist/client/theme-default/support/sidebar'
import VPSidebarItem from 'vitepress/dist/client/theme-default/components/VPSidebarItem.vue'

const { page, theme } = useData()
const route = useRoute()

const root = ref<HTMLElement>()
const open = ref(false)
const sidebar = ref(getSidebar(theme.value.sidebar, page.value.relativePath))
const sidebarGroups = ref(getSidebarGroups(sidebar.value))

function clickAway(e: Event) {
  if (!root.value!.contains(e.target as HTMLElement) && open.value) {
    e.preventDefault()
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', clickAway)
})

onUnmounted(() => {
  document.removeEventListener('click', clickAway)
})

watch(() => route.path, (path, prevPath) => {
  if (/^\/tutorial/.test(path) && path !== prevPath) {
    open.value = false
  }
})
</script>

<style scoped>
.group + .group {
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 10px;
}

@media (min-width: 960px) {
  .group {
    padding-top: 10px;
    width: calc(var(--vp-sidebar-width) - 64px);
  }
}
</style>