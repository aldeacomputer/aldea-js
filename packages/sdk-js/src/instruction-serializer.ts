import {Serializable} from "./serializable.js";
import {BufReader} from "./buf-reader.js";
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
} from "./instructions/index.js";
import {BufWriter} from "./buf-writer.js";
import {Instruction, OpCode, refTagger, refUntagger} from "./instruction.js";
import {CBOR, Sequence} from "cbor-redux";
import {decodeCbor} from "./instructions/decode-cbor.js";

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

/**
 * Exec Args Serializer object - implements the Serializable interface.
 */
export const ExecFuncArgsSerializer: Serializable<ExecFuncInstruction> = {
  read(buf: BufReader): ExecFuncInstruction {
    const idx = buf.readU16()
    const exportIdx = buf.readU16()
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = CBOR.decode(cborDataBuf, refUntagger, {mode: 'sequence'})

    return new ExecFuncInstruction(idx, exportIdx, args.data)
  },

  write(buf: BufWriter, instruction: ExecFuncInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence(instruction.args), refTagger)
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.exportIdx)
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}
/**
 * Sign Args Serializer object - implements the Serializable interface.
 */
export const SignArgsSerializer: Serializable<SignInstruction> = {
  read(buf: BufReader): SignInstruction {
    const sig = buf.readBytes(64)
    const pubkey = buf.readBytes(32)
    return new SignInstruction(sig, pubkey)
  },

  write(buf: BufWriter, instruction: SignInstruction): BufWriter {
    buf.writeBytes(instruction.sig)
    buf.writeBytes(instruction.pubkey)
    return buf
  }
}

/**
 * Load By Origin Args Serializer object - implements the Serializable interface.
 */
export const LoadByOriginArgsSerializer: Serializable<LoadByOriginInstruction> = {
  read(buf: BufReader): LoadByOriginInstruction {
    const origin = buf.readBytes(36)
    return new LoadByOriginInstruction(origin)
  },

  write(buf: BufWriter, instruction: LoadByOriginInstruction): BufWriter {
    buf.writeBytes(instruction.origin)
    return buf
  }
}
/**
 * Lock Args Serializer object - implements the Serializable interface.
 */
export const LockArgsSerializer: Serializable<LockInstruction> = {
  read(buf: BufReader): LockInstruction {
    const idx = buf.readU16()
    const pubkeyHash = buf.readBytes(20)
    return new LockInstruction(idx, pubkeyHash)
  },

  write(buf: BufWriter, instruction: LockInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    buf.writeBytes(instruction.pubkeyHash)
    return buf
  }
}
/**
 * Deploy Args Serializer object - implements the Serializable interface.
 */
export const DeployArgsSerializer: Serializable<DeployInstruction> = {
  read(buf: BufReader): DeployInstruction {
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = CBOR.decode(cborDataBuf, null, {mode: 'sequence', dictionary: 'map'})

    return new DeployInstruction(args.data[0], args.data[1])
  },

  write(buf: BufWriter, inst: DeployInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence([inst.entry.sort(), inst.code]))
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}
/**
 * Sign To Args Serializer object - implements the Serializable interface.
 */
export const SignToArgsSerializer: Serializable<SignToInstruction> = {
  read(buf: BufReader): SignToInstruction {
    const sig = buf.readBytes(64)
    const pubkey = buf.readBytes(32)
    return new SignToInstruction(sig, pubkey)
  },

  write(buf: BufWriter, instruction: SignToInstruction): BufWriter {
    buf.writeBytes(instruction.sig)
    buf.writeBytes(instruction.pubkey)
    return buf
  }
}

/**
 * Call Args Serializer object - implements the Serializable interface.
 */
export const CallArgsSerializer: Serializable<CallInstruction> = {
  read(buf: BufReader): CallInstruction {
    const idx = buf.readU16()
    const methodIdx = buf.readU16()
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = CBOR.decode(cborDataBuf, refUntagger, {mode: 'sequence'})

    return new CallInstruction(idx, methodIdx, args.data)
  },

  write(buf: BufWriter, instruction: CallInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence(instruction.args), refTagger)
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.methodIdx)
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}
/**
 * New Args Serializer object - implements the Serializable interface.
 */
export const NewArgsSerializer: Serializable<NewInstruction> = {
  read(buf: BufReader): NewInstruction {
    const idx = buf.readU16()
    const exportIdx = buf.readU16()
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = decodeCbor(cborDataBuf) //  CBOR.decode(cborDataBuf, refUntagger, { mode: 'sequence' })

    return new NewInstruction(idx, exportIdx, args)
  },

  write(buf: BufWriter, instruction: NewInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence(instruction.args), refTagger)
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.exportIdx)
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}
/**
 * Fund Args Serializer object - implements the Serializable interface.
 */
export const FundArgsSerializer: Serializable<FundInstruction> = {
  read(buf: BufReader): FundInstruction {
    const idx = buf.readU16()
    return new FundInstruction(idx)
  },

  write(buf: BufWriter, instruction: FundInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    return buf
  }
}
/**
 * Load Args Serializer object - implements the Serializable interface.
 */
export const LoadArgsSerializer: Serializable<LoadInstruction> = {
  read(buf: BufReader): LoadInstruction {
    const outputId = buf.readBytes(32)
    return new LoadInstruction(outputId)
  },

  write(buf: BufWriter, instruction: LoadInstruction): BufWriter {
    buf.writeBytes(instruction.outputId)
    return buf
  }
}
/**
 * Import Args Serializer object - implements the Serializable interface.
 */
export const ImportArgsSerializer: Serializable<ImportInstruction> = {
  read(buf: BufReader): ImportInstruction {
    const pkgId = buf.readBytes(32)
    return new ImportInstruction(pkgId)
  },

  write(buf: BufWriter, inst: ImportInstruction): BufWriter {
    buf.writeBytes(inst.pkgId)
    return buf
  }
}
/**
 * Exec Args Serializer object - implements the Serializable interface.
 */
export const ExecArgsSerializer: Serializable<ExecInstruction> = {
  read(buf: BufReader): ExecInstruction {
    const idx = buf.readU16()
    const exportIdx = buf.readU16()
    const methodIdx = buf.readU16()
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = CBOR.decode(cborDataBuf, refUntagger, {mode: 'sequence'})

    return new ExecInstruction(idx, exportIdx, methodIdx, args.data)
  },

  write(buf: BufWriter, instruction: ExecInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence(instruction.args), refTagger)
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.exportIdx)
    buf.writeU16(instruction.methodIdx)
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}
