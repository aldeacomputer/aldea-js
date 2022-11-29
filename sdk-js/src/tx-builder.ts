import {
  Address,
  PrivKey,
  Tx,
  isAddress,
  CallInstruction,
  ExecInstruction,
  FundInstruction,
  ImportInstruction,
  LoadByOriginInstruction,
  LoadInstruction,
  LockInstruction,
  DeployInstruction,
  NewInstruction,
  SignInstruction,
  SignToInstruction,
} from './internal.js'
import { base16 } from './support/base.js'
import { sign } from './support/ed25519.js'


/**
 * Transaction Builder
 * 
 * A simple API for building transactions.
 */
export class TxBuilder {
  tx: Tx = new Tx()

  /**
   * Pushes an IMPORT instruction onto the Transaction. Accepts the origin as
   * a string or TypedArray.
   */
  import(origin: string | Uint8Array): void {
    if (typeof origin === 'string') origin = base16.decode(origin)
    this.tx.push(new ImportInstruction(origin))
  }

  /**
   * Pushes a LOAD instruction onto the Transaction. Accepts the location as
   * a string or TypedArray.
   */
  load(location: string | Uint8Array): void {
    if (typeof location === 'string') location = base16.decode(location)
    this.tx.push(new LoadInstruction(location))
  }

  /**
   * Pushes a LOADBYORIGIN instruction onto the Transaction. Accepts the origin
   * as a string or TypedArray.
   */
  loadByOrigin(origin: Uint8Array): void {
    if (typeof origin === 'string') origin = base16.decode(origin)
    this.tx.push(new LoadByOriginInstruction(origin))
  }

  /**
   * Pushes a NEW instruction onto the Transaction.
   */
  new(idx: number, exportidx: number, args: any[]): void {
    this.tx.push(new NewInstruction(idx, exportidx, args))
  }

  /**
   * Pushes a CALL instruction onto the Transaction.
   */
  call(idx: number, methodIdx: number, args: any[]): void {
    this.tx.push(new CallInstruction(idx, methodIdx, args))
  }

  /**
   * Pushes an EXEC instruction onto the Transaction.
   */
  exec(idx: number, exportIdx: number, methodIdx: number, args: any[]): void {
    this.tx.push(new ExecInstruction(idx, exportIdx, methodIdx, args))
  }

  /**
   * Pushes a FUND instruction onto the Transaction.
   */
  fund(idx: number): void {
    this.tx.push(new FundInstruction(idx))
  }

  /**
   * Pushes a LOCK instruction onto the Transaction. Accepts the address as an
   * Address instance or a pubkey hash TypedArray.
   */
  lock(idx: number, address: Address | Uint8Array): void {
    if (!isAddress(address)) address = new Address(<Uint8Array>address)
    this.tx.push(new LockInstruction(idx, (<Address>address).hash))
  }

  /**
   * Pushes a DEPLOY instruction onto the Transaction. Accepts a code bundle
   * map of filname => content.
   */
  deploy(code: Map<string, string>): void;
  deploy(entry: string | string[], code: Map<string, string>): void;
  deploy(entryOrCode: string | string[] | Map<string, string>, code?: Map<string, string>): void {
    let entry: string | string[]
    if (code instanceof Map) {
      entry = entryOrCode as string | string[]
    } else if (entryOrCode instanceof Map) {
      entry = Array.from(entryOrCode.keys())
      code = entryOrCode
    } else {
      throw new Error('invalid deploy params')
    }
    this.tx.push(new DeployInstruction(entry, code))
  }

  /**
   * Pushes a SIGN instruction onto the Transaction. The given PrivKey is used
   * to create the signature used in the instruction.
   */
  sign(privKey: PrivKey): void {
    const msg = this.tx.sighash()
    const sig = sign(msg, privKey)
    this.tx.push(new SignInstruction(sig, privKey.toPubKey().toBytes()))
  }

  /**
   * Pushes a SIGNTO instruction onto the Transaction. The given PrivKey is used
   * to create the signature used in the instruction.
   */
  signTo(privKey: PrivKey): void {
    const msg = this.tx.sighash(this.tx.instructions.length)
    const sig = sign(msg, privKey)
    this.tx.push(new SignToInstruction(sig, privKey.toPubKey().toBytes()))
  }
}
