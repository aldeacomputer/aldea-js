export class JigArg {
    constructor (masterListIndex) {
        this.index = masterListIndex
    }

    get (context) {
        const jig = context.currentExecution.jigs[this.index]
        return jig.origin
    }
}