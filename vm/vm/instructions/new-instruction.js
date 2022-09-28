import { NoLock } from "../locks/no-lock.js"

export class NewInstruction {
  constructor (moduleId, className, args) {
    this.moduleId = moduleId
    this.className = className
    this.args = args
  }

  exec (environment) {
    const args = this.args.map(a => a.get(environment))
    environment.instantiate(this.moduleId, this.className, args, new NoLock())
  }

  encode () {
    const encodedArgs = this.args.map(arg => arg.encode()).join(' ')
    return `NEW ${this.moduleId} ${this.className} ${encodedArgs}`.trim()
  }

  getPubKey () {
    return null
  }
}
