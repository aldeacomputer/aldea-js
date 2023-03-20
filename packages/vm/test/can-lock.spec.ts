import {
  Storage, StubClock,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {base16} from "@aldea/sdk-js";
import {emptyExecFactoryFactory} from "./util.js";

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
    const clock = new StubClock()
    vm = new VM(storage, clock)

    const sources = [
      'can-lock'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  const emptyExec = emptyExecFactoryFactory(() => storage, () => vm)

  describe('canLock', function () {
    it('returns false when target is public', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const methodStmt = exec.callInstanceMethod(jig1, 'checkCanLock', [jig2])
      const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(false)
    })
    it('returns false when target is frozen', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(pkg, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(pkg, 'UserJig', []).asJig()
      exec.callInstanceMethod(jig2, 'destroy', [])
      const methodSmt = exec.callInstanceMethod(jig1, 'checkCanLock', [jig2])
      const res = exec.getStatementResult(methodSmt.idx)

      expect(res.value).to.eql(false)
    })

    it('returns true when target is user locked and there is a signature', () => {
      const exec = emptyExec([userPriv])
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      exec.lockJigToUser(jig2, userAddr)
      const methodStmt = exec.callInstanceMethod(jig1, 'checkCanLock', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(true)
    })
    it('returns false when target is user locked and there is no signature', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      exec.lockJigToUser(jig2, userAddr)
      const methodStmt = exec.callInstanceMethod(jig1, 'checkCanLock', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(false)
    })
    it('returns true when no lock', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      const methodStmt = exec.callInstanceMethod(jig1, 'checkCanLock', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(true)
    })
    it('returns true when jig is owned by current jig', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      exec.callInstanceMethod(jig1, 'adopt', [jig2])
        const methodStmt = exec.callInstanceMethod(jig1, 'checkCanLock', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(true)
    })
    it('returns false when jig is owned by another jig', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      exec.instantiateByClassName(importIdx, 'OwnerJig', [jig2]).asJig()
      const methodStmt = exec.callInstanceMethod(jig1, 'checkCanLock', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(false)
    })
  });

  describe('#canCall()', function () {
    it('returns true when target is public', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const methodStmt = exec.callInstanceMethod(jig1, 'checkCanCall', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(true)
    })
    it('returns false when target is frozen', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      exec.callInstanceMethod(jig2, 'destroy', [])
        const methodStmt = exec.callInstanceMethod(jig1, 'checkCanCall', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(false)
    })

    it('returns true when target is user locked and there is a signature', () => {
      const exec = emptyExec([userPriv])
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      exec.lockJigToUser(jig2, userAddr)
      const methodStmt = exec.callInstanceMethod(jig1, 'checkCanCall', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(true)
    })
    it('returns false when target is user locked and there is no signature', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      exec.lockJigToUser(jig2, userAddr)
      const methodStmt = exec.callInstanceMethod(jig1, 'checkCanCall', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(false)
    })
    it('returns true when no lock', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      const methodStmt = exec.callInstanceMethod(jig1, 'checkCanCall', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(true)
    })
    it('returns true when jig is owned by current jig', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      exec.callInstanceMethod(jig1, 'adopt', [jig2])
        const methodStmt = exec.callInstanceMethod(jig1, 'checkCanCall', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(true)
    })
    it('returns false when jig is owned by another jig', () => {
      const exec = emptyExec()
      const importIdx = exec.importModule(modIdFor('can-lock')).asInstance
      const jig1 = exec.instantiateByClassName(importIdx, 'PublicJig', []).asJig()
      const jig2 = exec.instantiateByClassName(importIdx, 'UserJig', []).asJig()
      exec.instantiateByClassName(importIdx, 'OwnerJig', [jig2]).asJig()
      const methodStmt = exec.callInstanceMethod(jig1, 'checkCanCall', [jig2])
        const res = exec.getStatementResult(methodStmt.idx)

      expect(res.value).to.eql(false)
    })
  });
})
