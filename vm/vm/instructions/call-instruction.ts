import {Instruction} from "./instruction.js";
import {Argument} from "../arguments/argument.js";
import {TxExecution} from "../tx-execution.js";

export class CallInstruction implements Instruction {
  masterListIndex: number
  methodName: string
  args: Array<Argument>

  constructor (masterListIndex: number, methodName: string, args: Array<Argument>) {
    this.masterListIndex = masterListIndex
    this.methodName = methodName
    this.args = args
  }

  exec (context: TxExecution): void {
    const args = this.args.map(a => a.get(context))
    const jigRef = context.getJigRef(this.masterListIndex)
    jigRef.sendMessage(this.methodName, args, context)
  }

  encode (): string {
    const args = this.args.map(arg => arg.encode()).join(' ')
    return `CALL $${this.masterListIndex} ${this.methodName} ${args}`.trim()
  }
}

