import {TxVisitor} from "../tx-visitor.js";
import {PubKey} from "../../pubkey.js";
import {Signature} from "../../signature.js";

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

  visitLoad(location: string, readonly: boolean, forceLocation: boolean): void {
    this.lines.push(`LOAD ${location} ${readonly} ${forceLocation.toString()}`)
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

  visitExec(moduleId: string, methodName: string): void {
    this.lines.push(`EXEC ${moduleId} ${methodName} ${this.args.join(' ')}`)
    this.args = []
  }
}
