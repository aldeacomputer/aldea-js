import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { SpawnOptions, WebContainer, WebContainerProcess } from '@webcontainer/api'
import type { Terminal } from 'xterm'
import type { FitAddon } from 'xterm-addon-fit'
import { FileListNode, baseFiles, fmToFileSystemTree, fsToFileList } from './files'

export const useWebContainer = defineStore('web-container', () => {
  const containerRef = shallowRef<WebContainer>()
  const terminalRef = shallowRef<Terminal>()
  const fitAddonRef = shallowRef<FitAddon>()

  const ready = new Promise<WebContainer>(async resolve => {
    if (!import.meta.env.SSR) {
      const { WebContainer } = await import('@webcontainer/api')
      const { Terminal } = await import('xterm')
      const { FitAddon } = await import('xterm-addon-fit')

      containerRef.value = await WebContainer.boot({ workdirName: 'tutorial' })
      terminalRef.value = new Terminal({ convertEol: true })
      fitAddonRef.value = new FitAddon()
      terminalRef.value.loadAddon(fitAddonRef.value)
      await containerRef.value.mount(baseFiles)
      // resolve
      resolve(containerRef.value)

      // continue some async stuff
      const installProc = await exec('npm', ['install'])
      await installProc.exit
      const shellProc = await exec('jsh', {
        terminal: { cols: terminalRef.value.cols, rows: terminalRef.value.rows }
      })
      const input = shellProc.input.getWriter()
      terminalRef.value.onData(data => input.write(data))
    }
  })

  const files = ref<FileListNode[]>([])

  async function exec(cmd: string, opts?: SpawnOptions): Promise<WebContainerProcess>
  async function exec(cmd: string, args: string[], opts?: SpawnOptions): Promise<WebContainerProcess>
  async function exec(cmd: string, args?: string[] | SpawnOptions, opts?: SpawnOptions): Promise<WebContainerProcess> {
    const proc = Array.isArray(args) ?
      await containerRef.value!.spawn(cmd, args, opts) :
      await containerRef.value!.spawn(cmd, args)

    proc.output.pipeTo(new WritableStream({
      write: (data) => terminalRef.value!.write(data)
    }))

    proc.exit.then(code => {
      if (code > 0) throw new Error(`command \`${cmd}\` failed`)
    })

    return proc
  }

  async function execAll(cmds?: string[]) {
    if (Array.isArray(cmds)) {
      for (let str of cmds) {
        const [cmd, ...args] = str.split(' ')
        await exec(cmd, args).then(p => p.exit)
      }
    }
  }

  async function loadFiles(src?: Record<string, string>) {
    if (src) {
      const fileTree = fmToFileSystemTree(src)
      await containerRef.value!.mount(fileTree)
      files.value = fsToFileList(fileTree)
        .concat(fsToFileList(baseFiles))
        .sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  async function mountTerminal(el: HTMLElement) {
    terminalRef.value?.open(el)
    fitAddonRef.value?.fit()
  }

  return { ready, files, terminalRef, exec, execAll, mountTerminal, loadFiles }
})