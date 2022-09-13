import path from 'path'
import { WasmModule } from './wasm-module.js'
import { fileURLToPath } from 'url'
import { TxExecution } from './tx-execution.js'
import { JigState } from './jig-state.js'
import { JigRef } from './jig-ref.js'

const __dir = fileURLToPath(import.meta.url)

export class VM {
    constructor (storage) {
        this.storage = storage
        this.currentExecution = null
    }

    async execTx (tx) {
        this.currentExecution = new TxExecution(tx, this)
        await tx.exec(this)
        await Promise.all(this.currentExecution.jigs.map(async (jigRef, index) => {
            const location = `${tx.id}_${index}`
            const origin = jigRef.origin || location
            const serialized = await jigRef.module.instanceCall(jigRef.ref, 'serialize')
            const jig = new JigState(origin, location, serialized, jigRef.module.id)
            this.storage.addJig(jig)
        }))
        this.currentExecution = null
    }

    load (moduleName) {
        if (this.currentExecution.getWasmInstance()) { return }
        if (moduleName === 'Sword') {
            const modulePath = path.join(__dir, '../../build', 'sword.wasm')
            const wasmModule = WasmModule.fromFilePath(modulePath, moduleName)
            this.currentExecution.addWasmInstance(
                moduleName,
                wasmModule
            )
            return wasmModule
        } else if (moduleName === 'Fighter') {
            const modulePath = path.join(__dir, '../../build', 'fighter.wasm')
            const wasmModule = WasmModule.fromFilePath(modulePath, moduleName)
            this.currentExecution.addWasmInstance(
                moduleName,
                wasmModule
            )
            return wasmModule
        } else {
            throw new Error('unknown module')
        }
    }

    call (instanceRef, methodName, args) {
        const jigRef = this.currentExecution.getJigRef(instanceRef)
        jigRef.module.instanceCall(jigRef.ref, methodName, args)
    }

    instanciate (moduleRef, args) {
        const module = this.currentExecution.getWasmInstance(moduleRef)
        const jigRef =  module.staticCall('constructor', args)
        return this.currentExecution.addNewJigRef(new JigRef(jigRef, module, `${this.currentExecution.tx.id}_${this.currentExecution.jigs.length}`))
    }

    loadJig (location) {
        const frozenJig = this.storage.getJigState(location)
        this.load(frozenJig.moduleId)
        const module = this.currentExecution.getWasmInstance(frozenJig.moduleId)
        const ref = module.hidrate(frozenJig.stateBuf)
        this.currentExecution.addInputJig(new JigRef(ref, module, frozenJig.origin))
    }
}
