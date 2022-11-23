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

  it('makes the module available', async () => {
    const vm = new VM(storage)
    const moduleId = await vm.deployCode(someValidModule)

    const tx = new Transaction()
      .add(new NewInstruction('someVar', moduleId, 'Coso', []))
      .add(new LockInstruction('someVar', userAddr))

    const execution = vm.execTx(tx)
    expect(execution.outputs[0].className).to.eql('Coso')
  })

  it('module persist on other vm instance', async () => {
    const vm = new VM(storage)
    const moduleId = await vm.deployCode(someValidModule)

    const tx = new Transaction()
      .add(new NewInstruction('someVar', moduleId, 'Coso', []))
      .add(new LockInstruction('someVar', userAddr))

    const vm2 = new VM(storage)
    const execution = vm2.execTx(tx)
    expect(execution.outputs[0].className).to.eql('Coso')
  })

  it('can deploy same module twice', async () => {
    const vm = new VM(storage)
    const moduleId1 = await vm.deployCode(someValidModule)
    const moduleId2 = await vm.deployCode(someValidModule)

    expect(moduleId1).to.eql(moduleId2)
  })

  it('modules can be pre added from a file', async () => {
    const vm = new VM(storage)
    const moduleId = await vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')

    const tx = new Transaction()
      .add(new NewInstruction('someVar', moduleId, 'Flock', []))
      .add(new LockInstruction('someVar', userAddr))

    const execution = vm.execTx(tx)
    expect(execution.outputs[0].className).to.eql('Flock')
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
      .add(new NewInstruction('someVar', flockId, 'Flock', []))
      .add(new CallInstruction('someVar', 'growWithMath', []))
      .add(new LockInstruction('someVar', userAddr))

    const execution = vm.execTx(tx)
    let jigState = execution.outputs[0].parsedState();
    expect(jigState[0]).to.eql(1)
  })

  it('after a module was deployed the next instance has the module already loaded', () => {
    const vm = new VM(storage)
    vm.addPreCompiled('aldea/basic-math.wasm', 'aldea/basic-math.ts')
    const flockId = vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')

    const anotherVm = new VM(storage)

    const tx = new Transaction()
      .add(new NewInstruction('someVar', flockId, 'Flock', []))
      .add(new CallInstruction('someVar', 'growWithMath', []))
      .add(new LockInstruction('someVar', userAddr))

    const execution = anotherVm.execTx(tx)
    let jigState = execution.outputs[0].parsedState();
    expect(jigState[0]).to.eql(1)
  })
})
