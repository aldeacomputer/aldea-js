import {TxVisitor} from "./tx-visitor.js";
import {Pointer} from "./pointer.js";
import {Address} from "./address.js";
import {PubKey} from "./pubkey.js";
import {CBOR} from "cbor-redux";
import {OpCode} from "./instruction.js";
import {
  CallInstruction, DeployInstruction, ExecFuncInstruction, ExecInstruction, FundInstruction,
  ImportInstruction,
  LoadByOriginInstruction,
  LoadInstruction, LockInstruction,
  NewInstruction, SignInstruction, SignToInstruction
} from "./instructions/index.js";
import {BufReader} from "./buf-reader.js";
import {Tx} from "./tx.js";
import {parseCbor} from "./cbor-tools.js";

export class TxParser implements TxVisitor<Tx> {
  private reader: BufReader;
  private _tx: Tx;

  constructor(buff: Uint8Array) {
    this.reader = new BufReader(buff)
    this._tx = new Tx()
  }

  parse (): Tx {
    const version = this.reader.readU16()
    const instCount = this.reader.readVarInt()
    this.visitTxStart(version, Number(instCount))

    for (let i = 0; i < instCount; i++) {
      const opcode = this.reader.readU8()
      const length = Number(this.reader.readVarInt())
      switch (opcode) {
        case OpCode.IMPORT:
          this.visitImport(
            this.reader.readBytes(length)
          )
          break
        case OpCode.LOAD:
          this.visitLoad(
            this.reader.readBytes(length)
          )
          break
        case OpCode.LOADBYORIGIN:
          this.visitLoadByOrigin(
            Pointer.fromBytes(this.reader.readBytes(length))
          )
          break
        case OpCode.NEW:
          this.visitNew(
            this.reader.readU16(),
            this.reader.readU16(),
            parseCbor(this.reader.readBytes(length - 4))
          )
          break
        case OpCode.CALL:
          this.visitCall(
            this.reader.readU16(),
            this.reader.readU16(),
            parseCbor(this.reader.readBytes(length - 4))
          )
          break
        case OpCode.EXEC:
          this.visitExec(
            this.reader.readU16(),
            this.reader.readU16(),
            this.reader.readU16(),
            parseCbor(this.reader.readBytes(length - 6))
          )
          break
        case OpCode.EXECFUNC:
          this.visitExecFunc(
            this.reader.readU16(),
            this.reader.readU16(),
            parseCbor(this.reader.readBytes(length - 4))
          )
          break
        case OpCode.FUND:
          this.visitFund(
            this.reader.readU16()
          )
          break
        case OpCode.LOCK:
          this.visitLock(
            this.reader.readU16(),
            new Address(this.reader.readBytes(length - 2))
          )
          break
        case OpCode.DEPLOY:
          const parsed = CBOR.decode(new Uint8Array(this.reader.readBytes(length)).buffer, null, { mode: 'sequence', dictionary: 'map' })
          this.visitDeploy(
            parsed.get(0),
            parsed.get(1)
          )
          break
        case OpCode.SIGN:
          this.visitSign(
            this.reader.readBytes(64),
            PubKey.fromBytes(this.reader.readBytes(length - 64))
          )
          break
        case OpCode.SIGNTO:
          this.visitSignTo(
            this.reader.readBytes(64),
            PubKey.fromBytes(this.reader.readBytes(length - 64))
          )
          break
        default:
          this.visitUnknown(opcode, this.reader.readBytes(length))
          break
      }
    }
    return this.visitTxEnd()
  }

  visitTxStart(version: number, instructionCount: number): void {

  }

  visitCall(idx: number, methodIdx: number, args: any[]): void {
    this._tx.push(new CallInstruction(idx, methodIdx, args))
  }

  visitDeploy(entry: string[], sources: Map<string, string>): void {
    this._tx.push(new DeployInstruction(entry, sources))
  }

  visitExec(idx: number, exportIdx: number, methodIdx: number, args: any[]): void {
    this._tx.push(new ExecInstruction(idx, exportIdx, methodIdx, args))
  }

  visitExecFunc(idx: number, exportIdx: number, args: any[]): void {
    this._tx.push(new ExecFuncInstruction(idx, exportIdx, args))
  }

  visitFund(idx: number): void {
    this._tx.push(new FundInstruction(idx))
  }

  visitImport(packageId: Uint8Array): void {
    this._tx.push(new ImportInstruction(packageId))
  }

  visitLoad(outputId: Uint8Array): void {
    this._tx.push(new LoadInstruction(outputId))
  }

  visitLoadByOrigin(origin: Pointer): void {
    this._tx.push(new LoadByOriginInstruction(origin.toBytes()))
  }

  visitLock(idx: number, address: Address): void {
    this._tx.push(new LockInstruction(idx, address.hash))
  }

  visitNew(idx: number, exportIdx: number, args: any[]): void {
    this._tx.push(new NewInstruction(idx, exportIdx, args))
  }

  visitSign(sig: Uint8Array, pubKey: PubKey): void {
    this._tx.push(new SignInstruction(sig, pubKey.toBytes()))
  }

  visitSignTo(sig: Uint8Array, pubKey: PubKey): void {
    this._tx.push(new SignToInstruction(sig, pubKey.toBytes()))
  }

  visitTxEnd(): Tx {
    return this._tx
  }

  visitUnknown(opcode: number, unknownArgs: Uint8Array): void {
    throw new Error(`unknown opcode: ${opcode}`)
  }
}
