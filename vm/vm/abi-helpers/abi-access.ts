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
import {jigInitParamsAbiNode, lockAbiNode, outputAbiNode} from "./well-known-abi-nodes.js";

export class AbiAccess {
  private abi: Abi;
  constructor(abi: Abi) {
    this.abi = abi
  }

  classByName (name: string, errorMsg: string): ClassNode {
    const abiNode = findClass(this, name, errorMsg)
    return new ClassNodeWrapper(abiNode)
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
      return new ClassNodeWrapper(node.code as ClassNode)
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

  rtidFromTypeNode(param: TypeNode): number {
    const normalized = normalizeTypeName(param)
    const node = this.typeIds.find((rtid: TypeIdNode) => rtid.name === normalized)
    if (!node) {
      throw new Error(`unknown type: ${normalized}`)
    }
    return node.id
  }
}
