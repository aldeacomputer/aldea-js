import {
  Abi,
  ClassNode,
  CodeKind,
  ExportNode,
  findClass,
  ImportNode, normalizeTypeName,
  ObjectNode,
  TypeIdNode,
  TypeNode
} from "@aldea/compiler/abi";
import {ClassNodeWrapper} from "./class-node-wrapper.js";
import {JIG_TOP_CLASS_NAME, jigInitParamsAbiNode, lockAbiNode, outputAbiNode} from "./well-known-abi-nodes.js";

const classNotFound = (className: string): ClassNodeWrapper => {
  throw new Error(`Class with name "${className}" not found.`)
}

export class AbiAccess {
  private abi: Abi;
  constructor(abi: Abi) {
    this.abi = abi
  }

  classByName (name: string, onNotFound: (a: string) => ClassNodeWrapper = classNotFound): ClassNodeWrapper {
    const abiNode = findClass(this, name)
    if (!abiNode) {
      return onNotFound(name)
    }
    return new ClassNodeWrapper(abiNode, this)
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
    return this.abi.imports
  }

  get objects(): ObjectNode[] {
    return [
      ...this.abi.objects,
      outputAbiNode,
      lockAbiNode,
      jigInitParamsAbiNode
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
}
