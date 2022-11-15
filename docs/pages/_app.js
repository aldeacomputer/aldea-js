import 'nextra-theme-docs/style.css'
import '../styles/global.scss'
import '../styles/prism.css'
import Head from "next/head";
import {useEffect} from "react";
import Prism from 'prismjs'

export default function Nextra({ Component, pageProps }) {
  useEffect(() => {
    Prism.highlightAll()
  }, [])
  return <>
    <Head>
      <title>Aldea Docs</title>
      <style>
        {"@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,400;0,600;0,800;1,100;1,200;1,400;1,600;1,800&family=Red+Hat+Display:ital,wght@0,300;0,400;0,500;0,800;0,900;1,300;1,400;1,500;1,700;1,900&family=Roboto+Mono:ital,wght@0,100;0,400;0,700;1,100;1,400;1,700&display=swap'); "}
      </style>
    </Head>
    <Component {...pageProps} />
  </>
}
