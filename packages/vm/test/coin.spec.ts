import {Storage, VM} from '../src/index.js'
import {expect} from 'chai'
import {BCS, Output, PrivKey, Tx} from "@aldea/core";
import {compile} from "@aldea/compiler";
import {
  CallInstruction,
  FundInstruction,
  LoadInstruction,
  LockInstruction,
  SignInstruction
} from "@aldea/core/instructions";
import {COIN_CLS_PTR} from "../src/memory/well-known-abi-nodes.js";

describe('Coin', () => {
  let storage: Storage
  let vm: VM
  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()

  const otherUserPriv = PrivKey.fromRandom()
  const otherUserPub = otherUserPriv.toPubKey()
  const otherUserAddr = otherUserPub.toAddress()



  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage, compile)
  })

  describe('#send', () => {
    const privKey = new PrivKey(new Uint8Array(32).fill(0))
    const pubKey = privKey.toPubKey()
    const addr = pubKey.toAddress()

    let coin: Output
    let bcs: BCS

    beforeEach(() => {
      coin = vm.mint(addr, 1000, new Uint8Array(32).fill(1))
      const coinPkg = storage.getPkg(COIN_CLS_PTR.id).get()
      bcs = new BCS(coinPkg.abi)
    })

    it('can exec send tx', async () => {
      const anotherAddress = new PrivKey(new Uint8Array(32).fill(2)).toPubKey()
      const tx = new Tx()
      tx.push(new LoadInstruction(coin.hash))
      tx.push(new CallInstruction(0, 0, bcs.encode('Coin_send', [800])))
      tx.push(new CallInstruction(0, 0, bcs.encode('Coin_send', [100])))
      tx.push(new FundInstruction(2))
      tx.push(new LockInstruction(1, anotherAddress.toAddress().hash))
      tx.push(new SignInstruction(new Uint8Array(), pubKey.toBytes()))

      const res = await vm.execTx(tx)
      expect(res.outputs).to.have.length(3)
      expect(res.outputs[0].origin).to.eql(coin.origin)
      expect(res.outputs[1].origin.id).to.eql(tx.id)
      expect(res.outputs[1].origin.idx).to.eql(1)
      expect(res.outputs[2].origin.id).to.eql(tx.id)
      expect(res.outputs[2].origin.idx).to.eql(2)
    })
  })




  describe('#combine', () => {})
})
