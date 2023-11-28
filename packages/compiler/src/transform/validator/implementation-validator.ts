import { ClassDeclaration, DiagnosticCategory, NodeKind } from 'assemblyscript'
import { CodeNode } from '../graph/codes.js'
import { Abi, AbiQuery, ClassNode, CodeKind, InterfaceNode, TypeNode, normalizeTypeName } from '@aldea/core/abi';
import { TransformGraph } from '../graph/graph.js';
import { SourceNode } from '../graph/sources.js';
import { AldeaDiagnosticCode, createDiagnosticMessage } from '../diagnostics.js';

export class ImplementationValidator {
  abi: Abi;
  ctx: TransformGraph;
  src: SourceNode;
  fullClass: ClassNode;
  interfaces: InterfaceNode[];

  constructor(public code: CodeNode<ClassDeclaration>) {
    this.abi = code.src.ctx.toABI()
    this.ctx = code.src.ctx
    this.src = code.src

    const query = new AbiQuery(this.abi).fromExports().byName(code.name)
    this.fullClass = query.getClassFull()

    this.interfaces = this.fullClass.implements.map(name => {
      // get the abi node from the source, rather than the abi, as it could be imported
      return code.src.findCode(name)?.abiNode as InterfaceNode
    })
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

  // What this checks
  // - the type name exactly matches
  // - the subject is a class that directly implements the interface
  // - the subject is a subclass of a class that directly implements the interface
  // - the subject is an interface that directly extends the interface
  //
  // What this doesn't check
  // - the subject is an interface that extends from a parent interface that implements the target
  private isCompatibleTypes(subject: TypeNode | null, target: TypeNode | null): boolean {
    if (
      normalizeTypeName(subject) === normalizeTypeName(target) ||
      normalizeTypeName(subject) === this.fullClass.name
    ) {
      return true
    }

    if (subject!.args.length > 0 && subject!.args.length === target?.args.length) {
      return subject!.args.every((_a, i) => this.isCompatibleTypes(subject!.args[i], target!.args[i]))
    }

    const code = this.src.findCode(normalizeTypeName(subject))
    if (
      code && code.node.kind === NodeKind.ClassDeclaration &&
      (<ClassNode>code.abiNode).implements.includes(normalizeTypeName(target))
    ) {
      return true
    }

    if (
      code && code.node.kind === NodeKind.InterfaceDeclaration &&
      (<InterfaceNode>code.abiNode).extends.includes(normalizeTypeName(target))
    ) {
      return true
    }

    // TODO - for now this check matches only the name of the types,
    // or if the class implements the type directly
    //
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
