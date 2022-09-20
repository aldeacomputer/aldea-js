export class CallInstruction {
    constructor (masterListIndex, methodName, args) {
        this.instanceRef = masterListIndex
        this.methodName = methodName
        this.args = args
    }

    exec (context) {
        const args = this.args.map(a => a.get(context))
        context.call(this.instanceRef, this.methodName, args, null)
    }
}

