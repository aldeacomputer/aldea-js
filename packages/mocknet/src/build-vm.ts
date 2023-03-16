import { VM, Storage, Clock } from "@aldea/vm"
import {base16, Pointer, PrivKey} from "@aldea/sdk-js"
import { logger } from "./globals.js";

export interface iVM {
  storage: Storage;
  vm: VM;

  minterPriv: PrivKey;
  coinOrigin: Pointer
}

export function buildVm (clock: Clock): iVM {
  const magicBytes = base16.decode('189a1004c9c0424e4ed1188efb8129f46cf1625d26e3ad6ff2ae440f80e67caf')
  const minterPrivKey = PrivKey.fromHex('f9d65ed0a27fd5a88b232a0b4598ba294ff5bba87f4010e3674ddebc30c04365')
  const minterAddress = minterPrivKey.toPubKey().toAddress()

  const storage = new Storage()
  const vm = new VM(storage, clock)
  const sources = [
    'nft'
  ]

  sources.forEach(src => {
    const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
    logger.info(`built ${src} with id: ${base16.encode(id)}`)
  })

  // big number of coins that is kind of in the safe js range.
  const coin = vm.mint(minterAddress, 2**40, magicBytes)

  return { storage, vm, minterPriv: minterPrivKey, coinOrigin: coin.origin }
}
