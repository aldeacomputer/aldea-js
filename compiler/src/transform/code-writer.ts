import {
  ClassNode,
  Field,
  FieldNode,
  MethodNode
} from './nodes.js'

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
  // Clone the fields as we rename them here
  const fields = obj.fields.map(f => new FieldNode(f.node))
  fields.forEach(f => f.name = `this.${f.name}`)
  return `
  serialize(): Uint8Array {
    ${ writeReturnWriter(fields, obj) }
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
export function writeExportMethod(method: MethodNode, obj: ClassNode): string {
  const separator = method.isConstructor || method.isStatic ? '_' : '$'

  const argReaderChunks = ['const args = new CborReader(argBuf)']
  if (!method.isConstructor && !method.isStatic) {
    argReaderChunks.push(`const ${ obj.iName } = args.${ decodeMethod({ name: obj.iName, type: { name: obj.name } }, obj) }`)
  }

  const rType = method.isConstructor ? { name: obj.name } : method.rType

  return `
  export function ${ obj.name }${ separator }${ method.name } (argBuf: Uint8Array): Uint8Array {
    ${ writeArgReader(method.args, obj, argReaderChunks) }
    ${ writeMethodCall(method, obj) }
    ${ writeReturnWriter({ name: 'ctx', type: rType }, obj) }
  }
  `.trim()
}


/**
 * Writes an exported module function to return the given class schema. Returns
 * an AssemblyScript string.
 * 
 * - Builds a schema Map
 * - Encodes and returns the schema
 */
export function writeExportSchemaMethod(obj: ClassNode): string {
  const mapType = {
    name: 'Map',
    args: [{ name: 'string' }, { name: 'string' }]
  }
  return `
  export function ${ obj.name }_schema(): Uint8Array {
    ${ writeSchema(obj.fields, obj) }
    ${ writeArgWriter({ name: 'schema', type: mapType, keepName: true }, obj) }
    return args.toBuffer()
  }
  `.trim()
}


/**
 * Writes a schema map from the given fields. Returns an AssemblyScript string.
 */
export function writeSchema(
  fields: Field[],
  obj: ClassNode,
  chunks: string[] = ['const schema = new Map<string, string>()']
): string {
  return fields.reduce((chunks: string[], field: Field): string[] => {
    chunks.push(`schema.set('${field.name}', '${field.type.name}')`)
    return chunks
  }, chunks).join('\n')
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
    ${ writeReturnWriter({ name: obj.iName, type: { name: obj.name } }, obj) }
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
  fields: Field[] | Field,
  obj: ClassNode,
  chunks: string[] = ['const args = new CborReader(argBuf)']
): string {
  if (!Array.isArray(fields)) { fields = [fields] }
  if (!fields.length && chunks.length > 1) { chunks.join('\n') }

  return fields.reduce((chunks: string[], field: Field, i: number): string[] => {
    const name = field.keepName ? field.name : `a${i}`
    
    chunks.push(`const ${name} = args.${ decodeMethod(field, obj) }`)
    return chunks
  }, chunks).join('\n')
}


/**
 * Writes statements to encode the given array of fields to a CborWriter.
 * Returns an AssemblyScript string.
 */
export function writeArgWriter(
  fields: Field[] | Field,
  obj: ClassNode,
  chunks: string[] = ['const args = new CborWriter()']
): string {
  if (!Array.isArray(fields)) { fields = [fields] }
  if (!fields.length && chunks.length > 1) { chunks.join('\n') }

  return fields.reduce((chunks: string[], field: Field, i: number): string[] => {
    const name = field.keepName ? field.name : `a${i}`
    chunks.push(`args.${ encodeMethod({ name: name, type: field.type }, obj) }`)
    return chunks
  }, chunks).join('\n')
}


/**
 * Writes statements to create a pointer for the given class and write the list
 * of fields to the pointer's memory. Returns an AssemblyScript string.
 */
export function writePtrWriter(
  fields: Field[],
  obj: ClassNode,
  chunks: string[] = [`const ptr = __new(offsetof<${ obj.name }>(), idof<${ obj.name }>())`]
): string {
  return fields.reduce((chunks: string[], field: Field, i: number): string[] => {
    const type: string = AS_INT_TYPES.includes(field.type.name) ? field.type.name : 'usize'
    const val: string = AS_INT_TYPES.includes(field.type.name) ? `a${ i }` : `changetype<usize>(a${ i })`

    chunks.push(`store<${ type }>(ptr + offsetof<${ obj.name }>('${ field.name }'), ${ val })`)
    return chunks
  }, chunks).join('\n')
}


/**
 * Writes statements to encode the given field or array of fields in a Cbor buffer.
 * Returns an AssemblyScript string.
 */
export function writeReturnWriter(fields: Field[] | Field, obj: ClassNode): string {
  if (!Array.isArray(fields)) { fields = [fields] }
  if (!fields.length || fields.length == 1 && fields[0].type.name === 'void') {
    return 'return new Uint8Array(0)'
  }

  const chunks = fields.reduce((chunks: string[], field: Field): string[] => {
    chunks.push(`retBuf.${ encodeMethod(field, obj) }`)
    return chunks
  }, ['const retBuf = new CborWriter()'])

  chunks.push('return retBuf.toBuffer()')
  return chunks.join('\n')
}


/**
 * Writes a statement to call a method on the given class. Can be a constructor,
 * static or instance method. Returns an AssemblyScript string.
 */
export function writeMethodCall(method: MethodNode, obj: ClassNode): string {
  const prefix = method.rType.name === 'void' ? '' : 'const ctx = '
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
 * Writes a proxy class wrapper for the specific Class, around the given member
 * strings. Returns an AssemblyScript string.
 */
export function writeProxyClassWrapper(obj: ClassNode, members: string[]): string {
  return `
  class ${obj.name} {
    ref: usize;
    ${members.join('\n')}
  }
  `.trim()
}


/**
 * Writes a getter on a proxy class. Returns an AssemblyScript string.
 * 
 * - Writes arguments in a cbor buffer (contains just the instance ref)
 * - Calls the method on the remote object (vm_prop)
 * - Decodes and returns the correct type
 */
export function writeProxyGetter(field: FieldNode, obj: ClassNode): string {
  const origin = obj.decorators.find(d => d.name === 'jig')?.args[0]
  const argWriterChunks = [
    'const args = new CborWriter()',
    'args.encodeRef(this.ref)'
  ]

  return `
  get ${field.name}(): ${field.type.name} {
    ${ writeArgWriter([], obj, argWriterChunks) }
    const retBuf = vm_prop('${origin}', '${obj.name}$${field.name}', args.toBuffer())
    ${ writeProxyReturn(field, obj) }
  }
  `.trim()
}


/**
 * Writes a method on a proxy class. Returns an AssemblyScript string.
 * 
 * - Writes arguments in a cbor buffer
 * - Calls the method on the remote object (vm_call)
 * - Decodes and returns the correct type
 */
export function writeProxyMethod(method: MethodNode, obj: ClassNode): string {
  const origin = obj.decorators.find(d => d.name === 'jig')?.args[0]
  const separator = method.isConstructor || method.isStatic ? '_' : '$'
  const argWriterChunks = ['const args = new CborWriter()']
  if (!method.isConstructor && !method.isStatic) {
    argWriterChunks.push('args.encodeRef(this.ref)')
  }

  const rType = method.isConstructor ? { name: obj.name } : method.rType

  return `
  ${method.name}(${ method.args.map((a, i) => `a${i}: ${a.type.name}`) })${method.isConstructor ? '' : `: ${rType.name}`} {
    ${ writeArgWriter(method.args, obj, argWriterChunks) }
    const retBuf = vm_call('${origin}', '${obj.name}${separator}${method.name}', args.toBuffer())
    ${ writeProxyReturn({ name: '', type: rType }, obj, method.isConstructor) }
  }
  `.trim()
}


/**
 * Writes statements to decode the return from a proxy method and return the
 * decoded value.
 */
export function writeProxyReturn(field: Field, obj: ClassNode, isConstructor: boolean = false): string {
  const prefixStmt = isConstructor ? 'this.ref =' : 'return'
  return `
  const retn = new CborReader(retBuf)
  ${prefixStmt} retn.${ decodeMethod(field, obj) }
  `.trim()
}


/**
 * Writes the appropriate Cbor decode function statement for the given field.
 * Returns an AssemblyScript string.
 */
function decodeMethod(field: Field, obj: ClassNode): string {
  const isRef = field.type.name === obj.name
  if (isRef) {
    return `decodeRef<${ field.type.name }>()`
  }

  const externalClassNames: string[] = obj.ctx.externalClasses.map(n => n.name)
  if ( externalClassNames.includes(field.type.name) ) {
    return `decodeExtRef<${field.type.name}>()`
  }
  
  switch (field.type.name) {
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
      return `decodeInt() as ${ field.type.name }`

    case 'string':
      return 'decodeStr()'

    case 'Uint8Array':
      return 'decodeBuf()'
    
    default:
      throw new Error(`unsupported type: ${ field.type.name } (cbor decode)`)
  }
}


/**
 * Writes the appropriate Cbor encode function statement for the given field.
 * Returns an AssemblyScript string.
 */
function encodeMethod(field: Field, obj: ClassNode): string {
  const isRef = field.type.name === obj.name
  if (isRef) {
    return `encodeRef<${ field.type.name }>(${ field.name })`
  }

  switch(field.type.name) {
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
    case 'string':
      return `encode<${ field.type.name }>(${ field.name })`

    case 'Uint8Array':
      return `encodeBuf(${ field.name })`

    case 'Map':
      return `encodeMap<${ field.type.args?.map(t => t.name).join(', ') }>(${ field.name })`

    default:
      throw new Error(`unsupported type: ${ field.type.name } (cbor encode)`)
  }
}
