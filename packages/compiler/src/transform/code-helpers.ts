import { blake3, util } from '@aldea/core'
import {
  ArgNode,
  ClassNode,
  FieldNode,
  FunctionNode,
  InterfaceNode,
  MethodNode,
  ObjectNode,
  TypeNode,
  normalizeTypeName
} from '@aldea/core/abi'

/**
 * Writes an interface for the given jig class.
 */
export function writeJigInterface(
  obj: ClassNode,
  fields: FieldNode[],
  methods: MethodNode[],
  exported: boolean = false,
): string {
  const interfaces = [obj.extends]
    .concat(obj.implements)
    .join(', ')
  const fieldCode = fields
    .map(n => `${n.name}: ${normalizeTypeName(n.type)}`)
    .join('\n')
  const methodCode = methods
    .map(n => {
      const args = n.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
      return `${n.name}(${args.join(', ')}): ${normalizeTypeName(n.rtype)}`
    })
    .join('\n')

  return `
  ${exported ? 'export ' : ''}interface ${obj.name} extends ${interfaces} {
    ${fieldCode}
    ${methodCode}
  }
  `.trim()
}

/**
 * Writes a local class declaration for the given jig class.
 * 
 * Returns an empty declaration as the transform method injects the body into
 * the AST.
 */
export function writeJigLocalClass(
  obj: ClassNode,
  exported: boolean = false,
): string {
  return `
  ${exported ? 'export ' : ''}class __Local${obj.name} extends __Local${obj.extends} implements ${obj.name} {}
  `.trim()
}

/**
 * Writes a remote class declaration for the given jig class.
 * 
 * Ensures compilation by inlining an idof call.
 */
export function writeJigRemoteClass(
  obj: ClassNode,
  fields: FieldNode[],
  methods: MethodNode[],
  exported: boolean = false,
): string {
  const fieldCode = fields.reduce((acc: string[], n: FieldNode): string[] => {
    acc.push(writeRemoteGetter(n))
    return acc
  }, []).join('\n')

  const methodCode = methods.reduce((acc: string[], n: MethodNode): string[] => {
    acc.push(writeRemoteMethod(n, obj))
    return acc
  }, []).join('\n')

  return `
  ${exported ? 'export ' : ''}class __Proxy${obj.name} extends __Proxy${obj.extends} implements ${obj.name} {
    ${fieldCode}
    ${methodCode}
  }
  // required to ensure compilation
  idof<__Proxy${obj.name}>()
  `.trim()
}

/**
 * Writes an export function exported for the given Jig class method.
 * 
 * For instance methods, an extra argument is added for the instance Ptr.
 */
export function writeJigBinding(
  method: MethodNode,
  obj: ClassNode,
): string {
  const isConstructor = method.name === 'constructor'
  const args = method.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
  const rtype = isConstructor ? `${obj.name}` : normalizeTypeName(method.rtype)
  const callable = isConstructor ? `new __Local${obj.name}` : `ctx.${method.name}`
  if (!isConstructor) args.unshift(`ctx: ${obj.name}`)

  return `
  export function __${obj.name}_${method.name}(${args.join(', ')}): ${rtype} {
    return ${callable}(${ method.args.map((_f, i) => `a${i}`).join(', ') })
  }
  `.trim()
}

/**
 * Writes a remote class declaration for the given interface.
 * 
 * Ensures compilation by inlining an idof call.
 */
export function writeInterfaceRemoteClass(
  obj: InterfaceNode,
  fields: FieldNode[],
  methods: MethodNode[],
  exported: boolean = false
): string {
  const fieldCode = fields.reduce((acc: string[], n: FieldNode): string[] => {
    acc.push(writeRemoteGetter(n))
    return acc
  }, []).join('\n')

  const methodCode = methods.reduce((acc: string[], n: MethodNode): string[] => {
    acc.push(writeRemoteInterfaceMethod(n, obj))
    return acc
  }, []).join('\n')

  return `
  ${exported ? 'export ' : ''}class __Proxy${obj.name} extends __ProxyJig implements ${obj.name} {
    ${fieldCode}
    ${methodCode}
  }
  // required to ensure compilation
  idof<__Proxy${obj.name}>()
  `.trim()
}

/**
 * Writes a object class declaration for the given object node.
 * 
 * Returns an empty declaration as the transform method injects the body into
 * the AST.
 */
export function writeObjectClass(
  obj: ObjectNode,
  exported: boolean = false,
): string {
  return `
  ${exported ? 'export ' : ''}class ${obj.name} {}
  // required to ensure compilation
  idof<${obj.name}>()
  `.trim()
}

/**
 * Writes a remote class declaration for the given imported class.
 */
export function writeImportedRemoteClass(
  obj: ClassNode,
  fields: FieldNode[],
  methods: MethodNode[],
  pkgId: string,
  exported: boolean = false
): string {
  const fieldCode = fields.reduce((acc: string[], n: FieldNode): string[] => {
    acc.push(writeRemoteGetter(n))
    return acc
  }, []).join('\n')

  const methodCode = methods.reduce((acc: string[], n: MethodNode): string[] => {
    acc.push(writeRemoteMethod(n, obj, pkgId))
    return acc
  }, []).join('\n')

  return `
  ${exported ? 'export ' : ''}class ${obj.name} extends __ProxyJig {
    ${fieldCode}
    ${methodCode}
  }
  `.trim()
}

/**
 * Writes a remote function declaration for the given imported function.
 */
export function writeImportedRemoteFunction(fn: FunctionNode, pkgId: string): string {
  const args = fn.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
  const rtype = normalizeTypeName(fn.rtype)

  return `
  export function ${fn.name}(${args.join(', ')}): ${rtype} {
    ${ writeArgWriter(fn.args) }
    return __vm_call_function<${rtype}>('${pkgId}', '${fn.name}', args.buffer)
  }
  `.trim()
}

/**
 * Writes an import statement for the given list of names and import path.
 */
export function writeImportStatement(names: string[], path: string) {
  return `import { ${names.join(', ')} } from '${path}'`
}

/**
 * Writes an export statement for the given list of names and optional import path.
 */
export function writeExportStatement(names: string[], path?: string) {
  const from = path ? ` from '${path}'` : ''
  return `export { ${names.join(', ')} }${from}`
}

/**
 * Writes exported function for putting a value into a set.
 * 
 * We need some way of lowering complex types into memory, and this is it.
 */
export function writeSetSetter(type: TypeNode): string {
  const setType = normalizeTypeName(type)
  const valType = normalizeTypeName(type.args[0])
  const hash = util.bytesToHex(blake3.hash(setType, 4))

  return `
  export function __put_set_entry_${hash}(set: ${setType}, val: ${valType}): void {
    set.add(val)
  }
  `.trim()
}

/**
 * Writes exported method for putting a key and value into a map.
 * 
 * We need some way of lowering complex types into memory, and this is it.
 */
export function writeMapSetter(type: TypeNode): string {
  const mapType = normalizeTypeName(type)
  const keyType = normalizeTypeName(type.args[0])
  const valType = normalizeTypeName(type.args[1])
  const hash = util.bytesToHex(blake3.hash(mapType, 4))

  return `
  export function __put_map_entry_${hash}(map: ${mapType}, key: ${keyType}, val: ${valType}): void {
    map.set(key, val)
  }
  `.trim()
}

/**
 * Writes a getter on a remote class. Returns the result of `__vm_get_prop`.
 */
export function writeRemoteGetter(field: FieldNode): string {
  const type = normalizeTypeName(field.type)
  return `
  get ${field.name}(): ${type} {
    return __vm_get_prop<${type}>(this.$output.origin, '${field.name}')
  }
  `.trim()
}

/**
 * Writes a method on a remote class.
 * 
 * - For constructors calls `__vm_constructor_local` or `__vm_constructor_remote`.
 * - For instance methods returns the result of `__vm_call_method`.
 */
export function writeRemoteMethod(method: MethodNode, obj: ClassNode, pkg?: string): string {
  const isConstructor = method.name === 'constructor'
  const args = method.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)

  if (isConstructor) {
    const callable = pkg ?
      `__vm_constructor_remote('${pkg}', '${obj.name}', args.buffer)` :
      `__vm_constructor_local('${obj.name}', args.buffer)` ;

    return `
    constructor(${args.join(', ')}) {
      ${ writeArgWriter(method.args) }
      const params = ${callable}
      super(params)
    }
    `.trim()

  } else {
    const rtype = normalizeTypeName(method.rtype)
    const callable = `__vm_call_method<${rtype}>(this.$output.origin, '${method.name}', args.buffer)`

    return `
    ${method.name}(${args.join(', ')}): ${rtype} {
      ${ writeArgWriter(method.args) }
      return ${callable}
    }
    `.trim()
  }
}

/**
 * Writes a method on a remote class that is derived from an interface.
 * 
 * As `writeRemoteMethod` but for intefaces it is always an instance method so
 * can have simpler implementation.
 */
export function writeRemoteInterfaceMethod(method: MethodNode, obj: InterfaceNode, pkg?: string): string {
  const args = method.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
  const rtype = normalizeTypeName(method.rtype)
  return `
  ${method.name}(${args.join(', ')}): ${rtype} {
    ${ writeArgWriter(method.args) }
    return __vm_call_method<${rtype}>(this.$output.origin, '${method.name}', args.buffer)
  }
  `.trim()
}

/**
 * Writes statements to encode the given array of fields to an ArrayBuffer.
 * 
 * Each field is encoded either as an integer value or a 32bit Ptr.
 */
export function writeArgWriter(fields: ArgNode[]): string {
  const bytes = fields.reduce((sum, n) => sum + getTypeBytes(n.type), 0)
  const chunks = fields.map((n, i) => `args.${ writeArgWriterEncodeMethod(n, i) }`)
  return `
  const args = new __ArgWriter(${bytes})
  ${ chunks.join('\n') }
  `.trim()
}

/**
 * Writes the appropriate encode function statement for the given field.
 */
export function writeArgWriterEncodeMethod(field: ArgNode, i: number): string {
  switch(field.type.name) {
    case 'f32': return `writeF32(a${i})`
    case 'f64': return `writeF64(a${i})`
    case 'i8':  return `writeI8(a${i})`
    case 'i16': return `writeI16(a${i})`
    case 'i32': return `writeI32(a${i})`
    case 'i64': return `writeI64(a${i})`
    case 'u8':  return `writeU8(a${i})`
    case 'u16': return `writeU16(a${i})`
    case 'u32': return `writeU32(a${i})`
    case 'u64': return `writeU64(a${i})`
    default:
      return `writeU32(changetype<usize>(a${i}) as u32)`
  }
}

/**
 * Returns the number of bytes for the given type.
 */
function getTypeBytes(type: TypeNode): number {
  switch(type.name) {
    case 'i8':
    case 'u8':
    case 'bool':
    case 'null':
      return 1
    case 'i16':
    case 'u16':
      return 2
    case 'i64':
    case 'f64':
    case 'u64':
      return 8
    default:
      return 4
  }
}
