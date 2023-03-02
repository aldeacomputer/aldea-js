import {
  Storage, StubClock,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {base16, ref, Pointer} from "@aldea/sdk-js";
import {ExecutionError} from "../vm/errors.js";
import moment from "moment";
import {emptyExecFactoryFactory} from "./util.js";

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
    const clock = new StubClock(moment())
    vm = new VM(storage, clock)

    const sources = [
      'caller-test-code'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  const emptyExec = emptyExecFactoryFactory(() => storage, () => vm)

  describe('#is<T>', function () {
    describe('when exact is true', function () {
      it('returns true when the caller is the right caller', () => {
        const exec = emptyExec()
        const modIdx = exec.importModule(modIdFor('caller-test-code'))
        const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
        const senderIdx = exec.instantiateByIndex(modIdx, 'RightCaller', [])
        const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'doTheCall', [ref(receiverIdx)])

        expect(exec.getStatementResult(resultIdx).value).to.eql(true)

        exec.lockJigToUser(receiverIdx, userAddr)
        exec.lockJigToUser(senderIdx, userAddr)
        exec.finalize()
      })

      it('returns false when the caller is the right caller', () => {
        const exec = emptyExec()
        const modIdx = exec.importModule(modIdFor('caller-test-code'))
        const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
        const senderIdx = exec.instantiateByIndex(modIdx, 'AnotherCaller', [])
        const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'doTheCall', [ref(receiverIdx)])

        expect(exec.getStatementResult(resultIdx).value).to.eql(false)

        exec.lockJigToUser(receiverIdx, userAddr)
        exec.lockJigToUser(senderIdx, userAddr)
        exec.finalize()
      })

      it('returns false when the caller is at top level', () => {
        const exec = emptyExec()
        const modIdx = exec.importModule(modIdFor('caller-test-code'))
        const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
        const resultIdx = exec.callInstanceMethodByIndex(receiverIdx, 'checkCallerType', [])

        expect(exec.getStatementResult(resultIdx).value).to.eql(false)

        exec.lockJigToUser(receiverIdx, userAddr)
        exec.finalize()
      })

      // This case makes no sense with no interfaces
      it('returns true for when an external class is the right one')

      it('returns false when called from subclass', () => {
        const exec = emptyExec()
        const modIdx = exec.importModule(modIdFor('caller-test-code'))
        const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
        const senderIdx = exec.instantiateByIndex(modIdx, 'SubclassCaller', [])
        const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'doTheCall', [ref(receiverIdx)])

        expect(exec.getStatementResult(resultIdx).value).to.eql(true)

        exec.lockJigToUser(receiverIdx, userAddr)
        exec.lockJigToUser(senderIdx, userAddr)
        exec.finalize()
      })
    });


    describe('when exact is false', () => {
      it('true false when called from subclass', () => {
        const exec = emptyExec()
        const modIdx = exec.importModule(modIdFor('caller-test-code'))
        const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
        const senderIdx = exec.instantiateByIndex(modIdx, 'SubclassCaller', [])
        const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'doTheCall', [ref(receiverIdx)])

        expect(exec.getStatementResult(resultIdx).value).to.eql(true)

        exec.lockJigToUser(receiverIdx, userAddr)
        exec.lockJigToUser(senderIdx, userAddr)
        exec.finalize()
      })

      it('should return true for subclasses of imported classes') // This again requires interfaces.
    })
  });


  describe('#hasOutput()', () => {
    it('returns false when called from top level', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      const resultIdx = exec.callInstanceMethodByIndex(receiverIdx, 'callerHasOutput', [])

      expect(exec.getStatementResult(resultIdx).value).to.eql(false)

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.finalize()
    })

    it('returns true when not called from top level', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiateByIndex(modIdx, 'RightCaller', [])
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
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiateByIndex(modIdx, 'RightCaller', [])
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
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiateByIndex(modIdx, 'RightCaller', [])
      const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'checkMyData', [ref(receiverIdx)])

      expect(exec.getStatementResult(resultIdx).value).to.eql(true)

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })

    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      expect(() =>
        exec.callInstanceMethodByIndex(receiverIdx, 'returnCallerOutputOrigin', [ref(receiverIdx)])
      ).to.throw(ExecutionError)
    })
  });

  describe('#getOriginOrFail', function () {
    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      expect(() =>
        exec.callInstanceMethodByIndex(receiverIdx, 'returnCallerOrigin', [ref(receiverIdx)])
      ).to.throw(ExecutionError)
    })

    it('returns origin if exists', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiateByIndex(modIdx, 'RightCaller', [])
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
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      expect(() =>
        exec.callInstanceMethodByIndex(receiverIdx, 'returnCallerLocation', [ref(receiverIdx)])
      ).to.throw(ExecutionError)
    })

    it('returns origin if exists', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiateByIndex(modIdx, 'RightCaller', [])
      const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'giveMeMyLocation', [ref(receiverIdx)])

      expect(exec.getStatementResult(resultIdx).value).to.eql(exec.getStatementResult(senderIdx).asJig().origin.toBytes())

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })

    describe('when the origin and location are not the same', () => {
      it('returns the rignt location', () => {
        const prepExec1 = emptyExec()
        const modIdx = prepExec1.importModule(modIdFor('caller-test-code'))
        const senderIdx = prepExec1.instantiateByIndex(modIdx, 'RightCaller', [])
        prepExec1.lockJigToUser(senderIdx, userAddr)
        const result1 = prepExec1.finalize()
        storage.persist(result1)
        const prepExec2 = emptyExec([userPriv])
        const loadedIdx0 = prepExec2.loadJigByOutputId(result1.outputs[0].id())
        prepExec2.lockJigToUser(loadedIdx0, userAddr)
        const result2 = prepExec2.finalize()
        storage.persist(result2)

        const exec = emptyExec([userPriv])
        const modIdx3 = exec.importModule(modIdFor('caller-test-code'))
        const loadedIdx = exec.loadJigByOutputId(result2.outputs[0].id())
        const receiverIdx = exec.instantiateByIndex(modIdx3, 'Receiver', [])
        const resultIdx = exec.callInstanceMethodByIndex(loadedIdx, 'giveMeMyLocation', [ref(receiverIdx)])
        const value = exec.getStatementResult(resultIdx).value

        expect(value).to.eql(new Pointer(prepExec2.txContext.tx.hash, 0).toBytes())
        expect(value).not.to.eql(result1.outputs[0].origin.toBytes())

        exec.lockJigToUser(loadedIdx, userAddr)
        exec.lockJigToUser(receiverIdx, userAddr)
        exec.finalize()
      })
    });
  })

  describe('#getClassOrFail', function () {
    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      expect(() =>
        exec.callInstanceMethodByIndex(receiverIdx, 'returnCallerClassPtr', [ref(receiverIdx)])
      ).to.throw(ExecutionError)
    })

    it('returns class ptr if exists', () => {
      const exec = emptyExec()
      const modIdx = exec.importModule(modIdFor('caller-test-code'))
      const receiverIdx = exec.instantiateByIndex(modIdx, 'Receiver', [])
      const senderIdx = exec.instantiateByIndex(modIdx, 'RightCaller', [])
      const resultIdx = exec.callInstanceMethodByIndex(senderIdx, 'giveMeMyClassPtr', [ref(receiverIdx)])

      expect(exec.getStatementResult(resultIdx).value).to.eql(exec.getStatementResult(senderIdx).asJig().classPtr().toBytes())

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(senderIdx, userAddr)
      exec.finalize()
    })
  })
})
