import {BufReader, BufWriter} from "@aldea/core";
import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {TxExecution} from "./tx-execution.js";
import {AbiAccess} from "./memory/abi-helpers/abi-access.js";
import {AbiArg} from "./memory/abi-helpers/abi-method.js";

export class ArgsTranslator {
  exec: TxExecution
  private abi: AbiAccess;

  constructor (exec: TxExecution, abi: AbiAccess) {
    this.exec = exec
    this.abi = abi
  }

  fix(encoded: Uint8Array, args: AbiArg[]): Uint8Array {
    const reader = new BufReader(encoded)
    const indexes = reader.readSeq(r => r.readU8())
    const into = new BufWriter()
    const types = args.map(arg => arg.type)

    types.forEach((ty, i) => {
      if (indexes.includes(i)) {
        const idx = reader.readU16()
        const value = this.exec.stmtAt(idx).asValue()
        into.writeFixedBytes(value.lift())
      } else {
        this.translateChunk(reader, ty, into)
      }
    })

    return into.data
  }

  translateChunk(from: BufReader, ty: AbiType, into: BufWriter): void {
    switch (ty.name) {
      case 'bool':
      case 'u8':
      case 'i8':
      case 'u16':
      case 'usize':
      case 'u32':
      case 'u64':
      case 'i16':
      case 'isize':
      case 'i32':
      case 'i64':
      case 'f32':
      case 'f64':
        into.writeFixedBytes(from.readFixedBytes(ty.ownSize()))
        break
      case 'Array':
      case 'StaticArray':
        this.translateArray(from, ty, into)
        break
      case 'ArrayBuffer':
      case 'Uint8Array':
      case 'Uint16Array':
      case 'Uint32Array':
      case 'Uint64Array':
      case 'Int8Array':
      case 'Int16Array':
      case 'Int32Array':
      case 'Int64Array':
      case 'Float32Array':
      case 'Float64Array':
      case 'string':
      case 'Set':
        into.writeBytes(from.readBytes())
        break
      case 'Map':
        this.translateMap(from, ty, into)
        break
      default:
        this.translateComplexType(from, ty, into)
        break
    }
  }

  private translateArray (from: BufReader, ty: AbiType, into: BufWriter) {
    const length = from.readULEB()
    into.writeULEB(length)
    for (let i = 0; i < length; i++) {
      this.translateChunk(from, ty.args[0], into)
    }
  }

  private translateMap (from: BufReader, ty: AbiType, into: BufWriter) {
    const length = from.readULEB()
    into.writeULEB(length)
    for (let i = 0; i < length; i++) {
      this.translateChunk(from, ty.args[0], into)
      this.translateChunk(from, ty.args[1], into)
    }
  }

  private translateComplexType(from: BufReader, ty: AbiType, into: BufWriter) {
    const objDef = this.abi.objectDef(ty.name)

    if (objDef.isPresent()) {
      for (const fieldTy of objDef.get().fields) {
        this.translateChunk(from, fieldTy.type, into)
      }
      return
    } else {
      const idx = from.readU16()
      const stmt = this.exec.stmtAt(idx).asValue()
      const lifted = stmt.lift()
      into.writeFixedBytes(lifted)
    }

  }
}
