import {
  Storage,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxExecution} from "../vm/tx-execution.js";
import {base16, ref, Tx} from "@aldea/sdk-js";
import {ExecutionError} from "../vm/errors.js";

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const moduleIds = new Map<string, string>()
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()

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
      'caller-test-code'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  function emptyExec (): TxExecution {
    const tx = new Tx()
    const exec = new TxExecution(tx, vm)
    exec.markAsFunded()
    return exec
  }


  describe('#is<T>', function () {
    it('returns true when the caller is the right caller', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiate(modIdx, 'RightCaller', [])
      const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'doTheCall', [ref(receiverIdx)])

      expect(exec.getStatementResult(resultIdx).value).to.eql(true)

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })

    it('returns false when the caller is the right caller', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiate(modIdx, 'AnotherCaller', [])
      const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'doTheCall', [ref(receiverIdx)])

      expect(exec.getStatementResult(resultIdx).value).to.eql(false)

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })

    it('returns false when the caller is at top level', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      const resultIdx = exec.callInstanceMethodByIndex(receiverIdx, 'checkCallerType', [])

      expect(exec.getStatementResult(resultIdx).value).to.eql(false)

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.finalize()
    })

    // This case makes no sense with no interfaces
    it.skip('returns true for when an external class is the right one', () => {

    })
  });


  describe('#hasOutput()', () => {
    it('returns false when called from top level', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      const resultIdx = exec.callInstanceMethodByIndex(receiverIdx, 'callerHasOutput', [])

      expect(exec.getStatementResult(resultIdx).value).to.eql(false)

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.finalize()
    })

    it('returns true when not called from top level', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiate(modIdx, 'RightCaller', [])
      const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'doIHaveOutput', [ref(receiverIdx)])

      expect(exec.getStatementResult(resultIdx).value).to.eql(true)

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })
  })

  describe('#getOutputOrFail()', function () {
    it('returns right output when exists', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiate(modIdx, 'RightCaller', [])
      const result1Idx = exec.callInstanceMethodByIndex(senderIdx, 'giveMeMyOutputOrigin', [ref(receiverIdx)])
      const result2Idx = exec.callInstanceMethodByIndex(senderIdx, 'giveMeMyOutputLocation', [ref(receiverIdx)])
      const result3Idx = exec.callInstanceMethodByIndex(senderIdx, 'giveMeMyOutputClassPtr', [ref(receiverIdx)])

      expect(exec.getStatementResult(result1Idx).value).to.eql(exec.getStatementResult(senderIdx).asJig().origin.toBytes())
      expect(exec.getStatementResult(result2Idx).value).to.eql(exec.getStatementResult(senderIdx).asJig().origin.toBytes())
      expect(exec.getStatementResult(result3Idx).value).to.eql(exec.getStatementResult(senderIdx).asJig().classPtr().toBytes())

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })

    it('sends data that makes sense with single getters', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiate(modIdx, 'RightCaller', [])
      const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'checkMyData', [ref(receiverIdx)])

      expect(exec.getStatementResult(resultIdx).value).to.eql(true)

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })

    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      expect(() =>
        exec.callInstanceMethodByIndex(receiverIdx, 'returnCallerOutputOrigin', [ref(receiverIdx)])
      ).to.throw(ExecutionError)
    })
  });

  describe('#getOriginOrFail', function () {
    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      expect(() =>
        exec.callInstanceMethodByIndex(receiverIdx, 'returnCallerOrigin', [ref(receiverIdx)])
      ).to.throw(ExecutionError)
    })

    it('returns origin if exists', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiate(modIdx, 'RightCaller', [])
      const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'giveMeMyOrigin', [ref(receiverIdx)])

      expect(exec.getStatementResult(resultIdx).value).to.eql(exec.getStatementResult(senderIdx).asJig().origin.toBytes())

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })
  })

  describe('#getLocationOrFail', function () {
    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      expect(() =>
        exec.callInstanceMethodByIndex(receiverIdx, 'returnCallerLocation', [ref(receiverIdx)])
      ).to.throw(ExecutionError)
    })

    it('returns origin if exists', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiate(modIdx, 'RightCaller', [])
      const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'giveMeMyLocation', [ref(receiverIdx)])

      expect(exec.getStatementResult(resultIdx).value).to.eql(exec.getStatementResult(senderIdx).asJig().origin.toBytes())

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })
  })

  describe('#getClassOrFail', function () {
    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      expect(() =>
        exec.callInstanceMethodByIndex(receiverIdx, 'returnCallerClassPtr', [ref(receiverIdx)])
      ).to.throw(ExecutionError)
    })

    it('returns class ptr if exists', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiate(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiate(modIdx, 'RightCaller', [])
      const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'giveMeMyClassPtr', [ref(receiverIdx)])

      expect(exec.getStatementResult(resultIdx).value).to.eql(exec.getStatementResult(senderIdx).asJig().classPtr().toBytes())

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })
  })
})
