import {
  Storage,
  VM
} from
    '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {
  CallInstruction,
  LockInstruction,
  NewInstruction,
  Transaction
} from '@aldea/sdk-js'
import {TxExecution} from "../vm/tx-execution.js";

const someValidModule = `
export class Coso extends Jig {
  prop1: string;
  constructor () {
    super()
    this.prop1 = 'foo'
  }
}
`

describe('deploy code', () => {
  let storage: Storage
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()
  beforeEach(() => {
    storage = new Storage()
  })

  describe('backdoor deploy', () => {
    const aMap = new Map<string, string>()
    aMap.set('coso.ts', someValidModule)
    it('makes the module available', async () => {
      const vm = new VM(storage)
      const moduleId = await vm.deployCode('coso.ts', aMap)

      const tx = new Transaction()
      const exec = new TxExecution(tx, vm)
      const moduleIndex = exec.importModule(moduleId)
      const jigIndex = exec.instantiate(moduleIndex, 'Coso', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.finalize()

      expect(exec.outputs[0].className).to.eql('Coso')
    })

    it('module persist on other vm instance', async () => {
      const vm = new VM(storage)
      const moduleId = await vm.deployCode('coso.ts', aMap)

      const vm2 = new VM(storage)
      const tx = new Transaction()
      const exec = new TxExecution(tx, vm2)
      const moduleIndex = exec.importModule(moduleId)
      const jigIndex = exec.instantiate(moduleIndex, 'Coso', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.finalize()
      expect(exec.outputs[0].className).to.eql('Coso')
    })

    it('can deploy same module twice', async () => {
      const vm = new VM(storage)
      const moduleId1 = await vm.deployCode('coso.ts', aMap)
      const moduleId2 = await vm.deployCode('coso.ts', aMap)

      expect(moduleId1).to.eql(moduleId2)
    })
  })

  describe('addPreCompiled', function () {
    it('modules can be pre added from a file', async () => {
      const vm = new VM(storage)
      const moduleId = await vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')

      const tx = new Transaction()
      const exec = new TxExecution(tx, vm)
      const moduleIndex = exec.importModule(moduleId)
      const jigIndex = exec.instantiate(moduleIndex, 'Flock', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.finalize()
      expect(exec.outputs[0].className).to.eql('Flock')
    })

    it('some pre compiled module can be added twice', async () => {
      const vm = new VM(storage)
      const moduleId1 = await vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')
      const moduleId2 = await vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')

      expect(moduleId1).to.eql(moduleId2)
    })

    it('modules can be pre added from a file with dependencies', () => {
      const vm = new VM(storage)
      vm.addPreCompiled('aldea/basic-math.wasm', 'aldea/basic-math.ts')
      const flockId = vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')

      const tx = new Transaction()
      const execution = new TxExecution(tx, vm)
      const moduleIndex = execution.importModule(flockId)
      const jigIndex = execution.instantiate(moduleIndex, 'Flock', [])
      execution.callInstanceMethodByIndex(jigIndex, 'growWithMath', [])
      execution.lockJigToUser(jigIndex, userAddr)
      execution.finalize()

      let jigState = execution.outputs[0].parsedState();
      expect(jigState[0]).to.eql(1)
    })
  })

  describe('deploy from tx execution', () => {
    it('can use the deployed module in the same tx', async () => {
      const vm = new VM(storage)

      const tx = new Transaction()
      const exec = new TxExecution(tx, vm)
      const sources = new Map<string, string>()
      sources.set('coso.ts', someValidModule)
      const moduleIndex = await exec.deployModule('coso.ts',  sources)
      const jigIndex = exec.instantiate(moduleIndex, 'Coso', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.finalize()

      expect(exec.outputs[0].className).to.eql('Coso')
    })

    it('can deploy more than 1 file', async () => {
      const vm = new VM(storage)

      const tx = new Transaction()
      const exec = new TxExecution(tx, vm)
      const sources = new Map<string, string>()
      sources.set('coso.ts', someValidModule)
      sources.set('something.ts', `
        export class Something extends Jig {
          constructor () { super() } 
          foo(): string { return 'bar' }
        }
      `)
      const moduleIndex = await exec.deployModule('coso.ts',  sources)
      const jig1Index = exec.instantiate(moduleIndex, 'Coso', [])
      const jig2Index = exec.instantiate(moduleIndex, 'Something', [])
      exec.lockJigToUser(jig1Index, userAddr)
      exec.lockJigToUser(jig2Index, userAddr)
      exec.finalize()

      expect(exec.outputs[0].className).to.eql('Coso')
    })

    it('adds the module on the right result index', async () => {
      const vm = new VM(storage)

      const tx = new Transaction()
      const exec = new TxExecution(tx, vm)
      const sources = new Map<string, string>()
      sources.set('coso.ts', someValidModule)
      const moduleIndex = await exec.deployModule('coso.ts',  sources)
      const result = exec.getStatementResult(moduleIndex)

      expect(result.instance.id).to.eql('4a94ec70e9f07753b7667c3daa161be5d7b06236889036a552a19bf2adc58f72')
    })
  });
})
