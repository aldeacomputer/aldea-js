import {MemStorage, VM} from '../src/index.js'
import {expect} from 'chai'
import {PrivKey, PubKey, ref} from "@aldea/core";
import {ArgsBuilder, buildVm, fundedExecFactoryFactory, parseOutput} from "./util.js";
import {TxExecution} from "../src/tx-execution.js";
import {StorageTxContext} from "../src/exec-context/storage-tx-context.js";
import {randomBytes} from "@aldea/core/support/util";
import {ExecOpts} from "../src/exec-opts.js";
import { GAME, KITCHEN_SINK, SELL_OFFER } from './explorer-examples.js'

describe('execute txs', () => {
  let storage: MemStorage
  let vm: VM
  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()


  beforeEach(() => {
    const data = buildVm([])
    storage = data.storage
    vm = data.vm
  })

  const fundedExec = fundedExecFactoryFactory(() => storage, () => vm)
  const emptyExec = (pubKeys: PubKey[] = []) => {
    const txHash = randomBytes(32)
    const context = new StorageTxContext(txHash, pubKeys, storage, vm)
    return new TxExecution(context, ExecOpts.default())
  }


  describe('Latest failing example', () => {
    const gameSrc = GAME
    const kitchenSrc = KITCHEN_SINK
    const sellOfferSrc = SELL_OFFER
    let gameArgs: ArgsBuilder
    let gamePkgId: Uint8Array
    let kitchenArgs: ArgsBuilder
    let kitchenPkgId: Uint8Array
    let sellArgs: ArgsBuilder
    let sellPkgId: Uint8Array


    beforeEach(async () => {
      const { exec: exec1 } = await fundedExec()
      await exec1.deploy(['entry.ts'], new Map([['entry.ts', gameSrc]]))
      const res1 = await exec1.finalize()
      storage.persistExecResult(res1)
      gameArgs = new ArgsBuilder(res1.deploys[0].abi)
      gamePkgId = res1.deploys[0].hash

      const { exec: exec2 } = await fundedExec()
      await exec2.deploy(['entry.ts'], new Map([['entry.ts', kitchenSrc]]))
      const res2 = await exec2.finalize()
      storage.persistExecResult(res2)
      kitchenArgs = new ArgsBuilder(res2.deploys[0].abi)
      kitchenPkgId = res2.deploys[0].hash

      const { exec: exec3 } = await fundedExec()
      await exec3.deploy(['entry.ts'], new Map([['entry.ts', sellOfferSrc]]))
      const res3 = await exec3.finalize()
      storage.persistExecResult(res3)
      sellArgs = new ArgsBuilder(res3.deploys[0].abi)
      sellPkgId = res3.deploys[0].hash
    })

    it('works', async () => {
      const { exec } = await fundedExec([userPriv])
      const minted1 = await vm.mint(userAddr, 100000)
      const minted2 = await vm.mint(userAddr, 10001)

      let gamePkg = exec.import(gamePkgId)
      exec.import(kitchenPkgId)
      exec.import(sellPkgId)
      const coinStmt = exec.load(minted1.hash)
      const coin2Stmt = exec.load(minted2.hash)

      const houseStmt =  exec.instantiate(gamePkg.idx, ...gameArgs.constr('House', [ref(coinStmt.idx), userPub.toBytes()]))
      exec.call(houseStmt.idx, ...gameArgs.method('House', 'createGame', [0, ref(coin2Stmt.idx)]))

      expect(() => exec.finalize()).not.to.throw()
    })
  })
})
