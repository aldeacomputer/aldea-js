import Image from 'next/image'
import docsLogo from './public/sublogo_docs.png'

export default {
  github: 'https://github.com/aldeacomputer',
  docsRepositoryBase: 'https://github.com/shuding/nextra/blob/master',
  titleSuffix: ' – Aldea Docs',
  logo: (
    <>
      {/*<Image width={'160'} height={'70'} src={lightLogo}/>*/}
      <Image width={'180'} height={'28'} src={docsLogo}/>
    </>
  ),
  head: (
    <>
      <meta name="msapplication-TileColor" content="#ffffff"/>
      <meta name="theme-color" content="#ffffff"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <meta httpEquiv="Content-Language" content="en"/>
      <meta name="description" content="Aldea blockchain documentation"/>
      <meta name="og:description" content="Aldea blockchain documentation"/>
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="twitter:site:domain" content="docs.aldea.computer"/>
      <meta name="twitter:url" content="https://nextra.vercel.app"/>
      <meta property='og:url' content='https://aldea.docs'/>
      <meta name="og:title" content="Aldea Docs"/>
      <meta name="apple-mobile-web-app-title" content="Aldea Docs"/>
      <meta name="msapplication-TileImage" content="/ms-icon-144x144.png"/>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <script
        lang="javascript"
        dangerouslySetInnerHTML={{
          __html: `if (!window.localStorage.getItem("theme_default")) {
      window.localStorage.setItem("theme", "light");
      window.localStorage.setItem("theme_default", "light");
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }`,
        }}
      />
      ;
    </>
  ),
  search: true,
  darkMode: false,
  prevLinks: false,
  nextLinks: false,
  footer: false,
  footerEditLink: 'Edit this page on GitHub',
  footerText: <>Aldea Documentation</>,
  unstable_faviconGlyph: '👋',
}
