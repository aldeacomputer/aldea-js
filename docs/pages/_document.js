import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <style>
          {"@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,400;0,600;0,800;1,100;1,200;1,400;1,600;1,800&family=Red+Hat+Display:ital,wght@0,300;0,400;0,500;0,800;0,900;1,300;1,400;1,500;1,700;1,900&family=Roboto+Mono:ital,wght@0,100;0,400;0,700;1,100;1,400;1,700&display=swap'); "}
        </style>
        <link rel="stylesheet" href="..." />
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
      </Head>
      <body>
      <Main />
      <NextScript />
      </body>
    </Html>
  )
}
