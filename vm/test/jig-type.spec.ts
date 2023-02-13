import {Storage, VM} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxExecution} from "../vm/tx-execution.js";
import {base16, Tx} from "@aldea/sdk-js";
import {TxBuilder} from "./tx-builder.js";
import {JigRef} from "../vm/jig-ref.js";

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
    vm = new VM(storage)

    const sources = [
      'jig-type-bearer',
      'flock'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  let jigBearerModuleIndex: number
  let flockModuleIndex: number
  let flockIndex: number
  let jig: JigRef

  let exec: TxExecution
  beforeEach(() => {
    const tx = new Tx()
    exec = new TxExecution(tx, vm)
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
    exec.finalize()

    const flockOutput = exec.outputs[0]
    const parsed = exec.outputs[1].parsedState()
    expect(parsed[0]).to.eql(flockOutput.origin.toBytes())
  })

  it('can make calls on methods returning jig typed parameters', () => {
    const jigBearerIndex = exec.instantiateByIndex(jigBearerModuleIndex, 'JigTypeBearer', [jig]) // index 1
    const returnedJig = exec.getStatementResult(exec.callInstanceMethodByIndex(jigBearerIndex, 'getJig', [])).asJig()
    exec.lockJigToUser(jigBearerIndex, userAddr)
    exec.lockJigToUser(flockIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[1].parsedState()
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
    exec.finalize()

    const flockOutput = exec.outputs[0]
    const anotherFlockOutput = exec.outputs[1]
    const parsed = exec.outputs[2].parsedState()
    expect(parsed[0]).to.not.eql(flockOutput.origin.toBytes()) // Remove
    expect(parsed[0]).to.eql(anotherFlockOutput.origin.toBytes())
  })

  it('can restore jigs that contain jigs of the same package', () => {
    const jigBearerIndex = exec.instantiateByIndex(jigBearerModuleIndex, 'JigTypeBearer', [jig]) // index 1
    exec.lockJigToUser(jigBearerIndex, userAddr)
    exec.lockJigToUser(flockIndex, userAddr)
    exec.finalize()

    storage.persist(exec)

    const tx2 = new TxBuilder()
      .sign(userPriv)
      .build()

    const exec2 = new TxExecution(tx2, vm)

    const jigBearerIndexFromOutside = exec2.loadJigByOutputId(exec.outputs[1].id())
    const returnedJigIndex = exec2.callInstanceMethodByIndex(jigBearerIndexFromOutside, 'getJig', [])
    exec2.callInstanceMethodByIndex(returnedJigIndex, 'grow', [])
    exec2.lockJigToUser(jigBearerIndexFromOutside, userAddr)
    exec2.lockJigToUser(returnedJigIndex, userAddr)
    exec2.markAsFunded()
    exec2.finalize()

    const parsedFlock = exec2.outputs[0].parsedState()
    expect(parsedFlock[0]).to.eql(1)
  })

  it.skip('can restore jigs that contain jigs of the same package with the expected type name', () => {
    const jigBearerIndex = exec.instantiateByIndex(jigBearerModuleIndex, 'JigTypeBearer', [jig]) // index 1
    exec.lockJigToUser(jigBearerIndex, userAddr)
    exec.lockJigToUser(flockIndex, userAddr)
    exec.finalize()

    storage.persist(exec)

    const tx2 = new TxBuilder()
      .sign(userPriv)
      .build()

    const exec2 = new TxExecution(tx2, vm)

    const jigBearerIndexFromOutside = exec2.loadJigByOutputId(exec.outputs[1].id())
    const returnedJigIndex = exec2.callInstanceMethodByIndex(jigBearerIndexFromOutside, 'getJig', [])
    exec2.callInstanceMethodByIndex(returnedJigIndex, 'grow', [])
    exec2.lockJigToUser(jigBearerIndexFromOutside, userAddr)
    exec2.lockJigToUser(returnedJigIndex, userAddr)
    exec2.markAsFunded()
    exec2.finalize()

    const parsedJigBearer = exec2.outputs[1].parsedState()
    expect(parsedJigBearer[0].name).to.eql('Flock')
  })
})
