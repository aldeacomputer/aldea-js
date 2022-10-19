import {Instruction} from "./instructions/instruction.js";
import {Signature} from "./signature.js";
import {TxVisitor} from "./instructions/tx-visitor.js";
import {SerializeVisitor} from "./visitors/serialize-visitor.js";
import {PrivKey} from "./privkey.js";
import {PubKey} from "./pubkey.js";


export class Transaction {
  private instructions: Instruction[];
  private signatures: Signature[];

  constructor() {
    this.instructions = []
    this.signatures = []
  }

  add(instruction: Instruction) {
    this.instructions.push(instruction)
    return this
  }

  accept(visitor: TxVisitor) {
    this.instructions.forEach(ins => ins.accept(visitor))
  }

  serialize(): string {
    const serializeVisitor = new SerializeVisitor();
    this.accept(serializeVisitor)
    return serializeVisitor.toString()
  }

  sign(privKey: PrivKey): Signature {
    const signature = Signature.from(privKey, Buffer.from(this.serialize()));
    this.signatures.push(signature)
    return signature
  }

  // get hash (): Buffer {
  //     return Buffer.from(blake3.hash(this.serialize()))
  // }

  // get id (): string {
  //     return this.hash.toString('hex')
  // }

  // isCorrectlySigned () {
  //     if(this.signatures.length === 0) { return false }
  //     const data = this.toBuffer()
  //     return this.signatures.every(sig => sig.verifyAgainst(data))
  // }

  addSignature (signature: Signature): void {
      this.signatures.push(signature)
  }

  isSignedBy (pubKey: PubKey) {
      return this.signatures.some(s => s.pubKey.equals(pubKey))
  }

  // sign (privKey: PrivKey) {
  //     const signature = Signature.from(privKey, this.toBuffer())
  //     this.addSignature(signature)
  // }

  // toBuffer() {
  //     return Buffer.from(this.serialize());
  // }
}
