import {
  Storage,
  VM
} from
    '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {
  Tx
} from '@aldea/sdk-js'
import {TxExecution} from "../vm/tx-execution.js";
import {calculatePackageId} from "../vm/calculate-package-id.js";

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
  const fileName = 'something.ts'
  beforeEach(() => {
    storage = new Storage()
  })

  describe('backdoor deploy', () => {
    const aMap = new Map<string, string>()
    aMap.set(fileName, someValidModule)
    it('makes the module available', async () => {
      const vm = new VM(storage)
      const moduleId = await vm.deployCode([fileName], aMap)

      const tx = new Tx()
      const exec = new TxExecution(tx, vm)
      const moduleIndex = exec.importModule(moduleId)
      const jigIndex = exec.instantiate(moduleIndex, 'Coso', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.finalize()

      expect(exec.outputs[0].className).to.eql('Coso')
    })

    it('module persist on other vm instance', async () => {
      const vm = new VM(storage)
      const moduleId = await vm.deployCode([fileName], aMap)

      const vm2 = new VM(storage)
      const tx = new Tx()
      const exec = new TxExecution(tx, vm2)
      const moduleIndex = exec.importModule(moduleId)
      const jigIndex = exec.instantiate(moduleIndex, 'Coso', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.finalize()
      expect(exec.outputs[0].className).to.eql('Coso')
    })

    it('can deploy same module twice', async () => {
      const vm = new VM(storage)
      const moduleId1 = await vm.deployCode([fileName], aMap)
      const moduleId2 = await vm.deployCode([fileName], aMap)

      expect(moduleId1).to.eql(moduleId2)
    })
  })

  describe('addPreCompiled', function () {
    it('modules can be pre added from a file', async () => {
      const vm = new VM(storage)
      const moduleId = await vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')

      const tx = new Tx()
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

      const tx = new Tx()
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

      const tx = new Tx()
      const exec = new TxExecution(tx, vm)
      const sources = new Map<string, string>()
      sources.set(fileName, someValidModule)
      const moduleIndex = await exec.deployModule([fileName],  sources)
      const jigIndex = exec.instantiate(moduleIndex, 'Coso', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.finalize()

      expect(exec.outputs[0].className).to.eql('Coso')
    })

    it.skip('can deploy more than 1 file', async () => {
      const vm = new VM(storage)

      const tx = new Tx()
      const exec = new TxExecution(tx, vm)
      const sources = new Map<string, string>()
      sources.set(fileName, someValidModule)
      sources.set(fileName, `
        export { Coso } from 'coso.ts'
        export class Something extends Jig {
          constructor () { super() } 
          foo(): string { return 'holu' }
        } 
      `)
      const moduleIndex = await exec.deployModule([fileName],  sources)
      const jig1Index = exec.instantiate(moduleIndex, 'Coso', [])
      const jig2Index = exec.instantiate(moduleIndex, 'Something', [])
      exec.lockJigToUser(jig1Index, userAddr)
      exec.lockJigToUser(jig2Index, userAddr)
      exec.finalize()

      expect(exec.outputs[0].className).to.eql('Coso')
    })

    it('adds the module on the right result index', async () => {
      const vm = new VM(storage)

      const tx = new Tx()
      const exec = new TxExecution(tx, vm)
      const sources = new Map<string, string>()
      sources.set(fileName, someValidModule)
      const moduleIndex = await exec.deployModule([fileName], sources)
      const result = exec.getStatementResult(moduleIndex)

      const packageId = calculatePackageId([fileName], sources)

      expect(result.instance.id).to.eql(packageId)
    })
  });
})
