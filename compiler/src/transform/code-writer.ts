import { JigClass } from "./jig-class.js"
import { JigMethod } from "./jig-method.js"
import { JigField } from "./jig-field.js"

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
 * Writes an exported module function for the given JigMethod. Returns an
 * AssemblyScript string.
 * 
 * - Decodes the given arguments
 * - Calls the native function
 * - Encodes the return value
 */
export function writeJigMethod(method: JigMethod, jig: JigClass): string {
  const prefix = method.isConstructor || method.isStatic ? '$_' : '$$'

  const argReaderChunks = ['const args = new CborReader(argBuf)']
  if (!method.isConstructor && !method.isStatic) {
    argReaderChunks.push(`const ${ jig.iName } = args.${ decodeMethod(new JigField(jig.iName, jig.name), true) }`)
  }

  const returnType = method.isConstructor ? jig.name : method.returnType

  return `
  export function ${ prefix }${ method.name } (argBuf: Uint8Array): Uint8Array {
    ${ writeArgReader(method.args, jig, argReaderChunks) }
    ${ writeMethodCall(method, jig) }
    ${ writeReturnWriter(new JigField('retVal', returnType), jig) }
  }
  `.trim()
}


/**
 * Writes an exported module function to parse the given class. Returns an
 * AssemblyScript string.
 * 
 * - Decodes the given serialized props
 * - Writes the props into memory
 * - Encodes the return value (ptr)
 */
export function writeParseMethod(jig: JigClass): string {
  return `
  export function $_parse(argBuf: Uint8Array): Uint8Array {
    ${ writeArgReader(jig.fields, jig) }
    ${ writePtrWriter(jig.fields, jig) }
    ${ writeReturnWriter(new JigField('ptr', 'u32'), jig) }
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
export function writeSerializeMethod(jig: JigClass): string {
  jig.fields.forEach(f => f.name = `${jig.iName}.${f.name}`)
  return `
  export function $$serialize(argBuf: Uint8Array): Uint8Array {
    ${ writeArgReader(new JigField(jig.iName, jig.name), jig) }
    ${ writeReturnWriter(jig.fields, jig) }
  }
  `.trim()
}


/**
 * Writes statements to decode the given array of fields from a CborReader.
 * Returns an AssemblyScript string.
 */
export function writeArgReader(
  fields: JigField[] | JigField,
  jig: JigClass,
  chunks: string[] = ['const args = new CborReader(argBuf)']
): string {
  if (!Array.isArray(fields)) { fields = [fields]}
  if (!fields.length) {
    return ''
  }

  return fields.reduce((chunks: string[], field: JigField): string[] => {
    const isRef = field.type === jig.name
    chunks.push(`const ${ field.name } = args.${ decodeMethod(field, isRef) }`)
    return chunks
  }, chunks).join('\n')
}



/**
 * Writes statements to create a pointer for the given class and write the list
 * of fields to the pointer's memory. Returns an AssemblyScript string.
 */
export function writePtrWriter(
  fields: JigField[],
  jig: JigClass,
  chunks: string[] = [`const ptr = __new(offsetof<${ jig.name }>(), idof<${ jig.name }>())`]
): string {
  return fields.reduce((chunks: string[], field: JigField): string[] => {
    const type = AS_INT_TYPES.includes(field.type) ? field.type : 'usize'
    const val = AS_INT_TYPES.includes(field.type) ? field.name : `changetype<usize>(${ field.name })`

    chunks.push(`store<${ type }>(ptr + offsetof<${ jig.name }>('${ field.name }'), ${ val })`)
    return chunks
  }, chunks).join('\n')
}


/**
 * Writes statements to encode the given field or array of fields in a Cbor buffer.
 * Returns an AssemblyScript string.
 */
export function writeReturnWriter(fields: JigField[] | JigField, jig: JigClass): string {
  if (!Array.isArray(fields)) { fields = [fields] }
  if (!fields.length || fields.length == 1 && fields[0].type === 'void') {
    return 'return new Uint8Array(0)'
  }

  const chunks = fields.reduce((chunks: string[], field: JigField): string[] => {
    const isRef = field.type === jig.name
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
export function writeMethodCall(method: JigMethod, jig: JigClass): string {
  const prefix = method.returnType === 'void' ? '' : 'const retVal = '
  const args = method.args.map(a => a.name).join(', ')
  if (method.isConstructor) {
    return `${ prefix }new ${ jig.name }(${ args })`
  } else if (method.isStatic) {
    return `${ prefix }${ jig.name }.${ method.name }(${ args })`
  } else {
    return `${ prefix }${ jig.iName }.${ method.name }(${ args })`
  }
}


/**
 * Writes the appropriate Cbor decode function statement for the given field.
 * Returns an AssemblyScript string.
 */
function decodeMethod(field: JigField, isRef: boolean = false): string {
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
function encodeMethod(field: JigField, isRef: boolean = false): string {
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
