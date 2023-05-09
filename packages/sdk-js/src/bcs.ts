import { findClass, findFunction, } from './abi/query.js'
import { AbiSchema, PkgSchema } from './bcs/schemas.js'

import {
  Abi,
  ClassNode,
  CodeKind,
  ExportNode,
  FieldNode,
  FunctionNode,
  MethodKind,
  MethodNode,
  TypeNode,
} from './abi/types.js'

import {  
  BCSReader,
  BCSWriter,
  InstructionRef,
  Pointer,
  ref,
} from './internal.js'

/**
 * BCS Encoder interface.
 */
export interface BCSEncoder<T> {
  assert(val: T): void;
  decode(reader: BCSReader, type: TypeNode | TypeNode[]): T;
  encode(writer: BCSWriter, val: T, type: TypeNode | TypeNode[]): void;
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
  private jigNames: string[] = [];
  private typeEncoders = new Map<string, BCSEncoder<any>>();

  constructor(abiOrOpts: Abi | Partial<BCSOpts>, options?: Partial<BCSOpts>) {
    // Handle overloading
    if (isAbi(abiOrOpts)) {
      this.abi = abiOrOpts
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
    const reader = new BCSReader(data)
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
      const types = this.collectMethodArgTypes(method, type => {
        return this.decodeType(type, reader)
      })
      return this.decodeTypes(types, reader)
    } else {
      throw new Error(`unable to encode for ${name}`)
    }
  }

  /**
   * Encoders the given value(s) using the specified type encoder.
   */
  encode(name: string, val: any, writer = new BCSWriter()): Uint8Array {
    const encoder = this.typeEncoders.get(name)
    const { jig, method } = abiPluck(this.abi, name)

    if (encoder) {
      encoder.assert(val)
      encoder.encode.call(this, writer, val, encoder.type)
    } else if (jig) {
      const types = this.collectJigFieldTypes(jig)
      this.encodeTypes(types, val, writer)
    } else if (method) {
      const types = this.collectMethodArgTypes(method, (type) => {
        const idxs = refIndexes(val)
        this.encodeType(type as TypeNode, idxs, writer)
        return idxs
      })
      this.encodeTypes(types, val, writer)
    } else {
      throw new Error(`unable to encode for ${name}`)
    }
    
    return writer.toBytes()
  }

  /**
   * Registers the given type encoder.
   */
  registerType<T>(name: string, encoder: BCSEncoderInitParams<T>): void {
    encoder.assert ||= () => {}
    encoder.type ||= { name, nullable: false, args: [] }
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
  private decodeTypes(types: TypeNode[], reader: BCSReader): any[] {
    const result = []
    for (let i = 0; i < types.length; i++) {
      const val = this.decodeType(types[i], reader)
      result.push(val)
    }
    return result 
  }

  // Decodes the given type.
  private decodeType(type: TypeNode, reader: BCSReader): any {
    const encoder = this.typeEncoders.get(type.name)
    if (!encoder) { throw new Error(`no decoder found for: ${type.name}`) }
    const res = encoder.decode.call(this, reader, type)
    encoder.assert(res)
    return res
  }

  // Encodes the array of types and values.
  private encodeTypes(types: TypeNode[], vals: any[], writer: BCSWriter): void {
    if (types.length !== vals.length) {
      throw new Error(`BCS.encode(): invalid number of values`)
    }
    for (let i = 0; i < types.length; i++) {
      this.encodeType(types[i], vals[i], writer)
    }
  }

  // Encodes the given type and value.
  private encodeType(type: TypeNode, val: any, writer: BCSWriter): void {
    const encoder = this.typeEncoders.get(type.name)
    if (!encoder) { throw new Error(`no encoder found for: ${type.name}`) }
    encoder.assert(val)
    encoder.encode.call(this, writer, val, type)
  }

  // Collects a list of field types for the given Jig ClassNode.
  // Iterates over parents to include inherited fields too.
  private collectJigFieldTypes(jig: ClassNode): TypeNode[] {
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

    // Replace jig type fields with pointer types
    const ptrEnc = this.typeEncoders.get('Pointer') as BCSEncoder<Pointer>
    for (let i = 0; i < fields.length; i++) {
      if (this.jigNames.includes(fields[i].type.name)) {
        fields[i].type = ptrEnc.type as TypeNode
      }
    }
    
    return fields.map(f => nullableType(f.type))
  }

  // Collects list of type fields for the given MethodNode or FunctionNode.
  // Must pass a callback which returns a list of indexes for instruction references.
  private collectMethodArgTypes(method: MethodNode | FunctionNode, idxCB: (type: TypeNode) => number[]): TypeNode[] {
    const types = method.args.map(a => nullableType(a.type))
    const idxEnc = this.typeEncoders.get('_RefIndexes') as BCSEncoder<number[]>
    const refEnc = this.typeEncoders.get('_Ref') as BCSEncoder<InstructionRef>
    const idxs = idxCB(idxEnc.type as TypeNode)
    for (let i of idxs) {
      types[i] = refEnc.type as TypeNode
    }
    return types
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
      decode(reader) {
        const bytes = reader.readBytes()
        return new TextDecoder().decode(bytes)
      },
      encode(writer, val) {
        const bytes = new TextEncoder().encode(val)
        writer.writeBytes(bytes)
      }
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
        writer.writeSeq([...val], (writer, [key, val]) => {
          this.encodeType(type.args[0], key, writer)
          this.encodeType(type.args[1], val, writer)
        })
      }
    })

    this.registerType<Pointer>('Pointer', {
      assert: (val) => assert(typeof val === 'object' && !!val.idBuf, `Pointer expected. recieved: ${val}`),
      decode: (reader) => {
        const bytes = reader.readFixedSeq(34, reader => reader.readU8())
        return Pointer.fromBytes(Uint8Array.from(bytes))
      },
      encode: (writer, val) => {
        writer.writeFixedSeq([...val.toBytes()], (writer, byte) => writer.writeU8(byte))
      }
    })

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
      assert: (val) => assert(typeof val === 'object' && !!val.idx, `InstructionRef expected. recieved: ${val}`),
      decode: (reader) => ref(reader.readU16()),
      encode: (writer, val) => writer.writeU16(val.idx),
    })

    this.registerType<number[]>('_RefIndexes', {
      decode: (reader) => {
        return reader.readSeq(reader => reader.readU8())
      },
      encode: (writer, val) => {
        writer.writeSeq(val, (writer, v) => writer.writeU8(v))
      },
    })

    this.registerType<BigInt64Array>('BigInt64Array', createTypedArrayEncoder(BigInt64Array))
    this.registerType<BigUint64Array>('BigUint64Array', createTypedArrayEncoder(BigUint64Array))
    this.registerType<Float32Array>('Float32Array', createTypedArrayEncoder(Float32Array))
    this.registerType<Float64Array>('Float64Array', createTypedArrayEncoder(Float64Array))
    this.registerType<Int8Array>('Int8Array', createTypedArrayEncoder(Int8Array))
    this.registerType<Int16Array>('Int16Array', createTypedArrayEncoder(Int16Array))
    this.registerType<Int32Array>('Int32Array', createTypedArrayEncoder(Int32Array))
    this.registerType<Uint8Array>('Uint8Array', createTypedArrayEncoder(Uint8Array))
    this.registerType<Uint16Array>('Uint16Array', createTypedArrayEncoder(Uint16Array))
    this.registerType<Uint32Array>('Uint32Array', createTypedArrayEncoder(Uint32Array))
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
        let name
        switch (kind) {
          case CodeKind.CLASS:      name = 'abi_class_node'; break
          case CodeKind.FUNCTION:   name = 'abi_function_node'; break
          case CodeKind.INTERFACE:  name = 'abi_interface_node'; break
          default: throw new Error('todo')
        }
        const encoder = this.typeEncoders.get(name)
        if (!encoder) { throw new Error(`no encoder found for: ${name}`) }
        const code = encoder.decode.call(this, reader, encoder.type)
        encoder.assert(code)
        return { kind, code }
      },
      encode: (writer, val) => {
        writer.writeU8(val.kind)
        let name
        switch (val.kind) {
          case CodeKind.CLASS:      name = 'abi_class_node'; break
          case CodeKind.FUNCTION:   name = 'abi_function_node'; break
          case CodeKind.INTERFACE:  name = 'abi_interface_node'; break
          default: throw new Error('todo')
        }
        const encoder = this.typeEncoders.get(name)
        if (!encoder) { throw new Error(`no encoder found for: ${name}`) }
        encoder.assert(val)
        encoder.encode.call(this, writer, val.code, encoder.type)
      }
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
 jig: ClassNode,
 method: FunctionNode | MethodNode,
}> {
 if (!abi) return {}
 let jig: ClassNode | undefined
 let method: FunctionNode | MethodNode | undefined
 const match = name.match(/^(\w+)(\$|_)(\w+)$/)

 if (match?.length === 4) {
   const [_, jigName, sep, methodName] = match
   const kind = methodName === 'constructor' ? MethodKind.CONSTRUCTOR : (
     sep === '$' ? MethodKind.INSTANCE : MethodKind.STATIC
   )
   method = findClass(abi, jigName)?.methods.find(m => m.kind === kind && m.name === methodName)
 } else {
   jig = findClass(abi, name) || undefined
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
   throw new Error('TODO abc')
 }
 const args = type?.args || []
 if (typeof n === 'number' && args.length !== n) {
   throw new Error(`expected ${n} type argument, recieved ${args.length}`)
 }
}

// Helper function to create an encoder for the given TypedArray class.
function createTypedArrayEncoder<T>(TypedArray: { new(buf: ArrayBuffer): T }): BCSEncoderInitParams<T> {
 return {
  assert: (val) => assert(val instanceof TypedArray, `Pointer expected. recieved: ${val}`),
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
function collectJigParents(abi: Abi, jig: ClassNode): ClassNode[] {
 const parents: ClassNode[] = []
 let parent = findClass(abi, jig.extends)
 while (parent) {
   parents.unshift(parent)
   parent = findClass(abi, parent.extends)
 }
 return parents
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
function isRef(val: any): boolean {
  return val instanceof InstructionRef
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
