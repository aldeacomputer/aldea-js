import {TxVisitor} from "../tx-visitor.js";
import {PubKey} from "../../pubkey.js";
import {Signature} from "../../signature.js";

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

  visitCall(masterListIndex: number, methodName: string): void {
    this.instructions.push({
      type: 'call',
      props: {
        masterListIndex,
        methodName,
        args: this.args
      }
    })
    this.args = []
  }

  visitJigArg(masterListIndex: number): void {
    this.args.push({ type: 'jig', index: masterListIndex })
  }

  visitLoad(location: string, readonly: boolean, forceLocation: boolean): void {
    this.instructions.push({
      type: 'load',
      props: {
        location,
        readonly,
        force: forceLocation
      }
    })
  }

  visitLockInstruction(masterListIndex: number, pubKey: PubKey): void {
    this.instructions.push({
      type: 'lock',
      props: {
        masterListIndex,
        pubKey: pubKey.toHex()
      }
    })
  }

  visitNew(moduleId: string, className: string): void {
    this.instructions.push({
      type: 'new',
      props: {
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

  visitExec(moduleId: string, functionName: string): void {
    this.instructions.push({
      type: 'exec',
      props: {
        moduleId,
        functionName,
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
}
