export class CallInstruction {
    constructor (instanceRef, methodName, args) {
        this.instanceRef = instanceRef
        this.methodName = methodName
        this.args = args
    }

    exec (vm) {
        const args = this.args.map(a => a.get(vm))
        vm.call(this.instanceRef, this.methodName, args, null)
    }
}

