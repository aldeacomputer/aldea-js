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

    encode () {
      const encodedArgs = this.argList.map(arg => arg.encode()).join(' ')
      return `NEW ${this.className} ${encodedArgs}`.trim()
    }
}
