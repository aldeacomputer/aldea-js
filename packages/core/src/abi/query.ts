import {
  Abi,
  ClassNode,
  CodeKind,
  CodeDef,
  FieldNode,
  FunctionNode,
  InterfaceNode,
  MethodNode,
  ObjectNode,
  ProxyInterfaceNode,
} from "./types.js"

export class AbiQuery {
  abi: Abi;
  #scope: Array<CodeDef>;
  #target?: CodeDef;

  constructor(abi: Abi) {
    this.abi = abi
    this.#scope = abi.defs
  }

  get hasResult(): boolean {
    return !!this.#target
  }

  allCode(): CodeDef[] {
    return this.#scope
  }

  getCode(): CodeDef {
    assertExists(this.#target)
    return this.#target
  }

  getClass(): ClassNode {
    assertClass(this.#target)
    return this.#target
  }

  getFunction(): FunctionNode {
    assertFunction(this.#target)
    return this.#target
  }

  getInterface(): InterfaceNode {
    assertInterface(this.#target)
    return this.#target
  }

  getObject(): ObjectNode {
    assertObject(this.#target)
    return this.#target
  }

  getField(name: string): FieldNode
  getField(idx: number): FieldNode
  getField(q: string | number): FieldNode {
    assertNodeKind<ClassNode | InterfaceNode | ObjectNode>(this.#target, ['fields'])
    const field = typeof q === 'string' ?
      this.#target.fields.find(n => n.name === q) :
      this.#target.fields[q];
    assertExists(field, 'field')
    return field
  }

  getMethod(name: string): MethodNode | FunctionNode
  getMethod(idx: number): MethodNode | FunctionNode
  getMethod(q: string | number): MethodNode | FunctionNode {
    assertNodeKind<ClassNode | InterfaceNode>(this.#target, ['methods'])
    const method = typeof q === 'string' ?
      (<Array<MethodNode | FunctionNode>>this.#target.methods).find(n => n.name === q) :
      (<Array<MethodNode | FunctionNode>>this.#target.methods)[q];
    assertExists(method, 'method')
    return method
  }

  getClassInterfaces(): Array<InterfaceNode | ProxyInterfaceNode> {
    assertClass(this.#target)
    const query = new AbiQuery(this.abi).byKind([CodeKind.INTERFACE, CodeKind.PROXY_INTERFACE])
    return this.#target.implements.map(name => {
      return query.byName(name).getCode() as InterfaceNode | ProxyInterfaceNode
    })
  }

  getClassParents(): ClassNode[] {
    assertClass(this.#target)
    const parents: ClassNode[] = []
    while (isClass(this.#target)) {
      this.toClassParent()
      if (isClass(this.#target)) parents.push(this.getClass())
    }
    return parents.reverse()
  }

  getInterfaceParents(): InterfaceNode[] {
    assertInterface(this.#target)
    const query = new AbiQuery(this.abi).byKind([CodeKind.INTERFACE, CodeKind.PROXY_INTERFACE])
    return this.#target.extends.map(name => {
      return query.byName(name).getInterface()
    })
  }

  byKind(kind: CodeKind): this
  byKind(kinds: CodeKind[]): this
  byKind(kind: CodeKind | CodeKind[]): this {
    this.#scope = this.#scope.filter(c => {
      return Array.isArray(kind) ? kind.includes(c.kind) : kind === c.kind
    })
    this.#target = undefined
    return this
  }

  byIndex(idx: number): this {
    this.#target = this.#scope[idx]
    return this
  }

  byName(name: string): this {
    this.#target = this.#scope.find(n => n.name === name)
    return this
  }

  fromExports(): this {
    this.reset()
    this.#scope = this.abi.exports.map(i => this.abi.defs[i])
    return this
  }

  fromImports(): this {
    this.reset()
    this.#scope = this.abi.imports.map(i => this.abi.defs[i])
    return this
  }

  toClassParent(): this {
    assertClass(this.#target)
    const parentName = this.#target.extends
    return this.fromExports().byName(parentName)
  }

  search(name: string): CodeDef | FieldNode | MethodNode | FunctionNode {
    this.reset()
    const match = name.match(/^(\w+)(_|\.)(\w+)$/)

    if (match?.length === 4) {
      const [_str, codeName, sep, propName] = match 
      this.byName(codeName)
      return sep === '_' ?
        this.getMethod(propName) :
        this.getField(propName)
    } else {
      return this.byName(name).getCode()
    }
  }

  reset(): this {
    this.#scope = this.abi.defs
    this.#target = undefined
    return this
  }
}

export function assertExists<T>(bool: T | null | undefined, msg: string = 'subject'): asserts bool is T {
  if (!bool) throw new Error(`not found: the ${msg} does not exist`)
}

export function assertNodeKind<T extends {}>(node: any, keys: Array<keyof T>): asserts node is T
export function assertNodeKind<T extends {}>(node: any, kind: CodeKind): asserts node is T
export function assertNodeKind<T extends {}>(node: any, keysOrKind: Array<keyof T> | CodeKind): asserts node is T {
  assertExists<T>(node)
  if (Array.isArray(keysOrKind)) {
    if (!keysOrKind.every(k => k in node)) {
      throw new Error(`invalid type, keys not found: ${keysOrKind.join(', ')}`)
    }
  } else {
    if (!('kind' in node && node.kind === keysOrKind)) {
      throw new Error(`invalid type, kind not matching: ${keysOrKind}`)
    }
  }
}

export function assertClass(node: any): asserts node is ClassNode {
  assertNodeKind<ClassNode>(node, CodeKind.CLASS)
}

export function assertFunction(node: any): asserts node is FunctionNode {
  assertNodeKind<FunctionNode>(node, CodeKind.FUNCTION)
}

export function assertInterface(node: any): asserts node is InterfaceNode {
  assertNodeKind<InterfaceNode>(node, CodeKind.INTERFACE)
}

export function assertObject(node: any): asserts node is ObjectNode {
  assertNodeKind<ObjectNode>(node, CodeKind.OBJECT)
}

export function assertClassLike(node: any): asserts node is ClassNode | InterfaceNode | ObjectNode {
  assertNodeKind<ClassNode | InterfaceNode | ObjectNode>(node, ['fields'])
}

export function assertFunctionLike(node: any): asserts node is FunctionNode | MethodNode {
  assertNodeKind<FunctionNode | MethodNode>(node, ['args', 'rtype'])
}

export function assertField(node: any): asserts node is FieldNode {
  assertNodeKind<FieldNode>(node, ['name', 'type'])
}

export function assertMethod(node: any): asserts node is MethodNode {
  assertNodeKind<MethodNode>(node, ['kind', 'args', 'rtype'])
}

export function isNodeKind<T extends {}>(node: any, keys: Array<keyof T>, kind?: CodeKind): node is T {
  return !!node &&
    keys.every(k => k in node) && (
      typeof kind !== 'undefined' ? 'kind' in node && node.kind === kind : true
    )
}

export function isClass(node: any): node is ClassNode {
  return isNodeKind<ClassNode>(node, ['fields', 'methods'], CodeKind.CLASS)
}

export function isFunction(node: any): node is FunctionNode {
  return isNodeKind<FunctionNode>(node, ['args', 'rtype'], CodeKind.FUNCTION)
}

export function isInterface(node: any): node is InterfaceNode {
  return isNodeKind<InterfaceNode>(node, ['fields', 'methods'], CodeKind.INTERFACE)
}

export function isObject(node: any): node is ObjectNode {
  return isNodeKind<ObjectNode>(node, ['fields'], CodeKind.OBJECT)
}

export function isClassLike(node: any): node is ClassNode | InterfaceNode | ObjectNode {
  return isNodeKind<ClassNode | InterfaceNode | ObjectNode>(node, ['fields'])
}

export function isFunctionLike(node: any): node is FunctionNode | MethodNode {
  return isNodeKind<FunctionNode | MethodNode>(node, ['args', 'rtype'])
}

export function isField(node: any): node is FieldNode {
  return isNodeKind<FieldNode>(node, ['name', 'type'])
}

export function isMethod(node: any): node is MethodNode {
  return isNodeKind<MethodNode>(node, ['kind', 'args', 'rtype'])
}