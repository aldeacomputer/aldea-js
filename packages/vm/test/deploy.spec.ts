import {Storage, StubClock, VM} from '../src/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from '../src/aldea-crypto.js';
import {calculatePackageId} from '../src/index.js';
import {addPreCompiled, emptyExecFactoryFactory} from "./util.js";
import {compile} from "@aldea/compiler";

const someValidModule = `
export class Foo extends Jig {
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
  const clock = new StubClock()
  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage, clock, compile)
  })


  const emptyExec = emptyExecFactoryFactory(() => storage, () => vm)

  describe('backdoor deploy', () => {
    const aMap = new Map<string, string>()
    aMap.set(fileName, someValidModule)
    it('makes the module available', async () => {
      const pkgData = await vm.compileSources([fileName], aMap)
      storage.addPackage(pkgData.id, pkgData)
      const pkgId = pkgData.id
      const exec = emptyExec()
      const wasm = exec.importModule(pkgId).asInstance
      const jig = exec.instantiateByClassName(wasm, 'Foo', []).asJig()
      exec.lockJigToUser(jig, userAddr)
      exec.markAsFunded()
      const ret = exec.finalize()

      expect(ret.outputs[0].classIdx).to.eql(0)
    })

    it('module persist on other src instance', async () => {
      const pkgData = await vm.compileSources([fileName], aMap)
      storage.addPackage(pkgData.id, pkgData)
      const pkgId = pkgData.id

      const vm2 = new VM(storage, new StubClock(), compile)
      const exec = emptyExecFactoryFactory(() => storage, () => vm2)()
      const wasm = exec.importModule(pkgId).asInstance
      const jig = exec.instantiateByClassName(wasm, 'Foo', []).asJig()
      exec.lockJigToUser(jig, userAddr)
      exec.markAsFunded()
      const ret = exec.finalize()
      expect(ret.outputs[0].classIdx).to.eql(0)
    })

    it('can deploy same module twice', async () => {
      const moduleId1 = (await vm.compileSources([fileName], aMap)).id
      const moduleId2 = (await vm.compileSources([fileName], aMap)).id

      expect(moduleId1).to.eql(moduleId2)
    })
  })

  describe('addPreCompiled', function () {
    it('modules can be pre added from a file', async () => {
      const moduleId = addPreCompiled(vm, 'flock')
      const exec = emptyExec()
      const wasm = exec.importModule(moduleId).asInstance
      const jig = exec.instantiateByClassName(wasm, 'Flock', []).asJig()
      exec.lockJigToUser(jig, userAddr)
      exec.markAsFunded()
      const ret = exec.finalize()
      expect(ret.outputs[0].classIdx).to.eql(0)
    })

    it('some pre compiled module can be added twice', async () => {
      const moduleId1 = addPreCompiled(vm, 'flock')
      const moduleId2 = addPreCompiled(vm, 'flock')
      expect(moduleId1).to.eql(moduleId2)
    })

    it('modules can be pre added from a file with dependencies', () => {
      addPreCompiled(vm, 'basic-math')
      const flockId = addPreCompiled(vm, 'flock')

      const exec = emptyExec()
      const wasm = exec.importModule(flockId).asInstance
      const jig = exec.instantiateByClassName(wasm, 'Flock', []).asJig()
      exec.callInstanceMethod(jig, 'growWithMath', [])
        exec.lockJigToUser(jig, userAddr)
      exec.markAsFunded()
      const ret = exec.finalize()

      let jigState = ret.outputs[0].parsedState();
      expect(jigState[0]).to.eql(1)
    })
  })

  describe('deploy from tx execution', () => {
    it('can use the deployed module in the same tx', async () => {
      const exec = emptyExec()
      const sources = new Map<string, string>()
      sources.set(fileName, someValidModule)
      const wasm = await exec.deployPackage([fileName],  sources).then(stmt => stmt.asInstance)
      const jig = exec.instantiateByClassName(wasm, 'Foo', []).asJig()
      exec.lockJigToUser(jig, userAddr)
      exec.markAsFunded()
      const ret = exec.finalize()

      expect(ret.outputs[0].classIdx).to.eql(0)
    })

    it('can deploy more than 1 file', async () => {
      const exec = emptyExec()
      const sources = new Map<string, string>()
      const anotherFileName = 'another.ts';
      sources.set(fileName, someValidModule)
      sources.set(anotherFileName, ` 
        export class Something extends Jig {
          constructor () { super() } 
          foo(): string { return 'holu' }
        }
      `)

      const wasm = await exec.deployPackage([fileName, anotherFileName],  sources)
        .then(stmt => stmt.asInstance)
      const jig1 = exec.instantiateByClassName(wasm, 'Foo', []).asJig()
      const jig = exec.instantiateByClassName(wasm, 'Something', []).asJig()
      exec.lockJigToUser(jig1, userAddr)
      exec.lockJigToUser(jig, userAddr)
      const ret = exec.finalize()

      expect(ret.outputs[0].classIdx).to.eql(1)
    })

    it('adds the module on the right result index', async () => {
      const exec = emptyExec()
      const sources = new Map<string, string>()
      sources.set(fileName, someValidModule)
      const stmt = await exec.deployPackage([fileName], sources)
      const result = exec.getStatementResult(stmt.idx)

      const packageId = calculatePackageId([fileName], sources)

      expect(result.asInstance.id).to.eql(packageId)
    })
  })
})
