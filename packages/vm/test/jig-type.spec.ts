// import {Storage, VM} from '../src/index.js'
// import {expect} from 'chai'
// import {TxExecution} from "../src/tx-execution.js";
// import {JigRef} from "../src/jig-ref.js";
// import {buildVm, emptyExecFactoryFactory} from "./util.js";
// import {WasmContainer} from "../src/wasm-container.js";
// import {StatementResult} from "../src/statement-result.js";
// import {PrivKey} from "@aldea/core";
// import { Abi } from '@aldea/core/abi';
//
// describe('Jig Type', () => {
//   let storage: Storage
//   let vm: VM
//   const userPriv = PrivKey.fromRandom()
//   const userPub = userPriv.toPubKey()
//   const userAddr = userPub.toAddress()
//
//   let abiFor: (key: string) => Abi
//   let modIdFor: (key: string) => Uint8Array
//
//   beforeEach(() => {
//     const data = buildVm(['jig-type-bearer', 'flock'])
//     storage = data.storage
//     vm = data.vm
//     abiFor = (key: string) => storage.getModule(modIdFor(key)).abi
//     modIdFor = data.modIdFor
//   })
//
//   const emptyTx = emptyExecFactoryFactory(() => storage, () => vm)
//
//   let jigBearerPkg: WasmContainer
//   let flockPkg: WasmContainer
//   let flockStmt: StatementResult
//   let jig: JigRef
//
//   let exec: TxExecution
//   beforeEach(() => {
//     exec = emptyTx()
//     exec.markAsFunded()
//     jigBearerPkg = exec.importModule(modIdFor('jig-type-bearer')).asContainer // index 0
//     flockPkg = exec.importModule(modIdFor('flock')).asContainer
//     flockStmt = exec.instantiateByClassName(flockPkg, 'Flock', [])
//     jig = flockStmt.asJig()
//   })
//
//   it('can create instances by sending jig typed arguments to constructor properly.', () => {
//     const jigBearer = exec.instantiateByClassName(jigBearerPkg, 'JigTypeBearer', [jig]).asJig() // index 1
//     exec.lockJigToUser(jigBearer, userAddr)
//     exec.lockJigToUser(flockStmt.asJig(), userAddr)
//     const ret = exec.finalize()
//
//     const flockOutput = ret.outputs[0]
//     const parsed = ret.outputs[1].parsedState(abiFor('jig-type-bearer'))
//     expect(parsed[0]).to.eql(flockOutput.origin)
//   })
//
//   it('can make calls on methods returning jig typed parameters', () => {
//     const jigBearer = exec.instantiateByClassName(jigBearerPkg, 'JigTypeBearer', [jig]).asJig() // index 1
//     const returnedJig = exec.callInstanceMethod(jigBearer, 'getJig', []).asJig()
//     exec.lockJigToUser(jigBearer, userAddr)
//     exec.lockJigToUser(flockStmt.asJig(), userAddr)
//     const ret = exec.finalize()
//
//     const parsed = ret.outputs[1].parsedState(abiFor('jig-type-bearer'))
//     expect(parsed[0]).to.eql(returnedJig.origin)
//   })
//
//   it('can make calls on jigs sending jig typed parameters', () => {
//     const anotherFlock = exec.instantiateByClassName(flockPkg, 'Flock', []).asJig()
//     const anotherJig = anotherFlock
//
//     const jigBearer = exec.instantiateByClassName(jigBearerPkg, 'JigTypeBearer', [jig]).asJig() // index 1
//     exec.callInstanceMethod(jigBearer, 'setJig', [anotherJig])
//
//     exec.lockJigToUser(jigBearer, userAddr)
//     exec.lockJigToUser(flockStmt.asJig(), userAddr)
//     exec.lockJigToUser(anotherFlock, userAddr)
//     const ret = exec.finalize()
//
//     const flockOutput = ret.outputs[0]
//     const anotherFlockOutput = ret.outputs[1]
//     const parsed = ret.outputs[2].parsedState(abiFor('jig-type-bearer'))
//     expect(parsed[0]).to.not.eql(flockOutput.origin) // Remove
//     expect(parsed[0]).to.eql(anotherFlockOutput.origin)
//   })
//
//   it('can restore jigs that contain jigs of the same package', () => {
//     const jigBearerStmt = exec.instantiateByClassName(jigBearerPkg, 'JigTypeBearer', [jig]) // index 1
//     exec.lockJigToUser(jigBearerStmt.asJig(), userAddr)
//     exec.lockJigToUser(flockStmt.asJig(), userAddr)
//     const ret1 = exec.finalize()
//
//     storage.persist(ret1)
//
//     const exec2 = emptyTx([userPriv])
//
//     const jigBearerIndexFromOutside = exec2.loadJigByOutputId(ret1.outputs[1].id()).asJig()
//     const returnedJig = exec2.callInstanceMethod(jigBearerIndexFromOutside, 'getJig', []).asJig()
//     exec2.callInstanceMethod(returnedJig, 'grow', [])
//     exec2.lockJigToUser(jigBearerIndexFromOutside, userAddr)
//     exec2.lockJigToUser(returnedJig, userAddr)
//     exec2.markAsFunded()
//     const ret2 = exec2.finalize()
//
//     const parsedFlock = ret2.outputs[1].parsedState(abiFor('flock'))
//     expect(parsedFlock[0]).to.eql(1)
//   })
//
//   it('can restore jigs that contain jigs of the same package with the expected type name', () => {
//     const jigBearer = exec.instantiateByClassName(jigBearerPkg, 'JigTypeBearer', [jig]).asJig() // index 1
//     exec.lockJigToUser(jigBearer, userAddr)
//     exec.lockJigToUser(flockStmt.asJig(), userAddr)
//     const ret1 = exec.finalize()
//
//     storage.persist(ret1)
//
//     const exec2 = emptyTx([userPriv])
//
//     const jigBearerIndexFromOutside = exec2.loadJigByOutputId(ret1.outputs[1].id()).asJig()
//     const returnedJig = exec2.callInstanceMethod(jigBearerIndexFromOutside, 'getJig', []).asJig()
//     exec2.callInstanceMethod(returnedJig, 'grow', [])
//     exec2.lockJigToUser(jigBearerIndexFromOutside, userAddr)
//     exec2.lockJigToUser(returnedJig, userAddr)
//     exec2.markAsFunded()
//     const ret2 = exec2.finalize()
//
//     const parsedJigBearer = ret2.outputs[0].parsedState(abiFor('jig-type-bearer'))
//     expect(parsedJigBearer[0]).to.eql(ret2.outputs[1].origin)
//   })
// })
