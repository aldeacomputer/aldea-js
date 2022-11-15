import 'nextra-theme-docs/style.css'
import '../styles/global.scss'
import '../styles/prism.css'
import Head from "next/head";
import {useEffect} from "react";
import Prism from 'prismjs'
import {useRouter} from "next/router";

export default function Nextra({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    Prism.highlightAll()
  }, [router.asPath]);

  return <>
    <Head>
      <title> Aldea Docs</title>
    </Head>
    <Component {...pageProps} />
  </>
}
