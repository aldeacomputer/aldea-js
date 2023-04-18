import {ArgNode, ClassNode, MethodKind, MethodNode, TypeNode} from "@aldea/compiler/abi";

export class MethodNodeWrapper {
  private klass: ClassNode;
  private node: MethodNode;

  constructor(klass: ClassNode, node: MethodNode) {
    this.klass = klass
    this.node = node
  }

  className (): string {
    return this.klass.name
  }

  get kind(): MethodKind {
    return this.node.kind
  }

  get name(): string {
    return this.node.name
  }

  get args(): ArgNode[] {
    return this.node.args
  }

  get rtype(): TypeNode | null {
    return this.node.rtype
  }
}
