import {TxVisitor} from "../tx-visitor.js";
import {PubKey} from "../../pubkey.js";
import {Signature} from "../../signature.js";
import {Location} from "../location.js";

export class ToObjectVisitor implements TxVisitor {
  instructions: any[]
  signatures: any[]
  args: any[]

  constructor() {
    this.instructions = []
    this.signatures = []
    this.args = []
  }


  build(): any {
    return {
      instructions: this.instructions,
      signatures: this.signatures
    }
  }

  visitCall(varName: string, methodName: string): void {
    this.instructions.push({
      type: 'call',
      props: {
        varName,
        methodName,
        args: this.args
      }
    })
    this.args = []
  }

  visitMasterListIndex(masterListIndex: number): void {
    this.args.push({ type: 'jig', index: masterListIndex })
  }

  visitLoad(varName: string, location: Location, readOnly: boolean, forceLocation: boolean): void {
    this.instructions.push({
      type: 'load',
      props: {
        varName,
        location: location.toString(),
        readOnly,
        force: forceLocation
      }
    })
  }

  visitLockInstruction(varName: string, pubkey: PubKey): void {
    this.instructions.push({
      type: 'lock',
      props: {
        varName,
        pubKey: pubkey.toHex()
      }
    })
  }

  visitNew(varName:string, moduleId:string, className:string): void {
    this.instructions.push({
      type: 'new',
      props: {
        varName,
        moduleId,
        className,
        args: this.args
      }
    })
    this.args = []
  }

  visitNumberArg(value: number): void {
    this.args.push({ type: 'number', value})
  }

  visitStringArg(value: string): void {
    this.args.push({ type: 'string', value })
  }

  visitSignature (sig: Signature) {
    this.signatures.push({ pubKey: sig.pubKey.toHex(), hexSig: sig.rawSigHex() })
  }

  visitExec(varName: string, moduleId: string, methodName: string): void {
    this.instructions.push({
      type: 'exec',
      props: {
        varName,
        moduleId,
        args: this.args
      }
    })
    this.args = []
  }

  visitBufferArg (buff: Uint8Array): void {
    this.args.push({
      type: 'buffer',
      value: Buffer.from(buff).toString('hex')
    })
  }

  visitOriginArg(origin: ArrayBuffer): void {
    this.args.push({
      type: 'origin',
      value: Buffer.from(origin).toString('hex')
    })
  }

  visitVariableContent(varName: string): void {
    this.args.push({
      type: 'variableContent',
      value: varName
    })
  }

  acceptAssign(varName: string, masterListIndex: number): void {
    this.instructions.push({
      type: 'assign',
      props: {
        varName: varName,
        index: masterListIndex
      }
    })
  }
}
