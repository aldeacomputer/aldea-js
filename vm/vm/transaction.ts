import blake3 from "blake3-wasm"
import {Instruction} from "./instructions/instruction.js";
import {Signature} from "./signature.js";
import {TxExecution} from "./tx-execution.js";
import {LockInstruction} from "./instructions/index.js";

class Transaction {
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
    const data = Buffer.from(this.serialize())
    const pubkeys = this.instructions
      .filter(i => i instanceof LockInstruction)
      .map((i: Instruction) => {
        const lockInstruction = i as LockInstruction
        return lockInstruction.getPubKey();
      }).filter(p => p)
    if (pubkeys.length < this.signatures.length) {
      return false
    }
    return pubkeys.every((pubk: Uint8Array) => {
      const sig = this.signatures.find(s => {
        return Buffer.compare(s.pubkey, pubk) === 0
      })
      return sig && sig.verifyAgainst(data)
    })
  }

  addSignature (signature :Signature): void {
    this.signatures.push(signature)
  }
}

export { Transaction }
