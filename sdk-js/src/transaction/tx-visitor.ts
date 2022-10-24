import {PubKey} from "../pubkey.js";
import {Signature} from "../signature.js";

export interface TxVisitor {
  visitNew(varName: string, moduleId: string, className: string): void;
  visitJigArg(masterListIndex: number): void;
  visitCall(varName: string, methodName: string): void;
  visitLockInstruction(varName: string, pubkey: PubKey): void;

  visitLoad(varName: string, location: string, readonly: boolean, forceLocation: boolean): void;
  visitStringArg(value: string): void;
  visitNumberArg(value: number): void;
  visitSignature(sig: Signature): void;

  visitExec(varName: string, moduleId: string, methodName: string): void;
  visitBufferArg(value: Uint8Array): void;
}
