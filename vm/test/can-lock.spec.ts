import {
  Storage,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxExecution} from "../vm/tx-execution.js";
import {base16, PrivKey, ref, Tx, instructions} from "@aldea/sdk-js";

const { SignInstruction } = instructions

describe('execute txs', () => {
  let storage: Storage
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

  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage)

    const sources = [
      'can-lock'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  function emptyExec (privKeys: PrivKey[] = []): TxExecution {
    const tx = new Tx()
    privKeys.forEach(pk => {
      const sig = tx.createSignature(pk)
      tx.push(new SignInstruction(sig, pk.toPubKey().toBytes()))
    })
    const exec = new TxExecution(tx, vm)
    exec.markAsFunded()
    return exec
  }

  describe('canLock', function () {
    it('returns false when target is public', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanLock', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(false)
    })
    it('returns false when target is frozen', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      exec.callInstanceMethodByIndex(jig2Idx, 'destroy', [])
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanLock', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(false)
    })

    it('returns true when target is user locked and there is a signature', () => {
      const exec = emptyExec([userPriv])
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      exec.lockJigToUser(jig2Idx, userAddr)
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanLock', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(true)
    })
    it('returns false when target is user locked and there is no signature', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      exec.lockJigToUser(jig2Idx, userAddr)
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanLock', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(false)
    })
    it('returns true when no lock', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanLock', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(true)
    })
    it('returns true when jig is owned by current jig', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      exec.callInstanceMethodByIndex(jig1Idx, 'adopt', [ref(jig2Idx)])
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanLock', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(true)
    })
    it('returns false when jig is owned by another jig', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      exec.instantiate(importIdx, 'OwnerJig', [ref(jig2Idx)])
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanLock', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(false)
    })
  });

  describe('#canCall()', function () {
    it('returns true when target is public', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanCall', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(true)
    })
    it('returns false when target is frozen', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      exec.callInstanceMethodByIndex(jig2Idx, 'destroy', [])
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanCall', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(false)
    })

    it('returns true when target is user locked and there is a signature', () => {
      const exec = emptyExec([userPriv])
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      exec.lockJigToUser(jig2Idx, userAddr)
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanCall', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(true)
    })
    it('returns false when target is user locked and there is no signature', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      exec.lockJigToUser(jig2Idx, userAddr)
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanCall', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(false)
    })
    it('returns true when no lock', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanCall', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(true)
    })
    it('returns true when jig is owned by current jig', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      exec.callInstanceMethodByIndex(jig1Idx, 'adopt', [ref(jig2Idx)])
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanCall', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(true)
    })
    it('returns false when jig is owned by another jig', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock'))
      const jig1Idx = exec.instantiate(importIdx, 'PublicJig', [])
      const jig2Idx = exec.instantiate(importIdx, 'UserJig', [])
      exec.instantiate(importIdx, 'OwnerJig', [ref(jig2Idx)])
      const methodIdx = exec.callInstanceMethodByIndex(jig1Idx, 'checkCanCall', [ref(jig2Idx)])
      const res = exec.getStatementResult(methodIdx)

      expect(res.value).to.eql(false)
    })
  });
})
