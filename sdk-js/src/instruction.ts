import {
  BufReader, BufWriter, Serializable,
  ImportInstruction, ImportArgsSerializer,
  LoadByRefInstruction, LoadByRefArgsSerializer,
  LoadByIdInstruction, LoadByIdArgsSerializer,
  NewInstruction, NewArgsSerializer,
  CallInstruction, CallArgsSerializer,
  ExecInstruction, ExecArgsSerializer,
  FundInstruction, FundArgsSerializer,
  LockInstruction, LockArgsSerializer,
  DeployInstruction, DeployArgsSerializer,
  SignInstruction, SignArgsSerializer,
  SignToInstruction, SignToArgsSerializer,
  UnknownInstruction
} from './internal.js'

/**
 * All OpCode bytes.
 */
export enum OpCode {
  // Loading
  IMPORT = 0xA1,
  LOADBYREF = 0xA2,
  LOADBYID = 0xA3,
  // Calling
  NEW = 0xB1,
  CALL = 0xB2,
  EXEC = 0xB3,
  // Output
  FUND = 0xC1,
  LOCK = 0xC2,
  // Code
  DEPLOY = 0xD1,
  // Cryptography
  SIGN = 0xE1,
  SIGNTO = 0xE2,
}

/**
 * Instruction base class.
 */
export class Instruction {
  opcode: OpCode;

  constructor(opcode: OpCode) {
    this.opcode = opcode
  }

  static fromBytes(bytes: Uint8Array): Instruction {
    const buf = new BufReader(bytes)
    return buf.read<Instruction>(InstructionSerializer)
  }

  toBytes(): Uint8Array {
    const buf = new BufWriter()
    buf.write<Instruction>(InstructionSerializer, this)
    return buf.data
  }
}

/**
 * Instruction Serializer object - implements the Serializable interface.
 */
export const InstructionSerializer: Serializable<Instruction> = {
  read(buf: BufReader): Instruction {
    const opcode = buf.readU8()
    const argsLen = buf.readVarInt() as number
    const argsBuf = buf.readBytes(argsLen)

    const args = new BufReader(argsBuf)

    switch(opcode) {
      case OpCode.IMPORT:
        return args.read<ImportInstruction>(ImportArgsSerializer)
      case OpCode.LOADBYREF:
        return args.read<LoadByRefInstruction>(LoadByRefArgsSerializer)
      case OpCode.LOADBYID:
        return args.read<LoadByIdInstruction>(LoadByIdArgsSerializer)
      case OpCode.NEW:
        return args.read<NewInstruction>(NewArgsSerializer)
      case OpCode.CALL:
        return args.read<CallInstruction>(CallArgsSerializer)
      case OpCode.EXEC:
        return args.read<ExecInstruction>(ExecArgsSerializer)
      case OpCode.FUND:
        return args.read<FundInstruction>(FundArgsSerializer)
      case OpCode.LOCK:
        return args.read<LockInstruction>(LockArgsSerializer)
      case OpCode.DEPLOY:
        return args.read<DeployInstruction>(DeployArgsSerializer)
      case OpCode.SIGN:
        return args.read<SignInstruction>(SignArgsSerializer)
      case OpCode.SIGNTO:
        return args.read<SignToInstruction>(SignToArgsSerializer)
      default: return new UnknownInstruction(opcode, argsBuf)
    }
  },

  write(buf: BufWriter, inst: Instruction): BufWriter {
    const args = new BufWriter()

    switch (inst.opcode) {
      case OpCode.IMPORT:
        args.write<ImportInstruction>(ImportArgsSerializer, inst as ImportInstruction)
        break
      case OpCode.LOADBYREF:
        args.write<LoadByRefInstruction>(LoadByRefArgsSerializer, inst as LoadByRefInstruction)
        break
      case OpCode.LOADBYID:
        args.write<LoadByIdInstruction>(LoadByIdArgsSerializer, inst as LoadByIdInstruction)
        break
      case OpCode.NEW:
        args.write<NewInstruction>(NewArgsSerializer, inst as NewInstruction)
        break
      case OpCode.CALL:
        args.write<CallInstruction>(CallArgsSerializer, inst as CallInstruction)
        break
      case OpCode.EXEC:
        args.write<ExecInstruction>(ExecArgsSerializer, inst as ExecInstruction)
        break
      case OpCode.FUND:
        args.write<FundInstruction>(FundArgsSerializer, inst as FundInstruction)
        break
      case OpCode.LOCK:
        args.write<LockInstruction>(LockArgsSerializer, inst as LockInstruction)
        break
      case OpCode.DEPLOY:
        args.write<DeployInstruction>(DeployArgsSerializer, inst as DeployInstruction)
        break
      case OpCode.SIGN:
        args.write<SignInstruction>(SignArgsSerializer, inst as SignInstruction)
        break
      case OpCode.SIGNTO:
        args.write<SignToInstruction>(SignToArgsSerializer, inst as SignToInstruction)
        break
      default:
        args.writeBytes((<UnknownInstruction>inst).argsBuf)
    }

    const argsBuf = args.data
    buf.writeU8(inst.opcode)
    buf.writeVarInt(argsBuf.byteLength)
    buf.writeBytes(argsBuf)
    return buf
  }
}
