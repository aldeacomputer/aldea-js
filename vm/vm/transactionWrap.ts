import blake3 from "blake3-wasm"
import {Instruction} from "./instructions/instruction.js";
import {Signature} from "./signature.js";
import {TxExecution} from "./tx-execution.js";
import {PrivKey, PubKey} from '@aldea/sdk-js';

class TransactionWrap {
  private instructions: Instruction[];
  private signatures: Signature[];
  constructor () {
    this.instructions = []
    this.signatures = []
  }

  add (instruction: Instruction) {
    this.instructions.push(instruction)
    return this
  }

  exec (context: TxExecution) {
    for (const instruction of this.instructions) {
      instruction.exec(context)
    }
  }

  serialize (): string {
    return this.instructions.map(instruction => instruction.encode()).join('\n')
  }

  get hash (): Buffer {
    return Buffer.from(blake3.hash(this.serialize()))
  }

  get id (): string {
    return this.hash.toString('hex')
  }

  isCorrectlySigned () {
    if(this.signatures.length === 0) { return false }
    const data = this.toBuffer()
    return this.signatures.every(sig => sig.verifyAgainst(data))
  }

  addSignature (signature :Signature): void {
    this.signatures.push(signature)
  }

  isSignedBy (pubKey: PubKey) {
    return this.signatures.some(s => s.pubkey.equals(pubKey))
  }

  sign (privKey: PrivKey) {
    const signature = Signature.from(privKey, this.toBuffer())
    this.addSignature(signature)
  }

  toBuffer() {
    return Buffer.from(this.serialize());
  }
}

export { TransactionWrap }
