<template>
  <footer class="flex items-center h-12 gap-4 text-14 bg-dark-elv">
    <PagerLink prev :link="control.prev?.link">Prev</PagerLink>
    <div class="flex-auto text-neutral-400 text-center">
      Page {{ pageNum }} / {{ pages.length }}
    </div>
    <PagerLink next :link="control.next?.link">Next</PagerLink>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { usePrevNext } from 'vitepress/dist/client/theme-default/composables/prev-next'
import { getSidebar, getFlatSideBarLinks } from 'vitepress/dist/client/theme-default/support/sidebar'
import { isActive } from 'vitepress/dist/client/shared'
import PagerLink from './PagerLink.vue'

const { page, theme } = useData()

const control = usePrevNext()
const sidebar = getSidebar(theme.value.sidebar, page.value.relativePath)
const pages = getFlatSideBarLinks(sidebar)

const pageNum = computed(() => {
  const index = pages.findIndex(p => isActive(page.value.relativePath, p.link))
  return index + 1
})
</script>