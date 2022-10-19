import {TxVisitor} from "../transaction/tx-visitor.js";
import {PubKey} from "../pubkey.js";
import {Signature} from "../signature.js";

export class SerializeVisitor implements TxVisitor {
  lines: string[];
  args: string[];

  constructor() {
    this.lines = []
    this.args = []
  }

  toString (): string {
    return this.lines.join('\n')
  }

  visitCall(masterListIndex: number, methodName: string): void {
    this.lines.push(`CALL #${masterListIndex} ${methodName} ${this.args.join(' ')}`)
    this.args = []
  }

  visitJigArg(masterListIndex: number): void {
    this.args.push(`#${masterListIndex}`)
  }

  visitLiteralArg(value: any): void {
    this.args.push(`"${value.toString()}"`)
  }

  visitLoad(location: string, forceLocation: boolean): void {
    this.lines.push(`LOAD ${location} ${forceLocation.toString()}`)
  }

  visitLockInstruction(masterListIndex: number, pubkey: PubKey): void {
    this.lines.push(`LOCK #${masterListIndex} ${pubkey.toHex()}`)
  }

  visitNew(moduleId: string, className: string): void {
    this.lines.push(`NEW ${moduleId} ${className} ${this.args.join(' ')}`)
    this.args = []
  }

  visitNumberArg(value: number): void {
    this.args.push(value.toString())
  }

  visitStringArg(value: string): void {
    this.args.push(`"${value}"`)
  }

  visitSignature (_sig: Signature) {
    // noop
  }

}
