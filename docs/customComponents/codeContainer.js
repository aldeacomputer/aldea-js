import {useEffect} from 'react'
import Prism from 'prismjs'
import 'prismjs/plugins/line-numbers/prism-line-numbers.js'
import 'prismjs/plugins/line-numbers/prism-line-numbers.css'
import "prismjs/components/prism-rust"
import "prismjs/components/prism-solidity"
import "prismjs/components/prism-typescript"
import styles from './codeContainer.module.scss'

// Expected codeSnippets prop structure: [{:title, :code, :lang}, ...]
export function CodeContainer({lang, children, title, lines}) {
  if (typeof lines === 'undefined') lines = true

  useEffect(() => {
    Prism.highlightAll()
  }, [children, lang])

  const mapLanguageToPrismPreset = (lang) => {
    const map = {
      'js': 'language-javascript',
      'ts': 'language-typescript',
      'json': 'language-json',
      'bash': 'language-bash',
      'solidity': 'language-solidity',
      'rust': 'language-rust',
      'text': 'language-text',
    }
    return map[lang] || 'language-javascript'
  }

  const lineClass = lines ? 'line-numbers' : ''

  return (
    <div className={styles.container}>
      {title && <div className={styles.title}>
        <span>{title}</span>
      </div>}
      <pre className={`${lineClass} ${mapLanguageToPrismPreset(lang)}`} data-start="1">
        <code className={mapLanguageToPrismPreset(lang)}>
          {children}
        </code>
      </pre>
    </div>
  )
}
