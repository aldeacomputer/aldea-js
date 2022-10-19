import { NoLock } from "../locks/no-lock.js"
import {Argument} from "../arguments/argument.js";
import {TxExecution} from "../tx-execution.js";

export class NewInstruction {
  private moduleId: string;
  private className: string;
  private args: Argument[];

  constructor (moduleId: string, className: string, args: Argument[]) {
    this.moduleId = moduleId
    this.className = className
    this.args = args
  }

  exec (environment: TxExecution) {
    const args = this.args.map(a => a.get(environment))
    environment.instantiate(this.moduleId, this.className, args, new NoLock())
  }

  encode () {
    const encodedArgs = this.args.map(arg => arg.encode()).join(' ')
    return `NEW ${this.moduleId} ${this.className} ${encodedArgs}`.trim()
  }
}
