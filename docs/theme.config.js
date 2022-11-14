import Image from 'next/image'
//import lightLogo from './public/logoLight.png'
import biColorLogo from './public/logoBiColor.png'

export default {
  github: 'https://github.com/runonbitcoin/aldea-zero',
  docsRepositoryBase: 'https://github.com/shuding/nextra/blob/master',
  titleSuffix: ' – Aldea Docs',
  logo: (
    <>
      {/*<Image width={'160'} height={'70'} src={lightLogo}/>*/}
      <Image width={'120'} height={'35'} src={biColorLogo}/>
      <span className="docsSubtitle">
        docs
      </span>
    </>
  ),
  head: (
    <>
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#ffffff" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Language" content="en" />
      <meta name="description" content="Aldea blockchain documentation" />
      <meta name="og:description" content="Aldea blockchain documentation" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site:domain" content="docs.aldea.computer" />
      <meta name="twitter:url" content="https://nextra.vercel.app" />
      <meta property='og:url' content='https://aldea.docs'/>
      <meta name="og:title" content="Aldea Docs" />
      <meta name="apple-mobile-web-app-title" content="Aldea Docs" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-icon-180x180.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="192x192"
        href="/android-icon-192x192.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="96x96"
        href="/favicon-96x96.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
    </>
  ),
  search: true,
  darkMode: false,
  prevLinks: true,
  nextLinks: true,
  footer: true,
  footerEditLink: 'Edit this page on GitHub',
  footerText: <>Aldea Documentation</>,
  unstable_faviconGlyph: '👋',
}
