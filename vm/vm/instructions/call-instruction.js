export class CallInstruction {
    constructor (instanceRef, methodName, args) {
        this.instanceRef = instanceRef
        this.methodName = methodName
        this.args = args
    }

    exec (context) {
        const args = this.args.map(a => a.get(context))
        context.call(this.instanceRef, this.methodName, args, null)
    }
}

