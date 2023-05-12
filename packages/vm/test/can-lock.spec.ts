import {
  Storage,
  VM
} from '../src/index.js'
import {expect} from 'chai'
import {emptyExecFactoryFactory, buildVm} from "./util.js";
import {PrivKey} from "@aldea/core";

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()

  let modIdFor: (key: string) => Uint8Array

  beforeEach(() => {
    const data = buildVm(['can-lock'])
    storage = data.storage
    vm = data.vm
    modIdFor = data.modIdFor
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
