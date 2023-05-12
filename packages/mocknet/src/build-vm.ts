import { base16, Pointer, PrivKey } from "@aldea/core"
import { VM, Storage, Clock } from "@aldea/vm"
import { compile } from "@aldea/compiler";
import { logger } from './globals.js'

export interface iVM {
  storage: Storage;
  vm: VM;

  minterPriv: PrivKey;
  coinOrigin: Pointer
}


const nftSourceCode = `export class NFT extends Jig {
  name: string;
  rarity: u32;
  image: string;

  constructor(name: string, rarity: u32, image: string) {
    super()
    this.name = name
    this.rarity = rarity
    this.image = image
  }
}
`

export async function buildVm (clock: Clock): Promise<iVM> {
  const magicBytes = base16.decode('189a1004c9c0424e4ed1188efb8129f46cf1625d26e3ad6ff2ae440f80e67caf')
  const minterPrivKey = PrivKey.fromHex('f9d65ed0a27fd5a88b232a0b4598ba294ff5bba87f4010e3674ddebc30c04365')
  const minterAddress = minterPrivKey.toPubKey().toAddress()

  const storage = new Storage()
  const vm = new VM(storage, storage, clock, compile)

  let result = await compile(['index.ts'], {'index.ts': nftSourceCode})
  const id = vm.addPreCompiled(
    result.output.wasm,
    nftSourceCode,
    result.output.abi,
    new Uint8Array(Buffer.from(result.output.docs || '{}'))
  )

  logger.info(`Deployed nft class with id: ${base16.encode(id)}`)

  // big number of coins that is kind of in the safe js range.
  const coin = vm.mint(minterAddress, 2**40, magicBytes)

  return { storage, vm, minterPriv: minterPrivKey, coinOrigin: coin.origin }
}
