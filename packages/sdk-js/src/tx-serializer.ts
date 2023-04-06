import {TxVisitor} from "./tx-visitor.js";
import {BufWriter} from "./buf-writer.js";
import {Pointer} from "./pointer.js";
import {Address} from "./address.js";
import {PubKey} from "./pubkey.js";
import {CBOR, Sequence} from "cbor-redux";
import {OpCode} from "./instruction.js";
import {serializeCbor} from "./cbor-tools.js";

export class TxSerializer implements TxVisitor<Uint8Array> {
  private partial: BufWriter;

  constructor() {
    this.partial = new BufWriter()
  }

  buff (): Uint8Array {
    return this.partial.data
  }

  visitTxStart(version: number, instructionCount: number): void {
    this.partial.writeU16(version)
    this.partial.writeVarInt(instructionCount)
  }

  visitCall(idx: number, methodIdx: number, args: any[]): void {
    const cborData = serializeCbor(args)
    this.partial.writeU8(OpCode.CALL)
    this.partial.writeVarInt(4 + cborData.byteLength)
    this.partial.writeU16(idx)
    this.partial.writeU16(methodIdx)
    this.partial.writeBytes(cborData)
  }

  visitDeploy(entry: string[], code: Map<string, string>): void {
    const cborData = CBOR.encode(new Sequence([entry.sort(), code]))
    this.partial.writeU8(OpCode.DEPLOY)
    this.partial.writeVarInt(cborData.byteLength)
    this.partial.writeBytes(new Uint8Array(cborData))
  }

  visitExec(idx: number, exportIdx: number, methodIdx: number, args: any[]): void {
    const cborData = serializeCbor(args)
    this.partial.writeU8(OpCode.EXEC)
    this.partial.writeVarInt(2 + 2 + 2 + cborData.byteLength)
    this.partial.writeU16(idx)
    this.partial.writeU16(exportIdx)
    this.partial.writeU16(methodIdx)
    this.partial.writeBytes(cborData)
  }

  visitExecFunc(idx: number, exportIdx: number, args: any[]): void {
    const cborData = serializeCbor(args)
    this.partial.writeU8(OpCode.EXECFUNC)
    this.partial.writeVarInt( 2 + 2 + cborData.byteLength)
    this.partial.writeU16(idx)
    this.partial.writeU16(exportIdx)
    this.partial.writeBytes(new Uint8Array(cborData))
  }

  visitFund(idx: number): void {
    this.partial.writeU8(OpCode.FUND)
    this.partial.writeVarInt(2)
    this.partial.writeU16(idx)
  }

  visitImport(pkgId: Uint8Array): void {
    this.partial.writeU8(OpCode.IMPORT)
    this.partial.writeVarInt(pkgId.byteLength)
    this.partial.writeBytes(pkgId)
  }

  visitLoad(outputId: Uint8Array): void {
    this.partial.writeU8(OpCode.LOAD)
    this.partial.writeVarInt(outputId.length)
    this.partial.writeBytes(outputId)
  }

  visitLoadByOrigin(origin: Pointer): void {
    this.partial.writeU8(OpCode.LOADBYORIGIN)
    const bytes = origin.toBytes()
    this.partial.writeVarInt(bytes.byteLength)
    this.partial.writeBytes(bytes)
  }

  visitLock(idx: number, address: Address): void {
    this.partial.writeU8(OpCode.LOCK)
    this.partial.writeVarInt(2 + address.hash.byteLength)
    this.partial.writeU16(idx)
    this.partial.writeBytes(address.hash)
  }

  visitNew(idx: number, exportIdx: number, args: any[]): void {
    const cborData = serializeCbor(args)
    this.partial.writeU8(OpCode.NEW)
    this.partial.writeVarInt(2 + 2 + cborData.byteLength)
    this.partial.writeU16(idx)
    this.partial.writeU16(exportIdx)
    this.partial.writeBytes(cborData)
  }

  visitSign(sig: Uint8Array, pubKey: PubKey): void {
    this.partial.writeU8(OpCode.SIGN)
    const bytes = pubKey.toBytes();
    this.partial.writeVarInt(sig.byteLength + bytes.byteLength)
    this.partial.writeBytes(sig)
    this.partial.writeBytes(bytes)
  }

  visitSignTo(sig: Uint8Array, pubKey: PubKey): void {
    this.partial.writeU8(OpCode.SIGNTO)
    const bytes = pubKey.toBytes();
    this.partial.writeVarInt(sig.byteLength + bytes.byteLength)
    this.partial.writeBytes(sig)
    this.partial.writeBytes(bytes)
  }

  visitTxEnd(): Uint8Array {
    return this.partial.data
  }

  visitUnknown(opcode: number, unknownArgs: Uint8Array): void {
    throw new Error(`unknown opcode: ${opcode}`)
  }
}
