import { VM, Storage } from "@aldea/vm"

export function buildVm () {
  const storage = new Storage()
  const vm = new VM(storage)
  const sources = [
    'ant',
    'basic-math',
    'flock',
    'nft',
    'remote-control',
    'sheep-counter',
    'tv',
    'weapon'
  ]

  sources.forEach(src => {
    const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
    console.log(`built ${src} with id: ${id}`)
  })
  return { vm, storage }
}
