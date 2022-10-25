import {
  Storage,
  VM
} from
    '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {locationF} from '../vm/location.js'
import {
  CallInstruction,
  LoadInstruction,
  LockInstruction,
  NewInstruction,
  Signature,
  NumberArg,
  StringArg,
  ExecInstruction,
  PrivKey,
  BufferArg, Transaction
} from '@aldea/sdk-js'

const someValidModule = `
export class Coso {
  prop1: string;
  constructor () {
    this.prop1 = 'foo'
  }
}
`

describe('deploy code', () => {
  let storage: Storage
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  beforeEach(() => {
    storage = new Storage()
  })

  it('makes the module available', async () => {
    const vm = new VM(storage)
    const moduleId = await vm.deployCode(someValidModule)

    const tx = new Transaction()
      .add(new NewInstruction('someVar', moduleId, 'Coso', []))
      .add(new LockInstruction('someVar', userPub))

    const execution = vm.execTx(tx)
    expect(execution.outputs[0].className).to.eql('Coso')
  })

  it('modules can be pre added from a file', async () => {
    const vm = new VM(storage)
    const moduleId = await vm.addPreCompiled('aldea/flock.wasm')

    const tx = new Transaction()
      .add(new NewInstruction('someVar', moduleId, 'Flock', []))
      .add(new LockInstruction('someVar', userPub))

    const execution = vm.execTx(tx)
    expect(execution.outputs[0].className).to.eql('Coso')
  })

  // it('can set auth to pubkey over self', () => {
  // })

})
