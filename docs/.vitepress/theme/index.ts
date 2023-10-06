// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import { createPinia } from 'pinia'
import { useRoute, EnhanceAppContext } from 'vitepress'
import Theme from 'vitepress/theme'
import TutorialLayout from './tutorial/Layout.vue'
import './custom.css'
import './tutorial.css'

export default {
  extends: Theme,
  Layout: () => {
    const route = useRoute()
    if (/^\/tutorial\//.test(route.path)) {
      return h(TutorialLayout)
    } else {
      return h(Theme.Layout, null, {
        // https://vitepress.dev/guide/extending-default-theme#layout-slots
      })
    }
    
  },
  enhanceApp({ app, router, siteData }: EnhanceAppContext) {
    app.use(createPinia())
  }
}
