import {
  Address,
  PrivKey,
  Tx,
  isAddress,
  CallInstruction,
  ExecInstruction,
  FundInstruction,
  ImportInstruction,
  LoadByRefInstruction,
  LoadByIdInstruction,
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
   * Pushes an IMPORT instruction onto the Transaction. Accepts the pkgId as
   * a string or TypedArray.
   */
  import(pkgId: string | Uint8Array): TxBuilder {
    if (typeof pkgId === 'string') pkgId = base16.decode(pkgId)
    this.tx.push(new ImportInstruction(pkgId))
    return this
  }

  /**
   * Pushes a LOADBYREF instruction onto the Transaction. Accepts the jigRef as
   * a string or TypedArray.
   */
  loadByRef(jigRef: Uint8Array): TxBuilder {
    this.tx.push(new LoadByRefInstruction(jigRef))
    return this
  }

  /**
   * Pushes a LOADBYORIGIN instruction onto the Transaction. Accepts the jigId
   * as a string or TypedArray.
   */
  loadById(jigId: Uint8Array): TxBuilder {
    this.tx.push(new LoadByIdInstruction(jigId))
    return this
  }

  /**
   * Pushes a NEW instruction onto the Transaction.
   */
  new(idx: number, exportidx: number, args: any[]): TxBuilder {
    this.tx.push(new NewInstruction(idx, exportidx, args))
    return this
  }

  /**
   * Pushes a CALL instruction onto the Transaction.
   */
  call(idx: number, methodIdx: number, args: any[]): TxBuilder {
    this.tx.push(new CallInstruction(idx, methodIdx, args))
    return this
  }

  /**
   * Pushes an EXEC instruction onto the Transaction.
   */
  exec(idx: number, exportIdx: number, methodIdx: number, args: any[]): TxBuilder {
    this.tx.push(new ExecInstruction(idx, exportIdx, methodIdx, args))
    return this
  }

  /**
   * Pushes a FUND instruction onto the Transaction.
   */
  fund(idx: number): TxBuilder {
    this.tx.push(new FundInstruction(idx))
    return this
  }

  fundWith (location: Uint8Array, privKey: PrivKey, nextOwner: Address): TxBuilder {
    const loadIndex = this.tx.instructions.length
    this.loadByRef(location)
    this.fund(loadIndex)
    this.lock(loadIndex, nextOwner)
    this.sign(privKey)
    return this
  }

  /**
   * Pushes a LOCK instruction onto the Transaction. Accepts the address as an
   * Address instance or a pubkey hash TypedArray.
   */
  lock(idx: number, address: Address | Uint8Array): TxBuilder {
    if (!isAddress(address)) address = new Address(<Uint8Array>address)
    this.tx.push(new LockInstruction(idx, (<Address>address).hash))
    return this
  }

  /**
   * Pushes a DEPLOY instruction onto the Transaction. Accepts a code bundle
   * map of filname => content.
   */
  deploy(code: Map<string, string>): TxBuilder;
  deploy(entry: string | string[], code: Map<string, string>): TxBuilder;
  deploy(entryOrCode: string | string[] | Map<string, string>, code?: Map<string, string>): TxBuilder {
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
    return this
  }

  /**
   * Pushes a SIGN instruction onto the Transaction. The given PrivKey is used
   * to create the signature used in the instruction.
   */
  sign(privKey: PrivKey): TxBuilder {
    const msg = this.tx.sighash()
    const sig = sign(msg, privKey)
    this.tx.push(new SignInstruction(sig, privKey.toPubKey().toBytes()))
    return this
  }

  /**
   * Pushes a SIGNTO instruction onto the Transaction. The given PrivKey is used
   * to create the signature used in the instruction.
   */
  signTo(privKey: PrivKey): TxBuilder {
    const msg = this.tx.sighash(this.tx.instructions.length)
    const sig = sign(msg, privKey)
    this.tx.push(new SignToInstruction(sig, privKey.toPubKey().toBytes()))
    return this
  }

  build (): Tx {
    return this.tx
  }
}
