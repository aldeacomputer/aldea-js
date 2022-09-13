class TxExecution {
    constructor (tx, vm) {
        this.tx = tx
        this.vm = vm
        this.jigs = []
        this.newJigs = []
        this.inputJigs = []
        this.wasms = new Map()
    }

    async exec (vm) {
        for(const instruction of this.instructions) {
            await instruction.exec(vm)
        }
    }

    addWasmInstance (moduleName, wasmModule) {
        wasmModule.onMethodCall(this._onMethodCall.bind(this))
        this.wasms.set(moduleName, wasmModule)
    }

    _onMethodCall (origin, methodName, args) {
        let jig = this.jigs.find(j => j.origin === origin)
        if (!jig) {
            this.vm.loadJig(origin)
            jig = this.jigs.find(j => j.origin === origin)
        }
        const resultBuf = jig.module.rawInstanceCall(jig.ref, methodName, args)
        // const resultPointer = jig.module.__lowerTypedArray(Uint8Array, 3, 0, resultBuf)
        // return resultPointer
        return resultBuf
    }

    getWasmInstance (moduleName) {
        return this.wasms.get(moduleName)
    }

    addNewJigRef (jigRef) {
        this.jigs.push(jigRef)
        this.newJigs.push(jigRef)
        return this.jigs.length - 1
    }

    getJigRef (index) {
        return this.jigs[index]
    }

    addInputJig (jigRef) {
        this.inputJigs.push(jigRef)
        this.jigs.push(jigRef)
    }
}

export { TxExecution }