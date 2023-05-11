import {
  BufReader, BufWriter, Serializable,
  ImportInstruction, ImportArgsSerializer,
  LoadInstruction, LoadArgsSerializer,
  LoadByOriginInstruction, LoadByOriginArgsSerializer,
  NewInstruction, NewArgsSerializer,
  CallInstruction, CallArgsSerializer,
  ExecInstruction, ExecArgsSerializer,
  ExecFuncInstruction, ExecFuncArgsSerializer,
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
  LOAD = 0xA2,
  LOADBYORIGIN = 0xA3,
  // Calling
  NEW = 0xB1,
  CALL = 0xB2,
  EXEC = 0xB3,
  EXECFUNC = 0xB4,
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
 * 
 * An Instruction is Aldea's smallest contiguous unit of execution. A
 * transaction consists of a `OpCode` byte and a number of arguments, depending
 * on the `OpCode`.
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
 * InstructionRef class - just a wrapper around number
 */
export class InstructionRef {
  idx: number;

  constructor(idx: number) {
    if (!Number.isInteger(idx)) throw new Error('invalid ref. must be an integer.')
    this.idx = idx
  }
}

/**
 * Wrap a number with InstructionRef
 */
export function ref(idx: number): InstructionRef {
  return new InstructionRef(idx)
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
      case OpCode.LOAD:
        return args.read<LoadInstruction>(LoadArgsSerializer)
      case OpCode.LOADBYORIGIN:
        return args.read<LoadByOriginInstruction>(LoadByOriginArgsSerializer)
      case OpCode.NEW:
        return args.read<NewInstruction>(NewArgsSerializer)
      case OpCode.CALL:
        return args.read<CallInstruction>(CallArgsSerializer)
      case OpCode.EXEC:
        return args.read<ExecInstruction>(ExecArgsSerializer)
      case OpCode.EXECFUNC:
        return args.read<ExecFuncInstruction>(ExecFuncArgsSerializer)
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
      case OpCode.LOAD:
        args.write<LoadInstruction>(LoadArgsSerializer, inst as LoadInstruction)
        break
      case OpCode.LOADBYORIGIN:
        args.write<LoadByOriginInstruction>(LoadByOriginArgsSerializer, inst as LoadByOriginInstruction)
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
      case OpCode.EXECFUNC:
        args.write<ExecFuncInstruction>(ExecFuncArgsSerializer, inst as ExecFuncInstruction)
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
