import { NoLock } from "../locks/no-lock.js"

export class NewInstruction {
  constructor (moduleId, className, argList) {
    this.moduleId = moduleId
    this.className = className
    this.argList = argList
  }

  exec (environment) {
    const args = this.argList.map(a => a.get(environment))
    environment.instantiate(this.moduleId, this.className, args, new NoLock())
  }

  encode () {
    const encodedArgs = this.argList.map(arg => arg.encode()).join(' ')
    return `NEW ${this.moduleId} ${this.className} ${encodedArgs}`.trim()
  }
}
