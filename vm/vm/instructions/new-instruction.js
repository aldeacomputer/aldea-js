export class NewInstruction {
    constructor (className, argList) {
        this.className = className
        this.argList = argList
    }

    exec (environment) {
        const args = this.argList.map(a => a.get(environment))
        environment.instanciate(this.className, args, null)
    }
}
