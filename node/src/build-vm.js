import { VM, Storage } from "@aldea/vm"

export function buildVm () {
  const storage = new Storage()
  const vm = new VM(storage)
  const sources = [
    'basic-math',
    'flock',
    'nft',
    'remote-control',
    'sheep-counter',
    'tv',
    'weapon'
  ]

  sources.forEach(src => {
    vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
  })
  return { vm, storage }
}
