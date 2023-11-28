import { ClassDeclaration, DiagnosticCategory, NodeKind } from 'assemblyscript'
import { CodeNode } from '../graph/codes.js'
import { Abi, AbiQuery, ClassNode, CodeKind, FieldNode, InterfaceNode, MethodNode, TypeNode, normalizeTypeName } from '@aldea/core/abi';
import { TransformGraph } from '../graph/graph.js';
import { SourceNode } from '../graph/sources.js';
import { AldeaDiagnosticCode, createDiagnosticMessage } from '../diagnostics.js';

export class ImplementationValidator {
  abi: Abi;
  ctx: TransformGraph;
  fullClass: ClassNode;
  interfaces: InterfaceNode[];

  constructor(public code: CodeNode<ClassDeclaration>) {
    this.abi = code.src.ctx.toABI()
    this.ctx = code.src.ctx

    const query = new AbiQuery(this.abi).fromExports().byName(code.name)
    this.fullClass = query.getClassFull()

    query.reset().byKind([CodeKind.INTERFACE, CodeKind.PROXY_INTERFACE])
    this.interfaces = this.fullClass.implements.map(name => query.byName(name).getInterfaceFull())
  }

  get abiNode(): ClassNode {
    return this.code.abiNode as ClassNode
  }

  validate(): void {
    this.interfaces.forEach(int => {
      int.fields.forEach(t => {
        const f = this.fullClass.fields.find(f => f.name === t.name)!
        if (!this.isCompatibleTypes(f.type, t.type)) {
          this.ctx.parser.diagnostics.push(createDiagnosticMessage(
            DiagnosticCategory.Error,
            AldeaDiagnosticCode.Invalid_implementation,
            [this.fullClass.name, int.name, f.name],
            this.code.node.range,
          ))
        }
      })
      int.methods.forEach(t => {
        const m = this.fullClass.methods.find(f => f.name === t.name)!
        if (!(
          t.args.length === m.args.length &&
          t.args.every((a, i) => this.isCompatibleTypes(m.args[i].type, a.type)) &&
          this.isCompatibleTypes(m.rtype, t.rtype)
        )) {
          this.ctx.parser.diagnostics.push(createDiagnosticMessage(
            DiagnosticCategory.Error,
            AldeaDiagnosticCode.Invalid_implementation,
            [this.fullClass.name, int.name, m.name],
            this.code.node.range,
          ))
        }
      })
    })
  }

  private isCompatibleTypes(subject: TypeNode | null, target: TypeNode | null): boolean {
    if (normalizeTypeName(subject) === normalizeTypeName(target)) return true
    
    // TODO - for now this check matchea only the name of the types
    // in theory this is not enough but the type checking gets pretty convoluted
    // the type we're checking maye be:
    // - a subclass
    // - an implementation of an interface
    // - a subclass of an implementation of an interface
    // - an implementation of an extended interface
    // - or.... a subclass of an implementation of an extended interface
    //
    // so for now, we'll just check the names

    return false
  }
}
