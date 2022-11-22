import {Signature} from "../signature.js";
import {Location} from "./location.js";
import {Address} from "../address.js";

export interface TxVisitor {
  // instructtions
  acceptAssign(varName: string, masterListIndex: number): void;
  visitCall(varName: string, methodName: string): void;
  visitExec(varName: string, moduleId: string, methodName: string): void;
  visitLoad(varName: string, location: Location, readonly: boolean, forceLocation: boolean): void;
  visitLockInstruction(varName: string, addr: Address): void;

  visitNew(varName: string, moduleId: string, className: string): void;
  // arguments
  visitBufferArg(value: Uint8Array): void;
  visitNumberArg(value: number): void;
  visitStringArg(value: string): void;

  visitVariableContent(varName: string): void;
  // signatures

  visitSignature(sig: Signature): void;
}
