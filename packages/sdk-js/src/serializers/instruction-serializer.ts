import {Serializable} from "../serializable.js";
import {Instruction, OpCode} from "../instruction.js";
import {BufReader} from "../buf-reader.js";
import {
  CallInstruction,
  DeployInstruction,
  ExecFuncInstruction,
  ExecInstruction,
  FundInstruction,
  ImportInstruction,
  LoadByOriginInstruction,
  LoadInstruction,
  LockInstruction,
  NewInstruction,
  SignInstruction,
  SignToInstruction,
  UnknownInstruction
} from "../instructions/index.js";
import {ImportArgsSerializer} from "./import-args-serializer.js";
import {LoadArgsSerializer} from "./load-args-serializer.js";
import {LoadByOriginArgsSerializer} from "./load-by-origin-args-serializer.js";
import {NewArgsSerializer} from "./new-serializer.js";
import {CallArgsSerializer} from "./call-serializer.js";
import {ExecArgsSerializer} from "./exec-args-serializer.js";
import {ExecFuncArgsSerializer} from "./exec-func-args-serializer.js";
import {FundArgsSerializer} from "./fund-args-serializer.js";
import {LockArgsSerializer} from "./lock-serializer.js";
import {DeployArgsSerializer} from "./deploy-serializer.js";
import {SignArgsSerializer} from "./sign-args-serializer.js";
import {SignToArgsSerializer} from "./sign-to-serializer.js";
import {BufWriter} from "../buf-writer.js";

/**
 * Instruction Serializer object - implements the Serializable interface.
 */
export const InstructionSerializer: Serializable<Instruction> = {
  read(buf: BufReader): Instruction {
    const opcode = buf.readU8()
    const argsLen = buf.readVarInt() as number
    const argsBuf = buf.readBytes(argsLen)

    const args = new BufReader(argsBuf)

    switch (opcode) {
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
      default:
        return new UnknownInstruction(opcode, argsBuf)
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
