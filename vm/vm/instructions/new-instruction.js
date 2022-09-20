import { NoLock } from "../locks/no-lock.js"

export class NewInstruction {
    constructor (className, argList) {
        this.className = className
        this.argList = argList
    }

    exec (environment) {
        const args = this.argList.map(a => a.get(environment))
        environment.instantiate(this.className, args, new NoLock())
    }
}
