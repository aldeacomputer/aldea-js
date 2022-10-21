import {PubKey} from "../pubkey.js";
import {Signature} from "../signature.js";

export interface TxVisitor {
  visitNew(moduleId: string, className: string): void;
  visitJigArg(masterListIndex: number): void;
  visitCall(masterListIndex: number, methodName: string): void;
  visitLockInstruction(masterListIndex: number, pubkey: PubKey): void;
  visitLoad(location: string, readonly: boolean, forceLocation: boolean): void;
  visitStringArg(value: string): void;
  visitNumberArg(value: number): void;
  visitSignature(sig: Signature): void;
  visitExec(moduleId: string, methodName: string): void;

  visitBufferArg(value: Uint8Array): void;
}
