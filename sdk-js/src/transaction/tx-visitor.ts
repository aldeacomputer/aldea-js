import {PubKey} from "../pubkey.js";
import {Signature} from "../signature.js";

export interface TxVisitor {
  // instructtions
  visitCall(varName: string, methodName: string): void;
  visitExec(varName: string, moduleId: string, methodName: string): void;
  visitLoad(varName: string, location: string, readonly: boolean, forceLocation: boolean): void;
  visitLockInstruction(varName: string, pubkey: PubKey): void;
  visitNew(varName: string, moduleId: string, className: string): void;

  // arguments
  visitBufferArg(value: Uint8Array): void;
  visitNumberArg(value: number): void;
  visitStringArg(value: string): void;
  visitVariableContent(varName: string): void;

  // signatures
  visitSignature(sig: Signature): void;
}
