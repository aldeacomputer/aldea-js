import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type * as  monaco from 'monaco-editor'
import { useWebContainer } from './container'
import type { TypeLib } from '../../types/shared'
import { data as aldeaTypes } from '../../types/aldea.data'
import { data as ascTypes } from '../../types/assemblyscript.data'

export const useMonaco = defineStore('monaco', () => {
  const container = useWebContainer()

  const monacoRef = shallowRef<typeof monaco>()
  const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>()
  const currentFile = ref<string>('')

  function loadTypes(lib: TypeLib): void {
    var libUri = `ts:filename/${lib.filename}`
    monacoRef.value!.languages.typescript.javascriptDefaults.addExtraLib(lib.contents, libUri)
    monacoRef.value!.editor.createModel(lib.contents, 'typescript', monacoRef.value!.Uri.parse(libUri))
  }

  const ready = new Promise<typeof monaco>(async resolve => {
    if (!import.meta.env.SSR) {
      const loader = await import('@monaco-editor/loader')
      monacoRef.value = await loader.default.init() as typeof monaco

      monacoRef.value.editor.defineTheme('aldea', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#161618',
        },
      })
  
      monacoRef.value.languages.typescript.typescriptDefaults.setCompilerOptions({
        strict: true,
        alwaysStrict: true,
        allowNonTsExtensions: true,
        noImplicitAny: true,
        noImplicitReturns: true,
        noImplicitThis: true,
        noEmitOnError: true,
        strictNullChecks: true,
        experimentalDecorators: true,
        preserveConstEnums: false,
        downlevelIteration: true,
      
        target: monacoRef.value.languages.typescript.ScriptTarget.ESNext,
        module: monacoRef.value.languages.typescript.ModuleKind.CommonJS,
        //noLib: true,
        allowJs: false,
      
        //typeRoots: ["types"],
        //types: ["aldea"],
        //typeRoots: ['./node_modules/@aldea/compiler/types'],
        //types: ['aldea'],
      
        baseUrl: ".",
        //paths: {
        //  "*": [
        //    "./assembly/*"
        //  ]
        //}
        //paths: {
        //  "pkg://*": [".packages/*"]
        //}
      })
  
      loadTypes(aldeaTypes)
      loadTypes(ascTypes)
      resolve(monacoRef.value!)
    }
  })

  function mountEditor(el: HTMLElement) {
    editor.value = monacoRef.value?.editor.create(el, {
      automaticLayout: true,
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 14,
      formatOnType: true,
      formatOnPaste: true,
      folding: false,
      language: 'typescript',
      minimap: { enabled: false },
      renderLineHighlight: 'none',
      theme: 'aldea',
      tabSize: 2,
      padding: { top: 8 },
    })
  }

  function openFile(path) {
    container.ready.then(async ({ fs }) => {
      const src = await fs.readFile(path, 'utf8')
      const uri = monacoRef.value!.Uri.parse(`file:///${path}`)
      let model = monacoRef.value!.editor.getModel(uri)
      currentFile.value = path
      if (model) {
        model.setValue(src)
      } else {
        model = monacoRef.value!.editor.createModel(src, undefined, uri)
        model.onDidChangeContent(async e => {
          const value = model!.getValue()
          await fs.writeFile(path, value, 'utf8')
        })
      }
      editor.value!.setModel(model)
    })
  }

  function solveFiles(files: Record<string, string>) {
    Object.entries(files).forEach(([path, src]) => {
      const uri = monacoRef.value!.Uri.parse(`file:///${path}`)
      const model = monacoRef.value!.editor.getModel(uri)
      model!.setValue(src)
    })
  }

  return { ready, currentFile, editor, mountEditor, openFile, solveFiles }
})