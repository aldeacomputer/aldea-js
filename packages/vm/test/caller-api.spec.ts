import {
  Storage, StubClock,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {base16, Pointer} from "@aldea/sdk-js";
import {ExecutionError} from "../vm/errors.js";
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
    const clock = new StubClock()
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
        const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
        const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
        const sender = exec.instantiateByClassName(pkg, 'RightCaller', []).asJig()
        const resulStmt = exec.callInstanceMethod(sender, 'doTheCall', [receiver])

        expect(exec.getStatementResult(resulStmt.idx).value).to.eql(true)

        exec.lockJigToUser(receiver, userAddr)
        exec.lockJigToUser(sender, userAddr)
        exec.finalize()
      })

      it('returns false when the caller is the right caller', () => {
        const exec = emptyExec()
        const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
        const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
        const sender = exec.instantiateByClassName(pkg, 'AnotherCaller', []).asJig()
        const resultStmt = exec.callInstanceMethod(sender, 'doTheCall', [receiver])

          expect(exec.getStatementResult(resultStmt.idx).value).to.eql(false)

        exec.lockJigToUser(receiver, userAddr)
        exec.lockJigToUser(sender, userAddr)
        exec.finalize()
      })

      it('returns false when the caller is at top level', () => {
        const exec = emptyExec()
        const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
        const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
        const resultStmt = exec.callInstanceMethod(receiver, 'checkCallerType', [])

          expect(exec.getStatementResult(resultStmt.idx).value).to.eql(false)

        exec.lockJigToUser(receiver, userAddr)
        exec.finalize()
      })

      // This case makes no sense with no interfaces
      it('returns true for when an external class is the right one')

      it('returns false when called from subclass', () => {
        const exec = emptyExec()
        const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
        const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
        const sender = exec.instantiateByClassName(pkg, 'SubclassCaller', []).asJig()
        const resultStmt = exec.callInstanceMethod(sender, 'doTheCall', [receiver])

          expect(exec.getStatementResult(resultStmt.idx).value).to.eql(true)

        exec.lockJigToUser(receiver, userAddr)
        exec.lockJigToUser(sender, userAddr)
        exec.finalize()
      })
    });


    describe('when exact is false', () => {
      it('true false when called from subclass', () => {
        const exec = emptyExec()
        const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
        const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
        const sender = exec.instantiateByClassName(pkg, 'SubclassCaller', []).asJig()
        const resultStmt = exec.callInstanceMethod(sender, 'doTheCall', [receiver])

          expect(exec.getStatementResult(resultStmt.idx).value).to.eql(true)

        exec.lockJigToUser(receiver, userAddr)
        exec.lockJigToUser(sender, userAddr)
        exec.finalize()
      })

      it('should return true for subclasses of imported classes') // This again requires interfaces.
    })
  });


  describe('#hasOutput()', () => {
    it('returns false when called from top level', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      const stmt = exec.callInstanceMethod(receiver, 'callerHasOutput', [])

      expect(exec.getStatementResult(stmt.idx).value).to.eql(false)

      exec.lockJigToUser(receiver, userAddr)
      exec.finalize()
    })

    it('returns true when not called from top level', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      const sender = exec.instantiateByClassName(pkg, 'RightCaller', []).asJig()
      const result = exec.callInstanceMethod(sender, 'doIHaveOutput', [receiver])

      expect(exec.getStatementResult(result.idx).value).to.eql(true)

      exec.lockJigToUser(receiver, userAddr)
      exec.lockJigToUser(sender, userAddr)
      exec.finalize()
    })
  })

  describe('#getOutputOrFail()', function () {
    it('returns right output when exists', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiverIdx = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      const sender = exec.instantiateByClassName(pkg, 'RightCaller', []).asJig()
      const result1 = exec.callInstanceMethod(sender, 'giveMeMyOutputOrigin', [receiverIdx])
      const result2 = exec.callInstanceMethod(sender, 'giveMeMyOutputLocation', [receiverIdx])
      const result3 = exec.callInstanceMethod(sender, 'giveMeMyOutputClassPtr', [receiverIdx])

      expect(exec.getStatementResult(result1.idx).value).to.eql(sender.origin.toBytes())
      expect(exec.getStatementResult(result2.idx).value).to.eql(sender.origin.toBytes())
      expect(exec.getStatementResult(result3.idx).value).to.eql(sender.classPtr().toBytes())

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(sender, userAddr)
      exec.finalize()
    })

    it('sends data that makes sense with single getters', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiverIdx = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      const sender = exec.instantiateByClassName(pkg, 'RightCaller', []).asJig()
      const resultStmt = exec.callInstanceMethod(sender, 'checkMyData', [receiverIdx])

      expect(exec.getStatementResult(resultStmt.idx).value).to.eql(true)

      exec.lockJigToUser(receiverIdx, userAddr)
      exec.lockJigToUser(sender, userAddr)
      exec.finalize()
    })

    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      expect(() =>
        exec.callInstanceMethod(receiver, 'returnCallerOutputOrigin', [receiver])
      ).to.throw(ExecutionError)
    })
  });

  describe('#getOriginOrFail', function () {
    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      expect(() =>
        exec.callInstanceMethod(receiver, 'returnCallerOrigin', [receiver])
      ).to.throw(ExecutionError)
    })

    it('returns origin if exists', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      const sender = exec.instantiateByClassName(pkg, 'RightCaller', []).asJig()
      const resultStmt = exec.callInstanceMethod(sender, 'giveMeMyOrigin', [receiver])

      expect(exec.getStatementResult(resultStmt.idx).value).to.eql(
        sender.origin.toBytes()
      )

      exec.lockJigToUser(receiver, userAddr)
      exec.lockJigToUser(sender, userAddr)
      exec.finalize()
    })
  })

  describe('#getLocationOrFail', function () {
    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      expect(() =>
        exec.callInstanceMethod(receiver, 'returnCallerLocation', [receiver])
      ).to.throw(ExecutionError)
    })

    it('returns origin if exists', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      const sender = exec.instantiateByClassName(pkg, 'RightCaller', []).asJig()
      const resultStmt = exec.callInstanceMethod(sender, 'giveMeMyLocation', [receiver])

      expect(exec.getStatementResult(resultStmt.idx).value).to.eql(sender.origin.toBytes())

      exec.lockJigToUser(receiver, userAddr)
      exec.lockJigToUser(sender, userAddr)
      exec.finalize()
    })

    describe('when the origin and location are not the same', () => {
      it('returns the rignt location', () => {
        const prepExec1 = emptyExec()
        const pkg = prepExec1.importModule(modIdFor('caller-test-code')).asInstance
        const sender = prepExec1.instantiateByClassName(pkg, 'RightCaller', []).asJig()
        prepExec1.lockJigToUser(sender, userAddr)
        const result1 = prepExec1.finalize()
        storage.persist(result1)
        const prepExec2 = emptyExec([userPriv])
        const loaded0 = prepExec2.loadJigByOutputId(result1.outputs[0].id()).asJig()
        prepExec2.lockJigToUser(loaded0, userAddr)
        const result2 = prepExec2.finalize()
        storage.persist(result2)

        const exec = emptyExec([userPriv])
        const pkg3 = exec.importModule(modIdFor('caller-test-code')).asInstance
        const loaded = exec.loadJigByOutputId(result2.outputs[0].id()).asJig()
        const receiver = exec.instantiateByClassName(pkg3, 'Receiver', []).asJig()
        const resultStmt = exec.callInstanceMethod(loaded, 'giveMeMyLocation', [receiver])
        const value = exec.getStatementResult(resultStmt.idx).value

        expect(value).to.eql(new Pointer(prepExec2.txContext.tx.hash, 0).toBytes())
        expect(value).not.to.eql(result1.outputs[0].origin.toBytes())

        exec.lockJigToUser(loaded, userAddr)
        exec.lockJigToUser(receiver, userAddr)
        exec.finalize()
      })
    });
  })

  describe('#getClassOrFail', function () {
    it('fails if there is no caller', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      expect(() =>
        exec.callInstanceMethod(receiver, 'returnCallerClassPtr', [receiver])
      ).to.throw(ExecutionError)
    })

    it('returns class ptr if exists', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('caller-test-code')).asInstance
      const receiver = exec.instantiateByClassName(pkg, 'Receiver', []).asJig()
      const sender = exec.instantiateByClassName(pkg, 'RightCaller', []).asJig()
      const resultStmt = exec.callInstanceMethod(sender, 'giveMeMyClassPtr', [receiver])

        expect(exec.getStatementResult(resultStmt.idx).value).to.eql(sender.classPtr().toBytes())

      exec.lockJigToUser(receiver, userAddr)
      exec.lockJigToUser(sender, userAddr)
      exec.finalize()
    })
  })
})
