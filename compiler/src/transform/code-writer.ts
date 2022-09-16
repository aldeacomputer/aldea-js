import { ClassNode } from "./class-node.js"
import { ClassMethod } from "./class-method.js"
import { ClassField } from "./class-field.js"

const AS_INT_TYPES = [
  'i8',
  'i16',
  'i32',
  'i64',
  'isize',
  'u8',
  'u16',
  'u32',
  'u64',
  'usize',
]


/**
 * Writes a class wrapper for the specific Class, around the given member
 * strings. Returns an AssemblyScript string.
 */
export function writeClassWrapper(obj: ClassNode, members: string[]): string {
  return `
  class ${obj.name} {
    ${members.join('\n')}
  }
  `.trim()
}


/**
 * Writes a deserialize static method for the given Class. Returns an
 * AssemblyScript string.
 * 
 * - Decodes the given serialized props
 * - Writes the props into memory
 * - Returns the pointer as a instance
 */
export function writeDeserializeStaticMethod(obj: ClassNode): string {
  return `
  static deserialize(argBuf: Uint8Array): ${obj.name} {
    ${ writeArgReader(obj.fields, obj) }
    ${ writePtrWriter(obj.fields, obj) }
    return changetype<${obj.name}>(ptr)
  }
  `.trim()
}


/**
 * Writes a serialize instance method for the given Class. Returns an
 * AssemblyScript string.
 * 
 * - Encodes all props in sequence
 * - Returns the CBOR-encoded sequence
 */
export function writeSerializeInstanceMethod(obj: ClassNode): string {
  obj.fields.forEach(f => f.name = `this.${f.name}`)
  return `
  serialize(): Uint8Array {
    ${ writeReturnWriter(obj.fields, obj) }
  }
  `.trim()
}


/**
 * Writes an exported module function for the given ClassMethod. Returns an
 * AssemblyScript string.
 * 
 * - Decodes the given arguments
 * - Calls the native function
 * - Encodes the return value
 */
export function writeExportMethod(method: ClassMethod, obj: ClassNode): string {
  const separator = method.isConstructor || method.isStatic ? '_' : '$'

  const argReaderChunks = ['const args = new CborReader(argBuf)']
  if (!method.isConstructor && !method.isStatic) {
    argReaderChunks.push(`const ${ obj.iName } = args.${ decodeMethod(new ClassField(obj.iName, obj.name), true) }`)
  }

  const returnType = method.isConstructor ? obj.name : method.returnType

  return `
  export function ${ obj.name }${ separator }${ method.name } (argBuf: Uint8Array): Uint8Array {
    ${ writeArgReader(method.args, obj, argReaderChunks) }
    ${ writeMethodCall(method, obj) }
    ${ writeReturnWriter(new ClassField('ctx', returnType), obj) }
  }
  `.trim()
}


/**
 * Writes an exported module function to parse the given class. Returns an
 * AssemblyScript string.
 * 
 * - Calls deserialize on the the class
 * - Encodes and returns the instance as a Ptr
 */
export function writeExportDeserializeMethod(obj: ClassNode): string {
  return `
  export function ${ obj.name }_deserialize(argBuf: Uint8Array): Uint8Array {
    const ${obj.iName} = ${ obj.name }.deserialize(argBuf)
    ${ writeReturnWriter(new ClassField(obj.iName, obj.name), obj) }
  }
  `.trim()
}


/**
 * Writes an exported module function to serialize an instance of the given class.
 * Returns an AssemblyScript string.
 * 
 * - Decodes the given arguments
 * - Encodes the return value (all instance props)
 */
export function writeExportSerializeMethod(obj: ClassNode): string {
  obj.fields.forEach(f => f.name = `${obj.iName}.${f.name}`)
  return `
  export function ${ obj.name }$serialize(argBuf: Uint8Array): Uint8Array {
    const args = new CborReader(argBuf)
    const ${ obj.iName } = args.decodeRef<${ obj.name }>()
    return ${ obj.iName }.serialize()
  }
  `.trim()
}


/**
 * Writes statements to decode the given array of fields from a CborReader.
 * Returns an AssemblyScript string.
 */
export function writeArgReader(
  fields: ClassField[] | ClassField,
  obj: ClassNode,
  chunks: string[] = ['const args = new CborReader(argBuf)']
): string {
  if (!Array.isArray(fields)) { fields = [fields]}
  if (!fields.length) {
    return ''
  }

  return fields.reduce((chunks: string[], field: ClassField, i: number): string[] => {
    const isRef = field.type === obj.name
    chunks.push(`const a${ i } = args.${ decodeMethod(field, isRef) }`)
    return chunks
  }, chunks).join('\n')
}


/**
 * Writes statements to create a pointer for the given class and write the list
 * of fields to the pointer's memory. Returns an AssemblyScript string.
 */
export function writePtrWriter(
  fields: ClassField[],
  obj: ClassNode,
  chunks: string[] = [`const ptr = __new(offsetof<${ obj.name }>(), idof<${ obj.name }>())`]
): string {
  return fields.reduce((chunks: string[], field: ClassField, i: number): string[] => {
    const type = AS_INT_TYPES.includes(field.type) ? field.type : 'usize'
    const val = AS_INT_TYPES.includes(field.type) ? `a${ i }` : `changetype<usize>(a${ i })`

    chunks.push(`store<${ type }>(ptr + offsetof<${ obj.name }>('${ field.name }'), ${ val })`)
    return chunks
  }, chunks).join('\n')
}


/**
 * Writes statements to encode the given field or array of fields in a Cbor buffer.
 * Returns an AssemblyScript string.
 */
export function writeReturnWriter(fields: ClassField[] | ClassField, obj: ClassNode): string {
  if (!Array.isArray(fields)) { fields = [fields] }
  if (!fields.length || fields.length == 1 && fields[0].type === 'void') {
    return 'return new Uint8Array(0)'
  }

  const chunks = fields.reduce((chunks: string[], field: ClassField): string[] => {
    const isRef = field.type === obj.name
    chunks.push(`retBuf.${ encodeMethod(field, isRef) }`)
    return chunks
  }, ['const retBuf = new CborWriter()'])

  chunks.push('return retBuf.toBuffer()')
  return chunks.join('\n')
}


/**
 * Writes a statement to call a method on the given class. Can be a constructor,
 * static or instance method. Returns an AssemblyScript string.
 */
export function writeMethodCall(method: ClassMethod, obj: ClassNode): string {
  const prefix = method.returnType === 'void' ? '' : 'const ctx = '
  const args = method.args.map((_a, i: number) => `a${ i }`).join(', ')
  if (method.isConstructor) {
    return `${ prefix }new ${ obj.name }(${ args })`
  } else if (method.isStatic) {
    return `${ prefix }${ obj.name }.${ method.name }(${ args })`
  } else {
    return `${ prefix }${ obj.iName }.${ method.name }(${ args })`
  }
}


/**
 * Writes the appropriate Cbor decode function statement for the given field.
 * Returns an AssemblyScript string.
 */
function decodeMethod(field: ClassField, isRef: boolean = false): string {
  switch (field.type) {
    case 'i8':
    case 'i16':
    case 'i32':
    case 'i64':
    case 'isize':
    case 'u8':
    case 'u16':
    case 'u32':
    case 'u64':
    case 'usize':
      return `decodeInt() as ${ field.type }`

    case 'string':
      return 'decodeStr()'

    case 'Uint8Array':
      return 'decodeBuf()'
    
    default:
      if (isRef) {
        return `decodeRef<${ field.type }>()`
      } else {
        throw new Error(`unsupported type: ${ field.type } (cbor decode)`)
      }
  }
}


/**
 * Writes the appropriate Cbor encode function statement for the given field.
 * Returns an AssemblyScript string.
 */
function encodeMethod(field: ClassField, isRef: boolean = false): string {
  switch(field.type) {
    case 'i8':
    case 'i16':
    case 'i32':
    case 'i64':
    case 'isize':
    case 'u8':
    case 'u16':
    case 'u32':
    case 'u64':
    case 'usize':
      return `encodeInt(${ field.name })`

    case 'string':
      return `encodeStr(${ field.name })`

    case 'Uint8Array':
      return `encodeBuf(${ field.name })`

    default:
      if (isRef) {
        return `encodeRef<${ field.type }>(${ field.name })`
      } else {
        throw new Error(`unsupported type: ${ field.type } (cbor encode)`)
      }
  }
}
