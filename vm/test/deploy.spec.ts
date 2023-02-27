import {
  Storage, StubClock,
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
import moment from "moment";

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
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()
  const fileName = 'something.ts'
  beforeEach(() => {
    storage = new Storage()
    const clock = new StubClock(moment())
    vm = new VM(storage, clock)
  })

  describe('backdoor deploy', () => {
    const aMap = new Map<string, string>()
    aMap.set(fileName, someValidModule)
    it('makes the module available', async () => {
      const moduleId = await vm.deployCode([fileName], aMap)
      const tx = new Tx()
      const exec = new TxExecution(tx, vm)
      const moduleIndex = exec.importModule(moduleId)
      const jigIndex = exec.instantiateByIndex(moduleIndex, 'Coso', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.markAsFunded()
      const ret = exec.finalize()

      expect(ret.outputs[0].classIdx).to.eql(0)
    })

    it('module persist on other vm instance', async () => {
      const moduleId = await vm.deployCode([fileName], aMap)

      const vm2 = new VM(storage, new StubClock(moment()))
      const tx = new Tx()
      const exec = new TxExecution(tx, vm2)
      const moduleIndex = exec.importModule(moduleId)
      const jigIndex = exec.instantiateByIndex(moduleIndex, 'Coso', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.markAsFunded()
      const ret = exec.finalize()
      expect(ret.outputs[0].classIdx).to.eql(0)
    })

    it('can deploy same module twice', async () => {
      const moduleId1 = await vm.deployCode([fileName], aMap)
      const moduleId2 = await vm.deployCode([fileName], aMap)

      expect(moduleId1).to.eql(moduleId2)
    })
  })

  describe('addPreCompiled', function () {
    it('modules can be pre added from a file', async () => {
      const moduleId = await vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')

      const tx = new Tx()
      const exec = new TxExecution(tx, vm)
      const moduleIndex = exec.importModule(moduleId)
      const jigIndex = exec.instantiateByIndex(moduleIndex, 'Flock', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.markAsFunded()
      const ret = exec.finalize()
      expect(ret.outputs[0].classIdx).to.eql(0)
    })

    it('some pre compiled module can be added twice', async () => {
      const moduleId1 = await vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')
      const moduleId2 = await vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')

      expect(moduleId1).to.eql(moduleId2)
    })

    it('modules can be pre added from a file with dependencies', () => {
      vm.addPreCompiled('aldea/basic-math.wasm', 'aldea/basic-math.ts')
      const flockId = vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')

      const tx = new Tx()
      const exec = new TxExecution(tx, vm)
      const moduleIndex = exec.importModule(flockId)
      const jigIndex = exec.instantiateByIndex(moduleIndex, 'Flock', [])
      exec.callInstanceMethodByIndex(jigIndex, 'growWithMath', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.markAsFunded()
      const ret = exec.finalize()

      let jigState = ret.outputs[0].parsedState();
      expect(jigState[0]).to.eql(1)
    })
  })

  describe('deploy from tx execution', () => {
    it('can use the deployed module in the same tx', async () => {
      const tx = new Tx()
      const exec = new TxExecution(tx, vm)
      const sources = new Map<string, string>()
      sources.set(fileName, someValidModule)
      const moduleIndex = await exec.deployModule([fileName],  sources)
      const jigIndex = exec.instantiateByIndex(moduleIndex, 'Coso', [])
      exec.lockJigToUser(jigIndex, userAddr)
      exec.markAsFunded()
      const ret = exec.finalize()

      expect(ret.outputs[0].classIdx).to.eql(0)
    })

    it.skip('can deploy more than 1 file', async () => {
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
      const jig1Index = exec.instantiateByIndex(moduleIndex, 'Coso', [])
      const jig2Index = exec.instantiateByIndex(moduleIndex, 'Something', [])
      exec.lockJigToUser(jig1Index, userAddr)
      exec.lockJigToUser(jig2Index, userAddr)
      const ret = exec.finalize()

      expect(ret.outputs[0].classIdx).to.eql('Coso')
    })

    it('adds the module on the right result index', async () => {
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
