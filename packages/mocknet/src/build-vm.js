import { VM, Storage } from "@aldea/vm"
import { base16 } from "@aldea/sdk-js"

export function buildVm (clock) {
  const storage = new Storage()
  const vm = new VM(storage, clock)
  const sources = [
    'nft'
  ]

  sources.forEach(src => {
    const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
    console.log(`built ${src} with id: ${base16.encode(id)}`)
  })
  return { vm, storage }
}
