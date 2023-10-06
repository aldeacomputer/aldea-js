import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Aldea Docs",
  description: "Learn how to use Aldea",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Learn', link: '/learn/about-aldea' },
      {
        text: 'API',
        items: [
          { text: 'Aldea Built-ins', link: '/api/aldea/README' },
          {
            text: 'JavaScript libs',
            items: [
              { text: '@aldea/sdk', link: '/api/sdk/modules' },
            ]
          }
        ],
      },
      { text: 'Tutorial', link: '/tutorial/basics/jig-fields' },
    ],

    sidebar: {
      '/learn': [
        {
          text: 'Getting started',
          items: [
            { text: 'About Aldea', link: '/learn/about-aldea' },
            { text: 'Development quickstart', link: '/learn/dev-quickstart' },
            { text: 'AssemblyScript', link: '/learn/assemblyscript' },
          ]
        },
        {
          text: 'Key concepts',
          items: [
            { text: 'Jigs', link: '/learn/jigs' },
            { text: 'Packages', link: '/learn/packages' },
            { text: 'Transactions', link: '/learn/transactions' },
            { text: 'Blocks', link: '/learn/blocks' },
          ]
        },
      ],
      '/api': [
        {
          text: 'Aldea API',
          items: [
            { text: 'Built-ins', link: '/api/aldea/README' },
          ]
        },
        {
          text: 'JavaScript Libs',
          items: [
            { text: '@aldea/sdk', link: '/api/sdk/modules' },
          ]
        }
      ],
      '/tutorial': [
        {
          text: 'Basics: Introduction to Jigs',
          items: [
            { text: 'Introduction', link: '/tutorial/basics/introduction' },
            { text: 'Fields: Modelling objects', link: '/tutorial/basics/jig-fields' },
            { text: 'Methods: Interactive objects', link: '/tutorial/basics/jig-methods' },
            { text: 'Composability: Jigs interacting with Jigs', link: '/tutorial/basics/jig-composability' },
            { text: 'Freezing Jigs', link: '/tutorial/basics/freezing-jigs' },
            { text: 'Discover the CLI', link: '/tutorial/basics/cli' },
            { text: 'Building transactions', link: '/tutorial/basics/txbuilder' },
            { text: 'Create a potion mixer', link: '/tutorial/basics/potion-mixer' },
          ]
        }
      ]
    },

    //docFooter: {
    //  prev: false,
    //  next: false,
    //},

    socialLinks: [
      { icon: 'github', link: 'https://github.com/aldeacomputer' }
    ]
  },

  vite: {
    plugins: [{
      name: 'WebContainer Headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          next()
        })
      }
    }]
  }
})
