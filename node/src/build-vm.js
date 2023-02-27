import { VM, Storage, MomentClock } from "@aldea/vm"
import { base16 } from "@aldea/sdk-js"

export function buildVm () {
  const storage = new Storage()
  const clock = new MomentClock()
  const vm = new VM(storage, clock)
  const sources = [
    'ant',
    'basic-math',
    'flock',
    'nft',
    'sheep-counter',
    'weapon'
  ]

  sources.forEach(src => {
    const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
    console.log(`built ${src} with id: ${base16.encode(id)}`)
  })
  return { vm, storage }
}
