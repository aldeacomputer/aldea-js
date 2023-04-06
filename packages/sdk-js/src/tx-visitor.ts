import {Tx} from "./tx.js";
import {OpCode} from "./instruction.js";
import {Address} from "./address.js";
import {Pointer} from "./pointer.js";
import {PubKey} from "./pubkey.js";

export interface TxVisitor<T> {
  visitTxStart(version: number, instructionCount: number): void;
  visitImport(packageId: Uint8Array): void;
  visitLoad(outputId: Uint8Array): void;
  visitLoadByOrigin(origin: Pointer): void;
  visitNew(idx: number, exportIdx: number, args: any[]): void;
  visitCall(idx: number, methodIdx: number, args: any[]): void;
  visitExec(idx: number, exportIdx: number, methodIdx: number, args: any[]): void;
  visitExecFunc(idx: number, exportIdx: number, args: any[]): void;
  visitFund(idx: number): void;
  visitLock(idx: number, address: Address): void;
  visitDeploy(entry: string[], code: Map<string, string>): void;
  visitSign(sig: Uint8Array, pubKey: PubKey): void;
  visitSignTo(sig: Uint8Array, pubKey: PubKey): void;
  visitUnknown(opcode: number, unknownArgs: Uint8Array): void;
  visitTxEnd(): T;
}
