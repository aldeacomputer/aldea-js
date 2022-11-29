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
    it('makes the module available', async () => {
      const vm = new VM(storage)
      const moduleId = await vm.deployCode(someValidModule)

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
      const moduleId = await vm.deployCode(someValidModule)

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
      const moduleId1 = await vm.deployCode(someValidModule)
      const moduleId2 = await vm.deployCode(someValidModule)

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
  });
})
