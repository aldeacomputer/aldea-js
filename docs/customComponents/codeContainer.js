import {useEffect, useState} from 'react'
import Prism from 'prismjs'
import 'prismjs/plugins/line-numbers/prism-line-numbers.js'
import 'prismjs/plugins/line-numbers/prism-line-numbers.css'
import "prismjs/components/prism-rust"
import "prismjs/components/prism-solidity"
import "prismjs/components/prism-typescript"
import styles from './codeContainer.module.scss'
import {AldeaButton} from "./aldeaButton";
import {toast} from "react-hot-toast";

// Expected codeSnippets prop structure: [{:title, :code, :lang}, ...]
export function CodeContainer({lang, children, title}) {

  useEffect(() => {
    Prism.highlightAll()
  }, [children, lang])

  const mapLanguageToPrismPreset = (lang) => {
    const map = {
      'js': 'language-javascript',
      'ts': 'language-typescript',
      'solidity': 'language-solidity',
      'rust': 'language-rust',
    }
    return map[lang] || 'language-javascript'
  }

  return (
    <div className={styles.container}>
      {title && <div className={styles.title}>
        <span>{title}</span>
      </div>}
      <pre className={`line-numbers ${mapLanguageToPrismPreset(lang)}`} data-start="1">
        <code className={mapLanguageToPrismPreset(lang)}>
          {children}
        </code>
      </pre>
    </div>
  )
}
