import { computed, reactive, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { FileSystemTree, SpawnOptions, WebContainer, WebContainerProcess } from '@webcontainer/api'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { baseFiles } from './files'

export const useWebContainer = defineStore('web-container', () => {
  const containerRef = shallowRef<WebContainer>()
  const terminal = new Terminal({ convertEol: true })
  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  

  const files = reactive<FileSystemTree>({...baseFiles})
  const path = ref<string>('/package.json')

  const ready = new Promise<WebContainer>(async resolve => {
    containerRef.value = await WebContainer.boot()
    await containerRef.value.mount(files)
    // resolve
    resolve(containerRef.value)
    // continue some async stuff
    const installProc = await exec('npm', ['install'])
    await installProc.exit
    const shellProc = await exec('jsh', {
      terminal: { cols: terminal.cols, rows: terminal.rows }
    })
    const input = shellProc.input.getWriter()
    terminal.onData(data => input.write(data))
  })

  const fs = computed(() => containerRef.value!.fs)

  async function exec(cmd: string, opts?: SpawnOptions): Promise<WebContainerProcess>
  async function exec(cmd: string, args: string[], opts?: SpawnOptions): Promise<WebContainerProcess>
  async function exec(cmd: string, args?: string[] | SpawnOptions, opts?: SpawnOptions): Promise<WebContainerProcess> {
    const proc = Array.isArray(args) ?
      await containerRef.value!.spawn(cmd, args, opts) :
      await containerRef.value!.spawn(cmd, args)

    proc.output.pipeTo(new WritableStream({
      write: (data) => terminal.write(data)
    }))

    proc.exit.then(code => {
      if (code > 0) throw new Error(`command \`${cmd}\` failed`)
    })

    return proc
  }

  async function mountTerminal(el: HTMLElement) {
    terminal.open(el)
    fitAddon.fit()
  }

  return { ready, files, fs, path, terminal, exec, mountTerminal }
})