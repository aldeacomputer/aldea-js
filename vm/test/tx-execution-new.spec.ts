import {Transaction} from '../vm/transaction.js'
import {
  Storage,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxExecution} from "../vm/tx-execution.js";

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()
  const moduleIds = new Map<string, string>()

  function modIdFor (key: string): string {
    const id = moduleIds.get(key)
    if (!id) {
      throw new Error(`module was not deployed: ${key}`)
    }
    return id
  }

  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage)

    const sources = [
      'basic-math',
      'flock',
      'nft',
      'remote-control',
      'sheep-counter',
      'tv',
      'weapon',
      'forever-counter'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, id)
    })
  })

  let exec: TxExecution
  beforeEach(() => {
    const tx = new Transaction()
    exec = new TxExecution(tx, vm)
  })

  it('creates instances from imported modules', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const instanceIndex = exec.instantiate(importIndex, 'Flock', [0])
    exec.lockJigToUser(instanceIndex, userAddr)
    exec.finalize()

    const output = exec.outputs[0]
    expect(output.moduleId).to.eql(modIdFor('flock'))
    expect(output.className).to.eql('Flock')
  })

  it('sends arguments to constructor properly.', () => {
    const moduleIndex = exec.importModule(modIdFor('weapon')) // index 0
    const weaponIndex = exec.instantiate(moduleIndex, 'Weapon', ['Sable Corvo de San Martín', 100000]) // index 1
    exec.lockJigToUser(weaponIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[0].objectState(exec.getImportedModule(moduleIndex))
    expect(parsed.name).to.eql('Sable Corvo de San Martín')
    expect(parsed.power).to.eql(100000)
  })

  it('can call methods on jigs', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiate(importIndex, 'Flock', [])
    exec.callInstanceMethodByIndex(flockIndex, 'grow', [])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1) // grow effect
  })

  it('can make calls on jigs sending basic parameters', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiate(importIndex, 'Flock', [])
    exec.callInstanceMethodByIndex(flockIndex, 'growMany', [7])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(7) // growMany effect
  })

  it('can make calls on jigs sending jigs as parameters', () => {
    const flockWasmIndex = exec.importModule(modIdFor('flock'))
    const counterWasmIndex = exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiate(flockWasmIndex, 'Flock', [])
    const counterIndex = exec.instantiate(counterWasmIndex, 'SheepCounter', [])
    const jig = exec.getStatementResult(flockIndex)
    exec.callInstanceMethodByIndex(flockIndex, 'grow', [])
    exec.callInstanceMethodByIndex(counterIndex, 'countFlock', [jig.asJig()])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.lockJigToUser(counterIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[1].objectState(exec.getImportedModule(counterWasmIndex))
    expect(parsed.sheepCount).to.eql(1)
    expect(parsed.legCount).to.eql(4)
  })
})
