import {Storage, StubClock, VM} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxExecution} from "../vm/tx-execution.js";
import {base16} from "@aldea/sdk-js";
import {JigRef} from "../vm/jig-ref.js";
import moment from "moment";
import {emptyExecFactoryFactory} from "./util.js";

describe('Jig Type', () => {
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
    const clock = new StubClock(moment())
    vm = new VM(storage, clock)

    const sources = [
      'jig-type-bearer',
      'flock'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  const emptyTx = emptyExecFactoryFactory(() => storage, () => vm)

  let jigBearerModuleIndex: number
  let flockModuleIndex: number
  let flockIndex: number
  let jig: JigRef

  let exec: TxExecution
  beforeEach(() => {
    exec = emptyTx()
    exec.markAsFunded()
    jigBearerModuleIndex = exec.importModule(modIdFor('jig-type-bearer')) // index 0
    flockModuleIndex = exec.importModule(modIdFor('flock'))
    flockIndex = exec.instantiateByIndex(flockModuleIndex, 'Flock', [])
    jig = exec.getStatementResult(flockIndex).asJig()
  })

  it('can create instances by sending jig typed arguments to constructor properly.', () => {
    const jigBearerIndex = exec.instantiateByIndex(jigBearerModuleIndex, 'JigTypeBearer', [jig]) // index 1
    exec.lockJigToUser(jigBearerIndex, userAddr)
    exec.lockJigToUser(flockIndex, userAddr)
    const ret = exec.finalize()

    const flockOutput = ret.outputs[0]
    const parsed = ret.outputs[1].parsedState()
    expect(parsed[0]).to.eql(flockOutput.origin.toBytes())
  })

  it('can make calls on methods returning jig typed parameters', () => {
    const jigBearerIndex = exec.instantiateByIndex(jigBearerModuleIndex, 'JigTypeBearer', [jig]) // index 1
    const returnedJig = exec.getStatementResult(exec.callInstanceMethodByIndex(jigBearerIndex, 'getJig', [])).asJig()
    exec.lockJigToUser(jigBearerIndex, userAddr)
    exec.lockJigToUser(flockIndex, userAddr)
    const ret = exec.finalize()

    const parsed = ret.outputs[1].parsedState()
    expect(parsed[0]).to.eql(returnedJig.origin.toBytes())
  })

  it('can make calls on jigs sending jig typed parameters', () => {
    const anotherFlockIndex = exec.instantiateByIndex(flockModuleIndex, 'Flock', [])
    const anotherJig = exec.getStatementResult(anotherFlockIndex).asJig()

    const jigBearerIndex = exec.instantiateByIndex(jigBearerModuleIndex, 'JigTypeBearer', [jig]) // index 1
    exec.callInstanceMethodByIndex(jigBearerIndex, 'setJig', [anotherJig])

    exec.lockJigToUser(jigBearerIndex, userAddr)
    exec.lockJigToUser(flockIndex, userAddr)
    exec.lockJigToUser(anotherFlockIndex, userAddr)
    const ret = exec.finalize()

    const flockOutput = ret.outputs[0]
    const anotherFlockOutput = ret.outputs[1]
    const parsed = ret.outputs[2].parsedState()
    expect(parsed[0]).to.not.eql(flockOutput.origin.toBytes()) // Remove
    expect(parsed[0]).to.eql(anotherFlockOutput.origin.toBytes())
  })

  it('can restore jigs that contain jigs of the same package', () => {
    const jigBearerIndex = exec.instantiateByIndex(jigBearerModuleIndex, 'JigTypeBearer', [jig]) // index 1
    exec.lockJigToUser(jigBearerIndex, userAddr)
    exec.lockJigToUser(flockIndex, userAddr)
    const ret1 = exec.finalize()

    storage.persist(ret1)

    const exec2 = emptyTx([userPriv])

    const jigBearerIndexFromOutside = exec2.loadJigByOutputId(ret1.outputs[1].id())
    const returnedJigIndex = exec2.callInstanceMethodByIndex(jigBearerIndexFromOutside, 'getJig', [])
    exec2.callInstanceMethodByIndex(returnedJigIndex, 'grow', [])
    exec2.lockJigToUser(jigBearerIndexFromOutside, userAddr)
    exec2.lockJigToUser(returnedJigIndex, userAddr)
    exec2.markAsFunded()
    const ret2 = exec2.finalize()

    const parsedFlock = ret2.outputs[0].parsedState()
    expect(parsedFlock[0]).to.eql(1)
  })

  it('can restore jigs that contain jigs of the same package with the expected type name', () => {
    const jigBearerIndex = exec.instantiateByIndex(jigBearerModuleIndex, 'JigTypeBearer', [jig]) // index 1
    exec.lockJigToUser(jigBearerIndex, userAddr)
    exec.lockJigToUser(flockIndex, userAddr)
    const ret1 = exec.finalize()

    storage.persist(ret1)

    const exec2 = emptyTx([userPriv])

    const jigBearerIndexFromOutside = exec2.loadJigByOutputId(ret1.outputs[1].id())
    const returnedJigIndex = exec2.callInstanceMethodByIndex(jigBearerIndexFromOutside, 'getJig', [])
    exec2.callInstanceMethodByIndex(returnedJigIndex, 'grow', [])
    exec2.lockJigToUser(jigBearerIndexFromOutside, userAddr)
    exec2.lockJigToUser(returnedJigIndex, userAddr)
    exec2.markAsFunded()
    const ret2 = exec2.finalize()

    const parsedJigBearer = ret2.outputs[1].parsedState()
    expect(parsedJigBearer[0]).to.eql(ret2.outputs[0].origin.toBytes())
  })
})
