import {findClass, findFunction, findInterface,} from './abi/query.js'
import { AbiSchema, PkgSchema } from './bcs/schemas.js'

import {
  Abi,
  ClassNode,
  CodeKind,
  ExportNode,
  FieldNode,
  FunctionNode, InterfaceNode,
  MethodKind,
  MethodNode,
  TypeNode,
} from './abi/types.js'

import {  
  BufReader,
  BufWriter,
  InstructionRef,
  Pointer,
  ref,
} from './internal.js'

import { strToBytes, bytesToStr } from './support/util.js'

/**
 * BCS Encoder interface.
 */
export interface BCSEncoder<T> {
  assert(val: T): void;
  decode(reader: BufReader, type: TypeNode | TypeNode[]): T;
  encode(writer: BufWriter, val: T, type: TypeNode | TypeNode[]): void;
  type: TypeNode | TypeNode[];
}

/**
 * BCS Encoder initialisation params.
 */
export type BCSEncoderInitParams<T> = Partial<BCSEncoder<T>> & Omit<BCSEncoder<T>, 'assert' | 'type'>

/**
 * Options for instantiating an instance of BCS.
 */
export interface BCSOpts {
  addAbiTypes: boolean;
  addPkgTypes: boolean;
  addPrimitives: boolean;
}

export interface BCSMini<T> {
  decode(data: Uint8Array): T;
  encode(val: T): Uint8Array;
}

/**
 * BCS implementation for Aldea builtins and types as defined in an ABI.
 * 
 * ## Usage
 * 
 * Instantitate BCS with an ABI document. From then, any Jig or function/method
 * args can be encoded/decoded. Methods can be matched using the `<JIG_NAME>($|_)<METHOD_NAME>`
 * convention, where `$` matches an instance method and `_` matches a static method.
 * ```
 * const bcs = new BCS(abi)
 * 
 * // Encoding Jig state
 * const encoded = bcs.encode('MyJig', values)
 * const decoded = bcs.decode('MyJig', encoded)
 * 
 * // Encoding method args
 * const encoded = bcs.encode('MyJig$update', args)
 * const decoded = bcs.decode('MyJig$update', encoded)
 * ```
 * 
 * Optionally a BCS instance can be instantiated with support for serializing
 * and deserializing ABI documents and Package bundles.
 * 
 * ```
 * const bcs = new BCS({ addAbiTypes: true, addPkgTypes: true })
 * const encodedAbi = bcs.encode('abi', abi)
 * const encodedPkg = bcs.encode('pkg', pkg)
 * ```
 */
export class BCS {
  static pkg: BCSMini<[string[], Map<string, string>]> = (() => {
    const bcs = new BCS({ addPkgTypes: true })
    return {
      decode: (data) => bcs.decode('pkg', data),
      encode: (pkg) => bcs.encode('pkg', pkg),
    }
  })()

  private abi?: Abi;
  private jigNames: string[] = ['Coin', 'Jig'];
  private typeEncoders = new Map<string, BCSEncoder<any>>();

  constructor(abiOrOpts: Abi | Partial<BCSOpts>, options?: Partial<BCSOpts>) {
    // Handle overloading
    if (isAbi(abiOrOpts)) {
      this.abi = typeof structuredClone === 'function' ?
        structuredClone(abiOrOpts) :
        JSON.parse(JSON.stringify(abiOrOpts))
    } else {
      options = abiOrOpts
    }

    // Merge options with defaults
    const opts: BCSOpts = {
      addAbiTypes: false,
      addPkgTypes: false,
      addPrimitives: true,
      ...options,
    }

    if (opts.addPrimitives) { this.registerPrimitiveTypes() }
    if (opts.addAbiTypes)   { this.registerAbiTypes() }
    if (opts.addPkgTypes)   { this.registerPkgTypes() }

    this.registerMagicTypes()

    if (this.abi) {
      for (let obj of this.abi.objects) {
        this.registerObjectType(obj.name, obj.fields)
      }
      for (let ex of this.abi.exports) {
        if (ex.kind === CodeKind.CLASS || ex.kind === CodeKind.INTERFACE) {
          this.jigNames.push(ex.code.name)
        }
      }
      for (let im of this.abi.imports) {
        if (im.kind === CodeKind.CLASS || im.kind === CodeKind.INTERFACE) {
          this.jigNames.push(im.name)
        }
      }
    }
  }

  /**
   * Decodes the given data using the specified type encoder.
   */
  decode(name: string, data: Uint8Array): any {
    const reader = new BufReader(data)
    const encoder = this.typeEncoders.get(name)
    const { jig, method } = abiPluck(this.abi, name)

    if (encoder) {
      const res = encoder.decode.call(this, reader, encoder.type!)
      encoder.assert(res)
      return res
    } else if (jig) {
      const types = this.collectJigFieldTypes(jig)
      return this.decodeTypes(types, reader)
    } else if (method) {
      const idxEnc = this.typeEncoders.get('_RefIndexes') as BCSEncoder<number[]>
      const idxs: number[] = this.decodeType(idxEnc.type as TypeNode, reader)
      const types = this.collectMethodArgTypes(method, idxs)
      return this.decodeTypes(types, reader)
    } else {
      throw new Error(`unable to decode for ${name}`)
    }
  }

  /**
   * Encoders the given value(s) using the specified type encoder.
   */
  encode(name: string, val: any, writer = new BufWriter()): Uint8Array {
    const encoder = this.typeEncoders.get(name)
    const { jig, method } = abiPluck(this.abi, name)

    if (encoder) {
      encoder.assert(val)
      encoder.encode.call(this, writer, val, encoder.type)
    } else if (jig) {
      const types = this.collectJigFieldTypes(jig)
      this.encodeTypes(types, val, writer)
    } else if (method) {
      const idxs = refIndexes(val)
      const types = this.collectMethodArgTypes(method, idxs)
      const idxEnc = this.typeEncoders.get('_RefIndexes') as BCSEncoder<number[]>
      this.encodeType(idxEnc.type as TypeNode, idxs, writer)
      this.encodeTypes(types, val, writer)
    } else {
      throw new Error(`unable to encode for ${name}`)
    }
    
    return writer.toBytes()
  }

  /**
   * Returns the registered `BCSEncoder` for the given type name.
   */
  getTypeEncoder<T>(name: string): BCSEncoder<T> {
    const encoder = this.typeEncoders.get(name)
    if (!encoder) { throw new Error(`no encoder found for: ${name}`) }
    return encoder
  }

  /**
   * Registers the given type encoder.
   */
  registerType<T>(name: string, encoder: BCSEncoderInitParams<T>): void {
    encoder.assert = encoder.assert || (() => {})
    encoder.type = encoder.type || { name, nullable: false, args: [] }
    this.typeEncoders.set(name, encoder as BCSEncoder<T>)
  }

  /**
   * Registers the given array of FieldNode's as an object type encoder.
   */
  registerObjectType(name: string, fields: FieldNode[]): void {
    const types = fields.map(f => nullableType(f.type))
    this.registerType<{[name: string]: any}>(name, {
      assert: (val) => assert(typeof val === 'object', `object expected. recieved: ${val}`),
      decode: (reader) => {
        let obj: {[name: string]: any} = {}
        for (let i = 0; i < fields.length; i++) {
          const key = fields[i].name
          obj[key] = this.decodeType(types[i], reader)
        }
        return obj
      },
      encode: (writer, val) => {
        for (let i = 0; i < fields.length; i++) {
          const key = fields[i].name
          this.encodeType(types[i], val[key], writer)
        }
      },
      type: types
    })
  }

  /**
   * Registers the given array of TypeNode's as a tuple type encoder.
   * 
   * The work tuple is used here to describe a fixed length list of variable
   * types. In terms of Aldea, this would apple to function/method arguments.
   */
  registerTupleType(name: string, types: TypeNode[]): void {
    types = types.map(nullableType)
    this.registerType<any[]>(name, {
      assert: (val) => assert(Array.isArray(val), `Array expected. recieved: ${val}`),
      decode: (reader) => {
        return this.decodeTypes(types, reader)
      },
      encode: (writer, val) => {
        this.encodeTypes(types, val, writer)
      }
    })
  }

  // Decodes the array of types.
  private decodeTypes(types: TypeNode[], reader: BufReader): any[] {
    const result = []
    for (let i = 0; i < types.length; i++) {
      const val = this.decodeType(types[i], reader)
      result.push(val)
    }
    return result 
  }

  // Decodes the given type.
  private decodeType(type: TypeNode, reader: BufReader): any {
    const encoder = this.getTypeEncoder(type.name)
    const res = encoder.decode.call(this, reader, type)
    encoder.assert(res)
    return res
  }

  // Encodes the array of types and values.
  private encodeTypes(types: TypeNode[], vals: any[], writer: BufWriter): void {
    if (types.length !== vals.length) {
      throw new Error(`expected ${ types.length } values, recieved: ${ vals.length }`)
    }
    for (let i = 0; i < types.length; i++) {
      this.encodeType(types[i], vals[i], writer)
    }
  }

  // Encodes the given type and value.
  private encodeType(type: TypeNode, val: any, writer: BufWriter): void {
    const encoder = this.getTypeEncoder(type.name)
    encoder.assert(val)
    encoder.encode.call(this, writer, val, type)
  }

  // Collects a list of field types for the given Jig ClassNode.
  // Iterates over parents to include inherited fields too.
  private collectJigFieldTypes(jig: ClassNode | InterfaceNode): TypeNode[] {
    const fields: FieldNode[] = []

    // Collect parent fields
    if (this.abi) {
      const parents = collectJigParents(this.abi, jig)
      for (let parent of parents) {
        for (let field of parent.fields) {
          if (fields.findIndex(f => f.name == field.name) < 0) {
            fields.push(field)
          }
        }
      }
    }

    // Collect jig fields
    for (let field of jig.fields) {
      if (fields.findIndex(f => f.name == field.name) < 0) {
        fields.push(field)
      }
    }

    // Recursively replace jig types with pointer types
    const types = fields.map(f => jigToPointerType(f.type, this.jigNames))
    return types.map(nullableType)
  }


  // Collects list of type fields for the given MethodNode or FunctionNode.
  // Wraps each type as a refType which prefixes each value with a boolean to
  // determine if it is an InstructionRef
  private collectMethodArgTypes(method: MethodNode | FunctionNode, idxs: number[]): TypeNode[] {
    const types = method.args.map(a => jigToRefType(a.type, this.jigNames))

    for (let i of idxs) {
      if (types[i].name === '_Ref') {
        // If type is already a _Ref, remove index
        idxs.splice(i, 1)
      } else {
        // Otherwise replace the type with a _Ref
        types[i] = { name: '_Ref', nullable: types[i].nullable, args: [] }
      }
    }

    return types.map(nullableType)
  }

  // Registers the Aldea primitive types.
  private registerPrimitiveTypes(): void {
    this.registerType<boolean>('bool', {
      assert: (val) => assert(typeof val === 'boolean', `boolean expected. recieved: ${val}`),
      decode: (reader) => reader.readBool(),
      encode: (writer, val) => writer.writeBool(val),
    })

    this.registerType<number>('f32', {
      assert: (val) => assert(isNumber(val), `number expected. recieved: ${val}`),
      decode: (reader) => reader.readF32(),
      encode: (writer, val) => writer.writeF32(val),
    })

    this.registerType<number>('f64', {
      assert: (val) => assert(isNumber(val), `number expected. recieved: ${val}`),
      decode: (reader) => reader.readF64(),
      encode: (writer, val) => writer.writeF64(val),
    })

    this.registerType<number | bigint>('i8', {
      assert: (val) => assert(isNumber(val), `number expected. recieved: ${val}`),
      decode: (reader) => reader.readI8(),
      encode: (writer, val) => writer.writeI8(val),
    })

    this.registerType<number | bigint>('i16', {
      assert: (val) => assert(isNumber(val), `number expected. recieved: ${val}`),
      decode: (reader) => reader.readI16(),
      encode: (writer, val) => writer.writeI16(val),
    })

    this.registerType<number | bigint>('i32', {
      assert: (val) => assert(isNumber(val), `number expected. recieved: ${val}`),
      decode: (reader) => reader.readI32(),
      encode: (writer, val) => writer.writeI32(val),
    })

    this.registerType<number | bigint>('i64', {
      assert: (val) => assert(isNumber(val), `number expected. recieved: ${val}`),
      decode: (reader) => reader.readI64(),
      encode: (writer, val) => writer.writeI64(val),
    })

    this.registerType<number | bigint>('u8', {
      assert: (val) => assert(isNumber(val), `number expected. recieved: ${val}`),
      decode: (reader) => reader.readU8(),
      encode: (writer, val) => writer.writeU8(val),
    })

    this.registerType<number | bigint>('u16', {
      assert: (val) => assert(isNumber(val), `number expected. recieved: ${val}`),
      decode: (reader) => reader.readU16(),
      encode: (writer, val) => writer.writeU16(val),
    })

    this.registerType<number | bigint>('u32', {
      assert: (val) => assert(isNumber(val), `number expected. recieved: ${val}`),
      decode: (reader) => reader.readU32(),
      encode: (writer, val) => writer.writeU32(val),
    })

    this.registerType<number | bigint>('u64', {
      assert: (val) => assert(isNumber(val), `number expected. recieved: ${val}`),
      decode: (reader) => reader.readU64(),
      encode: (writer, val) => writer.writeU64(val),
    })

    this.registerType<string>('string', {
      assert: (val) => assert(typeof val === 'string', `string expected. recieved: ${val}`),
      decode: (reader) => bytesToStr(reader.readBytes()),
      encode: (writer, val) => writer.writeBytes(strToBytes(val)),
    })

    this.registerType<ArrayBuffer>('ArrayBuffer', {
      assert: (val) => assert(val.constructor.name === 'ArrayBuffer', `ArrayBuffer expected. recieved: ${val}`),
      decode(reader) {
        const bytes = reader.readSeq(reader => reader.readU8())
        return Uint8Array.from(bytes).buffer
      },
      encode(writer, val) {
        const bytes = new Uint8Array(val)
        writer.writeSeq([...bytes], (writer, byte) => { writer.writeU8(byte) })
      }
    })

    this.registerType<Array<any>>('Array', {
      assert: (val) => assert(Array.isArray(val), `Array expected. recieved: ${val}`),
      decode: (reader, type) => {
        assertTypeNode(type, 1)
        return reader.readSeq(reader => this.decodeType(type.args[0], reader))
      },
      encode: (writer, val, type) => {
        assertTypeNode(type, 1)
        writer.writeSeq(val, (writer, el) => {
          this.encodeType(type.args[0], el, writer)
        })
      }
    })

    this.registerType<Array<any>>('StaticArray', {
      assert: (val) => assert(Array.isArray(val), `Array expected. recieved: ${val}`),
      decode: (reader, type) => {
        assertTypeNode(type, 1)
        return reader.readSeq(reader => this.decodeType(type.args[0], reader))
      },
      encode: (writer, val, type) => {
        assertTypeNode(type, 1)
        writer.writeSeq(val, (writer, el) => {
          this.encodeType(type.args[0], el, writer)
        })
      }
    })

    this.registerType<Set<any>>('Set', {
      assert: (val) => assert(val.constructor.name === 'Set', `Set expected. recieved: ${val}`),
      decode: (reader, type) => {
        assertTypeNode(type, 1)
        const set = new Set()
        reader.readSeq(reader => {
          set.add(this.decodeType(type.args[0], reader))
        })
        return set
      },
      encode: (writer, val, type) => {
        assertTypeNode(type, 1)
        writer.writeSeq([...val], (writer, el) => {
          this.encodeType(type.args[0], el, writer)
        })
      }
    })

    this.registerType<Map<any, any>>('Map', {
      assert: (val) => assert(val.constructor.name === 'Map', `Map expected. recieved: ${val}`),
      decode: (reader, type) => {
        assertTypeNode(type, 2)
        const map = new Map()
        reader.readSeq(reader => {
          map.set(
            this.decodeType(type.args[0], reader),
            this.decodeType(type.args[1], reader),
          )
        })
        return map
      },
      encode: (writer, val, type) => {
        assertTypeNode(type, 2)
        const canonicalKeys = [...val.keys()].sort()
        writer.writeSeq(canonicalKeys, (writer, key) => {
          this.encodeType(type.args[0], key, writer)
          this.encodeType(type.args[1], val.get(key), writer)
        })
      }
    })

    this.registerType<Pointer>('Pointer', {
      assert: (val) => {
        const bool = typeof val === 'object' && val.idBuf?.length === 32
        return assert(bool, `Pointer expected. recieved: ${val}`)
      },
      decode: (reader) => {
        const bytes = reader.readFixedSeq(34, reader => reader.readU8())
        return Pointer.fromBytes(Uint8Array.from(bytes))
      },
      encode: (writer, val) => {
        writer.writeFixedSeq([...val.toBytes()], (writer, byte) => writer.writeU8(byte))
      }
    })

    this.registerType<BigInt64Array>('Int64Array', createTypedArrayEncoder(BigInt64Array))
    this.registerType<BigUint64Array>('Uint64Array', createTypedArrayEncoder(BigUint64Array))
    this.registerType<Float32Array>('Float32Array', createTypedArrayEncoder(Float32Array))
    this.registerType<Float64Array>('Float64Array', createTypedArrayEncoder(Float64Array))
    this.registerType<Int8Array>('Int8Array', createTypedArrayEncoder(Int8Array))
    this.registerType<Int16Array>('Int16Array', createTypedArrayEncoder(Int16Array))
    this.registerType<Int32Array>('Int32Array', createTypedArrayEncoder(Int32Array))
    this.registerType<Uint8Array>('Uint8Array', createTypedArrayEncoder(Uint8Array))
    this.registerType<Uint16Array>('Uint16Array', createTypedArrayEncoder(Uint16Array))
    this.registerType<Uint32Array>('Uint32Array', createTypedArrayEncoder(Uint32Array))
  }

  // Registers Aldea types
  private registerMagicTypes(): void {
    this.registerType<any>('_Option', {
      decode: (reader, type) => {
        assertTypeNode(type, 1)
        return reader.readBool() ? this.decodeType(type.args[0], reader) : null
      },
      encode: (writer, val, type) => {
        assertTypeNode(type, 1)
        writer.writeBool(!!val)
        if (!!val) this.encodeType(type.args[0], val, writer)
      }
    })

    this.registerType<InstructionRef>('_Ref', {
      assert: (val) => assert(isRef(val), `InstructionRef expected. recieved: ${val}`),
      decode: (reader) => ref(reader.readU16()),
      encode: (writer, val) => writer.writeU16(val.idx),
    })

    this.registerType<number[]>('_RefIndexes', {
      decode: (reader) => {
        return reader.readSeq(reader => reader.readU8())
      },
      encode: (writer, val) => {
        writer.writeSeq(val, (writer, v) => writer.writeU8(v))
      }
    })
  }

  // Registers types for an ABI (an ABI of the ABI)
  private registerAbiTypes(): void {
    for (let [name, fields] of Object.entries(AbiSchema)) {
      this.registerObjectType(name, fields)
    }
    this.registerType<ExportNode>('abi_export_node', {
      assert: (val) => typeof val === 'object',
      decode: (reader) => {
        const kind = reader.readU8()
        const name = getCodeKindNodeName(kind)
        const encoder = this.getTypeEncoder(name)
        const code = encoder.decode.call(this, reader, encoder.type)
        encoder.assert(code)
        return { kind, code } as ExportNode
      },
      encode: (writer, val) => {
        writer.writeU8(val.kind)
        const name = getCodeKindNodeName(val.kind)
        const encoder = this.getTypeEncoder(name)
        encoder.assert(val)
        encoder.encode.call(this, writer, val.code, encoder.type)
      },
    })
  }

  // Registers types for a code package.
  private registerPkgTypes(): void {
    this.registerTupleType('pkg', PkgSchema)
  }
}

// Trys to find either a jig, function, or method from the abi matching the
// specified name.
function abiPluck(abi: Abi | undefined, name: string): Partial<{
 jig: ClassNode | InterfaceNode,
 method: FunctionNode | MethodNode,
}> {
 if (!abi) return {}
 let jig: ClassNode | InterfaceNode | undefined
 let method: FunctionNode | MethodNode | undefined
 const match = name.match(/^(\w+)(\$|_)(\w+)$/)

 if (match?.length === 4) {
   const [_, jigName, sep, methodName] = match
   const node = abi.exports.find(a => a.code.name === jigName)
   if (node && node.kind === CodeKind.CLASS) {
     const klass = node.code as ClassNode
     const kind = methodName === 'constructor' ? MethodKind.CONSTRUCTOR : (sep === '$' ? MethodKind.INSTANCE : MethodKind.STATIC)
     method = klass.methods.find(m => m.kind === kind && m.name === methodName)
   }
   if (node && node.kind === CodeKind.INTERFACE) {
     const int = node.code as InterfaceNode
     method = int.methods.find(m => m.name === methodName)
   }
 } else {
   jig = findClass(abi, name) || undefined
   if (!jig) {
     jig = findInterface(abi, name) || undefined
   }
   method = findFunction(abi, name) || undefined
 }

 return { jig, method }
}

// Asserts the given bool is true.
function assert(bool: boolean, msg: string = 'invalid type for encoder'): asserts bool is true {
  if (!bool) throw new Error(msg)
}

// Asserts the given TypeNode is not an array of TypeNodes.
// Optionally can be given a number to assert the length of type arguments.
function assertTypeNode(type: TypeNode | TypeNode[], n?: number): asserts type is TypeNode {
 if (Array.isArray(type)) {
   throw new Error('expected TypeNode')
 }
 const args = type?.args || []
 if (typeof n === 'number' && args.length !== n) {
   throw new Error(`expected ${n} type arguments, recieved: ${args.length}`)
 }
}

// Helper function to create an encoder for the given TypedArray class.
function createTypedArrayEncoder<T>(TypedArray: { new(buf: ArrayBuffer): T }): BCSEncoderInitParams<T> {
 return {
  assert: (val) => assert(val instanceof TypedArray, `TypedArray expected. recieved: ${val}`),
   decode: (reader) => {
     const bytes = Uint8Array.from(reader.readSeq(reader => reader.readU8()))
     return new TypedArray(bytes.buffer)
   },
   encode(writer, val) {
     const abv = val as ArrayBufferView
     const bytes = new Uint8Array(abv.buffer, abv.byteOffset, abv.byteLength)
     writer.writeSeq([...bytes], (writer, byte) => writer.writeU8(byte))
   }
 }
}

// Collects the parents of the given jig ClassNode.
function collectJigParents(abi: Abi, jig: ClassNode | InterfaceNode): ClassNode[] {
 const parents: ClassNode[] = []
 let parent = findClass(abi, jig.extends || 'Jig')
 while (parent) {
   parents.unshift(parent)
   parent = findClass(abi, parent.extends)
 }
 return parents
}

// Returns type name for the given code kind.
function getCodeKindNodeName(kind: CodeKind): string {
  switch (kind) {
    case CodeKind.CLASS:      return 'abi_class_node'
    case CodeKind.FUNCTION:   return 'abi_function_node'
    case CodeKind.INTERFACE:  return 'abi_interface_node'
    default: throw new Error(`invalid ABI code kind: ${kind}`)
  }
}

// Returns true if the given value is an ABI object.
function isAbi(obj: any): obj is Abi {
  return typeof obj === 'object' &&
    ['version', 'exports', 'imports', 'objects', 'typeIds'].every(k => k in obj) 
}

// Returns true if the given val is a number or bigint.
function isNumber(val: number | bigint): val is number | bigint {
  return typeof val === 'number' || typeof val === 'bigint'
}
 
// Returns true if the given val is an InstructionRef instance.
function isRef(val: any): val is InstructionRef {
  return val && typeof val === 'object' && isNumber(val.idx) && val[Symbol.toStringTag] === 'InstructionRef'
}

// If the type is a jig, replace with `Pointer` type node.
function jigToPointerType(type: TypeNode, jigNames: string[]): TypeNode {
  if (jigNames.includes(type.name)) {
    return { name: 'Pointer', nullable: type.nullable, args: [] }
  } else {
    const copy = { ...type }
    copy.args = type.args.map(t => jigToPointerType(t, jigNames))
    return copy
  }
}

// If the type is a jig, replace with `_Ref` type node
function jigToRefType(type: TypeNode, jigNames: string[]): TypeNode {
  if (jigNames.includes(type.name)) {
    return { name: '_Ref', nullable: type.nullable, args: [] }
  } else {
    const copy = { ...type }
    copy.args = type.args.map(t => jigToRefType(t, jigNames))
    return copy
  }
}

// Wraps the given type in an `_Option` if it is nullable.
function nullableType(type: TypeNode): TypeNode {
 if (type.nullable) {
   const copy = { ...type, nullable: false }
   return { name: '_Option', nullable: false, args: [copy]}
 } else {
   return type
 } 
}

// Returns a list of indexes of InstructionRef instances in the give list of args.
function refIndexes(args: any[]): number[] {
  return args.reduce((idxs, arg, i) => {
    if (isRef(arg)) { idxs.push(i) }
    return idxs
  }, [])
}
