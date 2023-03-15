import { VM, Storage, Clock } from "@aldea/vm"
import { base16 } from "@aldea/sdk-js"
import { logger } from "./globals.js";

export interface iVM {
  storage: Storage;
  vm: VM;
}

export function buildVm (clock: Clock): iVM {
  const storage = new Storage()
  const vm = new VM(storage, clock)
  const sources = [
    'nft'
  ]

  sources.forEach(src => {
    const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
    logger.info(`built ${src} with id: ${base16.encode(id)}`)
  })

  return { storage, vm }
}
