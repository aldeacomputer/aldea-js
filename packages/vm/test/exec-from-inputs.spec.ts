import {Storage, StubClock, VM} from "../vm/index.js";
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {base16, Tx} from "@aldea/sdk-js";
import {emptyExecFactoryFactory} from "./util.js";
import {TxExecution} from "../vm/tx-execution.js";
import {ExtendedTx} from "../vm/tx-context/extended-tx.js";
import {ExTxExecContext} from "../vm/tx-context/ex-tx-exec-context.js";

describe('exec from inputs', () => {
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()
  const moduleIds = new Map<string, string>()

  function modIdFor (key: string): Uint8Array {
    const id = moduleIds.get(key)
    if (!id) {
      throw new Error(`module was not deployed: ${key}`)
    }
    return base16.decode(id)
  }

  const clock = new StubClock()

  beforeEach(() => {
    const storage = new Storage()
    vm = new VM(storage, clock)

    const sources = [
      'flock'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  const emptyExec = emptyExecFactoryFactory(() => storage, () => vm)

  let exec: TxExecution
  beforeEach(() => {
    exec = emptyExec()
  })


  it('can execute a tx that depends only on a output id input', () => {
    const coin = vm.mint(userAddr, 1000)
    const tx = new Tx()
    const extx = new ExtendedTx(tx, [coin]);
    const context = new ExTxExecContext(extx, clock, vm, vm)
    const exec = new TxExecution(context)
  })
})
