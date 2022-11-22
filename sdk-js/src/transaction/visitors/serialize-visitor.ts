import {TxVisitor} from "../tx-visitor.js";
import {Signature} from "../../signature.js";
import {Location} from "../location.js";
import {Address} from "../../address.js";

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

  visitCall(varName: string, methodName: string): void {
    this.lines.push(`CALL $${varName} ${methodName} ${this.args.join(' ')}`)
    this.args = []
  }

  visitMasterListIndex(masterListIndex: number): void {
    this.args.push(`#${masterListIndex}`)
  }

  visitLoad(varName: string, location: Location, readonly: boolean, forceLocation: boolean): void {
    this.lines.push(`LOAD ${varName} ${location.toString()} ${readonly} ${forceLocation.toString()}`)
  }

  visitLockInstruction(varName: string, addr: Address): void {
    this.lines.push(`LOCK $${varName} ${addr.toString()}`)
  }

  visitNew(varName:string, moduleId:string, className:string): void {
    this.lines.push(`NEW ${varName} ${moduleId} ${className} ${this.args.join(' ')}`)
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

  visitExec(varName: string, moduleId: string, methodName: string): void {
    this.lines.push(`EXEC ${varName} ${moduleId} ${this.args.join(' ')}`)
    this.args = []
  }

  visitBufferArg (buff: Uint8Array): void {
    this.args.push(`0x${Buffer.from(buff).toString('hex')}`)
  }

  visitOriginArg(origin: ArrayBuffer): void {
    this.args.push(`origin:${Buffer.from(origin).toString('hex')}`)
  }

  visitVariableContent(varName: string): void {
    this.args.push(`$${varName}`)
  }

  acceptAssign(varName: string, masterListIndex: number): void {
    this.lines.push(`ASSIGN ${varName} ${masterListIndex}`)
  }
}
