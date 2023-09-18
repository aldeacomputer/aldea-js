import { computed, ref, shallowRef, toRaw, watch } from 'vue'
import { defineStore } from 'pinia'
import loader from '@monaco-editor/loader'
import type * as  monaco from 'monaco-editor'
import { FileNode, DirectoryNode, FileSystemTree } from '@webcontainer/api'
import { useWebContainer } from './container'

export const useMonaco = defineStore('monaco', () => {
  const container = useWebContainer()

  const monacoRef = shallowRef<typeof monaco>()
  const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>()
  const currentFile = ref<string>('')

  const ready = new Promise<typeof monaco>(async resolve => {
    monacoRef.value = await loader.init()

    monacoRef.value.editor.defineTheme('aldea', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#161618',
      },
  });
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

    //container.ready.then(() => {
    //  Object.entries(container.files).forEach(([name, node]) => traverseFileTree('', name, node))
    //  
    //})
    resolve(monacoRef.value!)
  })

  //function traverseFileTree(base: string, name: string, node: FileNode | DirectoryNode): void {
  //  const path = [base, name].join('/').replace(/^\//, '')
  //  if ('directory' in node) {
  //    return Object.entries(node.directory).forEach(([name, node]) => traverseFileTree(path, name, node))
  //  } else {
  //    const modelType = path.endsWith('.json') ? 'json' : 'typescript'
  //    const modelUrl = monacoRef.value!.Uri.parse(`file:///${path}`)
  //    const model = monacoRef.value!.editor.createModel(node.file.contents as string, modelType, modelUrl)
  //    models.value.push(model)
  //  }
  //}  

  function mountEditor(el: HTMLElement) {
    editor.value = monacoRef.value!.editor.create(el, {
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