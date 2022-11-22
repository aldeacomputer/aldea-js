import {Instruction} from "./instructions/instruction.js";
import {Signature} from "../signature.js";
import {TxVisitor} from "./tx-visitor.js";
import {SerializeVisitor} from "./visitors/serialize-visitor.js";
import {PrivKey} from "../privkey.js";
import {PubKey} from "../pubkey.js";
import {ToObjectVisitor} from "./visitors/to-object-visitor.js";
import {
  AssignInstruction,
  CallInstruction,
  LoadInstruction,
  LockInstruction,
  NewInstruction
} from "./instructions/index.js";
import {Argument} from "./arguments/argument.js";
import {NumberArg, StringArg, VariableContent} from "./arguments/index.js";
import {blake3} from "../support/hash.js";
import {Address} from "../address.js";

const parseArgs = (args: any): Argument[] => {
  const ret = new Array<Argument>()
  args.forEach((arg: any) => {
    switch (arg.type) {
      case 'number':
        ret.push(new NumberArg(arg.value))
        break
      case 'string':
        ret.push(new StringArg(arg.value))
        break
      case 'variableContent':
        ret.push(new VariableContent(arg.value))
        break
      default:
        throw new Error(`unknown arg type: ${arg.type}`)
    }
  })
  return ret
}

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
    this.signatures.forEach(sig => visitor.visitSignature(sig))
  }

  serialize(): string {
    const serializeVisitor = new SerializeVisitor();
    this.accept(serializeVisitor)
    return serializeVisitor.toString()
  }

  sign(privKey: PrivKey): Signature {
    const signature = Signature.from(privKey, Buffer.from(this.serialize()));
    this.addSignature(signature)
    return signature
  }

  addSignature (signature: Signature): Transaction {
    this.signatures.push(signature)
    return this
  }

  isSignedBy(pubKey: Address) {
    return this.signatures.some(s => s.pubKey.toAddress().equals(pubKey))
  }

  signaturesAreValid (): boolean {
    const serialized = this.serialize()
    return this.signatures.every(sig => sig.verifyAgainst(Buffer.from(serialized)))
  }

  toPlainObject(): any {
    const toObjectVisitor = new ToObjectVisitor()
    this.accept(toObjectVisitor)
    return toObjectVisitor.build()
  }

  static fromPlainObject (plainObj: any): Transaction {
    const tx = new this()
    plainObj.instructions.forEach((inst: any) => {
      const props = inst.props
      switch (inst.type) {
        case 'assign':
          tx.add(new AssignInstruction(props.varName, props.index))
          break
        case 'new':
          tx.add(new NewInstruction(props.varName, props.moduleId, props.className, parseArgs(props.args)))
          break
        case 'call':
          tx.add(new CallInstruction(props.varName, props.methodName, parseArgs(props.args)))
          break
        case 'lock':
          tx.add(new LockInstruction(props.varName, Address.fromString(props.address)))
          break
        case 'load':
          tx.add(new LoadInstruction(props.varName, props.location, props.readOnly, props.force))
          break
        default:
          throw new Error(`unknown instruction: ${inst.type}`)
      }
    })
    plainObj.signatures.forEach((sigObj: any) => {
      tx.addSignature(new Signature(PubKey.fromHex(sigObj.pubKey), Buffer.from(sigObj.hexSig, 'hex')))
    })
    return tx
  }

  hash (): ArrayBuffer {
    return new Uint8Array(Buffer.from(blake3(Buffer.from(this.serialize())))).buffer
  }

  get id (): string {
    return Buffer.from(this.hash()).toString('hex')
  }
}
