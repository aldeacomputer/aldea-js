import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Aldea Docs",
  description: "Learn how to use Aldea",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Docs', link: '/examples/markdown' },
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
      { text: 'Tutorial', link: '/tutorial/start' },
    ],

    sidebar: {
      '/examples': [
        {
          text: 'Examples',
          items: [
            { text: 'Markdown Examples', link: '/examples/markdown' },
            { text: 'Runtime API Examples', link: '/examples/api' },
          ]
        },
        {
          text: 'Nested navigation',
          items: [
            {
              text: 'Level 1',
              link: '/404',
              items: [
                {
                  text: 'Level 2',
                  link: '/404',
                  items: [
                    {
                      text: 'Level 3',
                      link: '/404',
                      items: [
                        {
                          text: 'Level 4',
                          link: '/404'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
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
        { text: 'Start', link: '/tutorial/start' },
        { text: 'Next', link: '/tutorial/next' },
      ]
    },

    //docFooter: {
    //  prev: false,
    //  next: false,
    //},

    socialLinks: [
      { icon: 'github', link: 'https://github.com/aldeacomputer' }
    ]
  }
})
