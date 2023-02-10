import {
  Abi,
  ClassNode,
  CodeKind,
  ExportNode,
  findClass, FunctionNode,
  ImportNode, normalizeTypeName,
  ObjectNode,
  TypeIdNode,
  TypeNode,
  findFunction, InterfaceNode
} from "@aldea/compiler/abi";
import {ClassNodeWrapper} from "./class-node-wrapper.js";
import {
  basicJigAbiNode,
  coinNode,
  JIG_TOP_CLASS_NAME,
  jigInitParamsAbiNode, jigNode,
  lockAbiNode,
  outputAbiNode
} from "./well-known-abi-nodes.js";

const classNotFound = (className: string): ClassNodeWrapper => {
  throw new Error(`Class with name "${className}" not found.`)
}

export class AbiAccess {
  private abi: Abi;
  constructor(abi: Abi) {
    this.abi = abi
  }

  classByName(name: string, onNotFound: (a: string) => ClassNodeWrapper = classNotFound): ClassNodeWrapper {
    const abiNode = findClass(this, name)
    if (!abiNode) {
      return onNotFound(name)
    }
    return new ClassNodeWrapper(abiNode, this)
  }

  classIdxByName (name: string): number {
    name = name.replace(/^\$|/, '')
    const index = this.exports.findIndex(e => e.code.name === name)
    if (index < 0) {
      throw new Error(`Unknown class name: ${name}`)
    }
    return index
  }

  findExportIndex (exportName: string) {
    return this.abi.exports.findIndex(e => e.code.name === exportName)
  }

  get version(): number {
    return this.abi.version
  }

  get exports(): ExportNode[] {
    return this.abi.exports
  }

  get imports(): ImportNode[] {
    return [...this.abi.imports, coinNode, jigNode]
  }

  get objects(): ObjectNode[] {
    return [
      ...this.abi.objects,
      outputAbiNode,
      lockAbiNode,
      jigInitParamsAbiNode,
      basicJigAbiNode
    ]
  }
  get typeIds(): TypeIdNode[] {
    return this.abi.typeIds
  }

  classByIndex(classIdx: number): ClassNodeWrapper {
    const node = this.exports[classIdx]
    if (node.kind === CodeKind.CLASS) {
      return new ClassNodeWrapper(node.code as ClassNode, this)
    } else {
      throw new Error(`idx ${classIdx} does not belong to a class object.`)
    }
  }

  nameFromRtid(rtid: number): string {
    const node = this.typeIds.find((rtidNode: TypeIdNode) => rtidNode.id === rtid)
    if (!node) {
      throw new Error(`unknonw rtid: ${rtid}`)
    }
    return node.name
  }

  rtidFromTypeNode(type: TypeNode): number {
    const normalized = normalizeTypeName(type)
    const node = this.typeIds.find((rtid: TypeIdNode) => rtid.name === normalized)
    if (!node) {
      throw new Error(`unknown type: ${normalized}`)
    }
    return node.id
  }

  typeFromRtid(rtid: number): TypeNode {
    const node = this.abi.typeIds.find(typeId => typeId.id === rtid)
    if (!node) {
      throw new Error(`unknown rtid: ${rtid}`)
    }
    return { name: node.name, args: [] }
  }

  findImportedIndex(name: string) {
    return this.abi.imports.findIndex(imported => imported.name === name)
  }

  importedByIndex(importedIndex: number): ImportNode {
    return this.abi.imports[importedIndex]
  }

  isSubclassByIndex(childClassIndex: number, parentClassIndex: number) {
    let child = this.classByIndex(childClassIndex)
    const parent = this.classByIndex(parentClassIndex)

    // Need to travers inheritance chain until find parent or top class
    while (child.name !== parent.name) {
      if (child.extends === JIG_TOP_CLASS_NAME) {
        return false
      }
      child = this.classByName(child.extends)
    }

    return true
  }

  functionByName(fnName: string): FunctionNode {
    return findFunction(this.abi, fnName, `Function ${fnName} was not found.`)
  }

  classNameExists(typeName: string): boolean {
    return this.exports.some(exp => exp.code.name === typeName);
  }

  importClassNameExists(typeName: string): boolean {
    const node = this.imports.find(imp => imp.name === typeName);
    return !!node && (node.kind === CodeKind.CLASS);
  }

  exportedObjectNameExists(typeName: string): boolean {
    return this.objects.some(obj => obj.name === typeName);
  }

  interfaceNameExists(typeName: string): boolean {
    return this.exports.some(exp => exp.kind === CodeKind.INTERFACE && exp.code.name === typeName)
  }

  importByName(typeName: any): ImportNode {
    const node = this.imports.find(imp => imp.name === typeName)
    if (!node) {
      throw new Error(`Import not found: ${typeName}`)
    }
    return node
  }

  objectByName(typeName: any): ObjectNode {
    const node = this.objects.find(obj => obj.name === typeName)
    if (!node) {
      throw new Error(`Unknown object: ${typeName}`)
    }
    return node
  }

  interfaceByName(typeName: any): InterfaceNode {
    const node = this.exports.find(exp => exp.code.name === typeName && exp.kind === CodeKind.INTERFACE)
    if (!node) {
      throw new Error(`Unknown interface: ${typeName}`)
    }
    return node.code as InterfaceNode
  }
}
