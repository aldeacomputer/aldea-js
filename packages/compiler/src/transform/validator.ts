import {
  CallExpression,
  ClassDeclaration,
  DecoratorKind,
  DecoratorNode,
  DiagnosticCategory,
  Expression,
  FunctionDeclaration,
  IdentifierExpression,
  InterfaceDeclaration,
  LiteralExpression,
  LiteralKind,
  MethodDeclaration,
  NamedTypeNode,
  NewExpression,
  Node,
  NodeKind,
  PropertyAccessExpression,
  Source,
  SourceKind,
  VariableDeclaration,
  VariableStatement,
} from 'assemblyscript'

import {
  ClassNode,
  FunctionNode,
  InterfaceNode,
  MethodKind,
  MethodNode,
  ObjectNode,
  normalizeTypeName
} from '@aldea/core/abi'

import { AldeaDiagnosticCode, createDiagnosticMessage } from './diagnostics.js'
import { filterAST, isAmbient, isConst, isConstructor, isExported, isGetter, isInstance, isPrivate, isProtected, isReadonly, isSetter, isStatic } from './filters.js'
import { TransformGraph, CodeNode, ImportEdge, ImportNode, ExportNode, SourceNode } from './graph/index.js'
import { isClass, isFunction, isInterface } from './graph/helpers.js'

// Allowed top-level statements - everything else is an error!
const allowedSrcStatements = [
  NodeKind.Import,
  NodeKind.Export,
  NodeKind.ExportDefault,
  NodeKind.Variable,
  NodeKind.ClassDeclaration,
  NodeKind.EnumDeclaration,
  NodeKind.FunctionDeclaration,
  NodeKind.InterfaceDeclaration,
]

// Collection of blacklisted names
const blacklist = {
  constructors: <string[]>['Date'],
  namespaces: <string[]>['crypto', 'heap', 'memory', 'process'],
  globalFns: <string[]>[
    'changetype', 'idof', 'offsetof',
    'load', 'store',
    'unchecked', 'call_indirect',
    'vm_local_call_start', 'vm_local_call_end',
    'vm_remote_call_i', 'vm_remote_call_s', 'vm_remote_prop',
    'vm_local_authcheck', 'vm_local_state', 'vm_local_lock',
    'vm_remote_authcheck', 'vm_remote_state', 'vm_remote_lock',
  ],
  patterns: <{[key: string]: string[]}>{
    i32: [
      'load', 'load8_s', 'load8_u', 'load16_s', 'load16_u',
      'store', 'store8', 'store16'
    ],
    i64: [
      'load', 'load8_s', 'load8_u', 'load16_s', 'load16_u', 'load32_s', 'load32_u',
      'store', 'store8', 'store16', 'store32'
    ],
    Math: ['random'],
    v128: [
      'load', 'load_ext', 'load_lane', 'load_splat', 'load_zero',
      'load8_lane', 'load8_splat', 'load8x8_s', 'load8x8_u',
      'load16_lane', 'load16_splat', 'load16x4_s', 'load16x4_u',
      'load32_lane', 'load32_splat', 'load32_zero', 'load32x2_s', 'load32x2_u',
      'load64_lane', 'load64_splat', 'load64_zero',
      'store', 'store_lane',
      'store8_lane', 'store16_lane', 'store32_lane', 'store64_lane',
    ]
  }
}

// Collection of whitelisted names
const whitelist = {
  types: <string[]>[
    'f32', 'f64',
    'i8', 'i16', 'i32', 'i64',
    'u8', 'u16', 'u32', 'u64',
    'bool',
    'string',
    'ArrayBuffer',
    'Float32Array', 'Float64Array',
    'Int8Array', 'Int16Array', 'Int32Array', 'Int64Array',
    'Uint8Array', 'Uint16Array', 'Uint32Array', 'Uint64Array',
    'Array', 'StaticArray',
    'Map', 'Set', 'Coin', 'Jig'
  ]
}

/**
 * The validator takes a TransformCtx and executes a sequence of validations.
 * Diagnostic messages get added to the Parser.
 */
export class Validator {
  ctx: TransformGraph;
  cache: SimpleCache = new SimpleCache();

  constructor(ctx: TransformGraph) {
    this.ctx = ctx
  }

  get exportedClassNodes(): ClassDeclaration[] {
    return this.cache.get<ClassDeclaration[]>('exportedClassNodes', () => {
      return this.ctx.exports.map(ex => ex.code.node).filter(isClass)
    })
  }

  get exportedFunctionNodes(): FunctionDeclaration[] {
    return this.cache.get<FunctionDeclaration[]>('exportedFunctionNodes', () => {
      return this.ctx.exports.map(ex => ex.code.node).filter(isFunction)
    })
  }

  get exportedInterfaceNodes(): InterfaceDeclaration[] {
    return this.cache.get<InterfaceDeclaration[]>('exportedInterfaceNodes', () => {
      return this.ctx.exports.map(ex => ex.code.node).filter(isInterface)
    })
  }

  get exposedClasses(): Array<ClassNode | InterfaceNode | ObjectNode> {
    return this.cache.get<Array<ClassNode | InterfaceNode | ObjectNode>>('exposedClasses', () => {
      const classes: Array<ClassNode | InterfaceNode | ObjectNode> = []
      this.ctx.exports.map(ex => ex.code).forEach(code => {
        if (isClass(code.node))     { classes.push(code.abiNode as ClassNode) }
        if (isInterface(code.node)) { classes.push(code.abiNode as InterfaceNode) }
      })
      this.ctx.imports.map(im => im.code).forEach(code => {
        if (isClass(code.node))     { classes.push(code.abiNode as ClassNode) }
        if (isInterface(code.node)) { classes.push(code.abiNode as InterfaceNode) }
      })
      classes.push(...this.ctx.objects.map(o => o.abiNode as ObjectNode))
      return classes
    })
  }

  get importedClassNodes(): ClassDeclaration[] {
    return this.cache.get<ClassDeclaration[]>('importedClassNodes', () => {
      return this.ctx.imports.map(im => im.code.node).filter(isClass)
    })
  }

  validate(): void {
    this.ctx.sources.forEach(src => {
      this.validateSourceStatements(src.source)
      src.imports.forEach(im => this.validateImportStatement(im))
      src.exports.forEach(ex => this.validateExportStatement(ex))
      src.codes.forEach(code => this.validateCodeDeclaration(code))
    })

    this.ctx.entries.forEach(src => {
      this.validateEntrySource(src)
    })

    this.ctx.exports.forEach(ex => {
      switch (ex.code.node.kind) {
        case NodeKind.ClassDeclaration:
          this.validateJigInheritance(ex.code as CodeNode<ClassDeclaration>)
          this.validateJigMembers(ex.code as CodeNode<ClassDeclaration>)
          this.validatePrivateMembers(ex.code as CodeNode<ClassDeclaration>, true)
          this.validateClassTypes(ex.code as CodeNode<ClassDeclaration>)
          break
        case NodeKind.FunctionDeclaration:
          this.validateFunctionArgTypes(ex.code as CodeNode<FunctionDeclaration>)
          this.validateFunctionReturnType(ex.code as CodeNode<FunctionDeclaration>)
          break
        case NodeKind.InterfaceDeclaration:
          //this.validateInterfaceInheritance(code as InterfaceNode)
          break
      }
    })

    this.ctx.imports.forEach(im => {
      this.validatePackageId(im)
      this.validateImportedCode(im)

      switch (im.code.node.kind) {
        case NodeKind.ClassDeclaration:
          // must not export from entry
          this.validateJigInheritance(im.code as CodeNode<ClassDeclaration>)
          this.validateJigMembers(im.code as CodeNode<ClassDeclaration>)
          this.validatePrivateMembers(im.code as CodeNode<ClassDeclaration>)
          this.validateClassTypes(im.code as CodeNode<ClassDeclaration>)
          break
        case NodeKind.FunctionDeclaration:
          // must not export from entry
          this.validateFunctionArgTypes(im.code as CodeNode<FunctionDeclaration>)
          this.validateFunctionReturnType(im.code as CodeNode<FunctionDeclaration>)
          break
        case NodeKind.InterfaceDeclaration:
          break
      }
    })

    this.ctx.objects.forEach(code => {
      // must not export from entry
      this.validateFieldTypes(code as CodeNode<ClassDeclaration>)
    })

    this.ctx.sources.forEach(src => {
      filterAST(src.source, (node: Node) => {
        switch (node.kind) {
          case NodeKind.Identifier:
            this.validateIdentifierNode(node as IdentifierExpression)
            break
          case NodeKind.Call:
            this.validateCallNode(node as CallExpression)
            break
          case NodeKind.New:
            this.validateNewExpressionNode(node as NewExpression)
            break
          case NodeKind.PropertyAccess:
            this.validatePropertyAccessNode(node as PropertyAccessExpression)
            break
          case NodeKind.ClassDeclaration:
            this.validateClassDeclarationNode(node as ClassDeclaration)
            break
          case NodeKind.FunctionDeclaration:
            this.validateFunctionDeclarationNode(node as FunctionDeclaration)
            break
          case NodeKind.InterfaceDeclaration:
            this.validateInterfaceDeclarationNode(node as InterfaceDeclaration)
            break
          case NodeKind.VariableDeclaration:
            this.validateVariableDeclarationNode(node as VariableDeclaration)
            break
          case NodeKind.Decorator:
            this.validateDecoratorNode(node as DecoratorNode)
            break
        }
      })
    })
  }

  private validateCodeDeclaration(code: CodeNode): void {
    if (code.node.kind === NodeKind.ClassDeclaration) {
      const abiNode = code.abiNode as ClassNode

      if (code.isJig && !(
        this.exportedClassNodes.some(n => code.node === n) ||
        this.importedClassNodes.some(n => code.node === n)
      )) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_class,
          ['Classes extending from `Jig` must be exported.'],
          code.node.range
        ))
      }

      if (!code.isJig && this.exportedClassNodes.some(n => code.node === n)) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_class,
          ['Exported classes must extend from `Jig`.'],
          code.node.range
        ))
      }
    }
  }

  private validateFunctionArgTypes(code: CodeNode<FunctionDeclaration>): void {
    const abiNode = code.abiNode as FunctionNode
    this.validateArgTypes(abiNode, code.node)
  }

  private validateFunctionReturnType(code: CodeNode<FunctionDeclaration>): void {
    const abiNode = code.abiNode as FunctionNode
    this.validateReturnType(abiNode, code.node)
  }

  private validateCallNode(node: CallExpression): void {
    // Ensure no calls to blacklisted globals
    if (
      node.expression.kind === NodeKind.Identifier &&
      blacklist.globalFns.includes((<IdentifierExpression>node.expression).text)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_access_global,
        [(<IdentifierExpression>node.expression).text],
        node.range
      ))
    }
  }

  private validateClassDeclarationNode(node: ClassDeclaration): void {
    // Ensures class is not ambient and exported from entry
    if (
      isExported(node.flags) &&
      isAmbient(node.flags) &&
      node.range.source.sourceKind === SourceKind.UserEntry
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_export,
        ['Ambient classes'],
        node.range
      ))
    }

    // Ensures sidekick code is not exported from entry
    if (
      isExported(node.flags) &&
      !this.exportedClassNodes.includes(node) &&
      node.range.source.sourceKind === SourceKind.UserEntry
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_export,
        ['Imported classes'],
        node.range
      ))
    }

    // Ensures plain object do not use inheritance
    if (
      isAmbient(node.flags) &&
      !this.importedClassNodes.includes(node) &&
      node.extendsType !== null
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_obj_class,
        [],
        node.range
      ))
    }

    // Ensure sidekick classes do not inherit from Jig
    //if (
    //  !this.exportedClassNodes.includes(node) &&
    //  !this.importedClassNodes.includes(node) &&
    //  node.extendsType?.name.identifier.text === 'Jig'
    //) {
    //  this.ctx.parser.diagnostics.push(createDiagnosticMessage(
    //    DiagnosticCategory.Error,
    //    AldeaDiagnosticCode.Invalid_jig_class,
    //    [node.name.text, 'must be exported'],
    //    node.range
    //  ))
    //}

    node.members.forEach(n => {
      // Ensure no static properties
      if (n.kind === NodeKind.FieldDeclaration && isStatic(n.flags)) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_class_member,
          ['Static properties'],
          n.range
        ))
      }
      // Ensure no readonly methods
      if (n.kind === NodeKind.MethodDeclaration && isReadonly(n.flags)) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_class_member,
          ['Readonly methods'],
          n.range
        ))
      }
    })
  }

  private validateClassTypes(code: CodeNode<ClassDeclaration>): void {
    this.validateFieldTypes(code)
    this.validateMethodTypes(code)
  }

  private validateDecoratorNode(node: DecoratorNode): void {
    if (node.decoratorKind > DecoratorKind.Custom) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_decorator,
        [],
        node.range
      ))
    }
  }

  private validateFieldTypes(code: CodeNode<ClassDeclaration>): void {
    (<ClassNode | ObjectNode>code.abiNode).fields.forEach(n => {
      // Ensure all field types are allowed
      if (
        !whitelist.types.includes(n.type.name) &&
        !this.exposedClasses.map(n => n.name).includes(n.type.name)
      ) {
        const node = code.node.members.find(m => m.kind === NodeKind.FieldDeclaration && m.name.text === n.name)!
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_field_type,
          [n.type.name, n.name],
          node.range
        ))
      }
    })
  }

  private validateFunctionDeclarationNode(node: FunctionDeclaration): void {
    // Ensures sidekick and imported code is not exported from entry
    if (
      isExported(node.flags) &&
      !this.exportedFunctionNodes.includes(node) &&
      node.range.source.sourceKind === SourceKind.UserEntry
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_export,
        ['Imported functions'],
        node.range
      ))
    }
  }

  private validateIdentifierNode(node: IdentifierExpression): void {
    // Ensure no double underscore identifiers
    if (node.text.startsWith('__')) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_identifier,
        [],
        node.range
      ))
    }
  }

  private validateEntrySource(src: SourceNode): void {
    if (!src.exports.length) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_package,
        ['Entry file must have at least one named export.'],
        src.source.range
      ))
    }
  }

  private validateExportStatement(ex: ExportNode): void {
    // Ensure no default export
    if (ex.node.kind === NodeKind.ExportDefault) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_export,
        ['Default exports are not supported.'],
        ex.node.range
      ))
    }

    // Ensure no renaming of imports - unless dependency import
    else if (
      !ex.edges.every(n => n.name === n.exportedName)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_export,
        ['Exports cannot be renamed.'],
        ex.node.range
      ))
    }
  }

  private validateImportStatement(im: ImportNode): void {
    // Ensure import statement used name exports
    if (!im.edges.length) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_import,
        ['Import statement must import one or more named imports'],
        im.node.range
      ))
    }

    // Ensure no renaming of imports - unless dependency import
    if (
      !/^pkg:\/\/([a-f0-9]{2})+/.test(im.path!) &&
      !im.edges.every(n => n.name === n.foreignName)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_import,
        ['Imports cannot be renamed except from external dependencies.'],
        im.node.range
      ))
    }
  }

  private validateImportedCode(im: ImportEdge): void {
    if (this.ctx.exports.some(ex => ex.code.node === im.code.node)) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_export,
        ['Imports cannot be exported from package.'],
        im.code.node.range
      ))
    }
  }

  private validateInterfaceDeclarationNode(node: InterfaceDeclaration): void {
    // Ensures interface is not ambient and exported from entry
    if (
      isExported(node.flags) && isAmbient(node.flags) &&
      node.range.source.sourceKind === SourceKind.UserEntry
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_export,
        ['Ambient interfaces'],
        node.range
      ))
    }

    // Ensures sidekick and imported code is not exported from entry
    if (
      isExported(node.flags) &&
      !this.exportedInterfaceNodes.includes(node) &&
      node.range.source.sourceKind === SourceKind.UserEntry
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_export,
        ['Imported interfaces'],
        node.range
      ))
    }
  }

  private validateInterfaceInheritance(obj: InterfaceNode): void {

  }

  private validatePackageId(im: ImportEdge): void {
    if (!im.pkgId || !/^[a-f0-9]{64}$/i.test(im.pkgId)) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_package,
        ['Must be 32 byte hex-encoded string.'],
        im.isLegacy ? im.code.node.range : im.ctx.node.range
      ))
    }
  }

  private validateJigInheritance(code: CodeNode<ClassDeclaration>): void {
    // Ensure imported or exported object inherits from Jig
    //if (!code.isJig) {
    //  this.ctx.parser.diagnostics.push(createDiagnosticMessage(
    //    DiagnosticCategory.Error,
    //    AldeaDiagnosticCode.Invalid_jig_class,
    //    [code.name, 'must inherit from `Jig`'],
    //    code.node.range
    //  ))
    //}
  }

  private validateJigMembers(code: CodeNode<ClassDeclaration>): void {
    code.node.members.forEach(n => {
      // Ensure no getter/setter methods on jigs
      if (
        n.kind === NodeKind.MethodDeclaration &&
        (isGetter(n.flags) || isSetter(n.flags))
      ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_jig_member,
          ['Getter and setter methods'],
          n.range
        ))
      }
      // Ensure no instance methods begin with underscore on jigs
      if (
        n.kind === NodeKind.MethodDeclaration &&
        n.name.text.startsWith('_')
      ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_jig_member,
          ['Underscore-prefixed method names'],
          n.range
        ))
      }
    })
  }

  private validatePrivateMembers(code: CodeNode<ClassDeclaration>, warn: boolean = false): void {
    code.node.members.forEach(n => {
      if (isPrivate(n.flags) || isProtected(n.flags)) {
        if (warn) {
          this.ctx.parser.diagnostics.push(createDiagnosticMessage(
            DiagnosticCategory.Warning,
            AldeaDiagnosticCode.Private_member_warn,
            [],
            n.range
          ))
        } else {
          this.ctx.parser.diagnostics.push(createDiagnosticMessage(
            DiagnosticCategory.Error,
            AldeaDiagnosticCode.Private_member,
            [],
            n.range
          ))
        }
      }
    })
  }

  private validateMethodTypes(code: CodeNode<ClassDeclaration>): void {
    const abiNode = code.abiNode as ClassNode
    abiNode.methods.forEach(m => {
      const node = code.node.members.find(n => {
        return n.kind === NodeKind.MethodDeclaration &&
          nodeHasMethodFlags(n as MethodDeclaration, m.kind) &&
          n.name.text === m.name
      })!
      this.validateArgTypes(m, node as MethodDeclaration)
      this.validateReturnType(m, node as MethodDeclaration)
    })
  }

  private validateArgTypes(
    abiNode: FunctionNode | MethodNode,
    node: FunctionDeclaration | MethodDeclaration
  ): void {
    abiNode.args.forEach((a, i) => {
      // Ensures all exposed argument types are allowed
      if (
        !whitelist.types.includes(a.type.name) &&
        !this.exposedClasses.map(n => n.name).includes(a.type.name)
      ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_method_type,
          [a.type.name, abiNode.name],
          node.signature.parameters[i].range
        ))
      }
    })
  }

  private validateReturnType(
    abiNode: FunctionNode | MethodNode,
    node: FunctionDeclaration | MethodDeclaration
  ): void {
    // Ensures all exposed return types are allowed
    if (
      typeof abiNode.rtype?.name === 'string' && abiNode.rtype.name !== 'void' &&
      !whitelist.types.includes(abiNode.rtype.name) &&
      !this.exposedClasses.map(n => n.name).includes(abiNode.rtype.name)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_method_type,
        [abiNode.rtype.name, abiNode.name],
        node.signature.returnType.range
      ))
    }
  }

  private validateNewExpressionNode(node: NewExpression): void {
    // Ensure no new expressions on blacklisted classes
    if (blacklist.constructors.includes(node.typeName.identifier.text)) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_access_global,
        [node.typeName.identifier.text],
        node.range
      ))
    }
  }

  private validatePropertyAccessNode(node: PropertyAccessExpression): void {
    // Ensure no access to blacklisted namespaces
    if (
        node.expression.kind === NodeKind.Identifier &&
        blacklist.namespaces.includes((<IdentifierExpression>node.expression).text)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_access_global,
        [(<IdentifierExpression>node.expression).text],
        node.range
      ))
    }
    // Ensure no access to restricted property names
    if (
      node.expression.kind === NodeKind.Identifier &&
      blacklist.patterns[(<IdentifierExpression>node.expression).text]?.includes(node.property.text)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_access_property,
        [node.property.text],
        node.range
      ))
    }
  }

  

  private validateSourceStatements(src: Source): void {
    src.statements.forEach(n => {
      // Ensure all source top-level statements are allowed
      if (!allowedSrcStatements.includes(n.kind)) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_source_statement,
          [],
          n.range
        ))
      }
      // Ensure global variables are literal constants
      const badVar = n.kind === NodeKind.Variable && (<VariableStatement>n).declarations.find(d => {
        return !isConst(d.flags) || !(isAllowedLiteral(d.initializer) || isAllowedLiteralOther(d.initializer))
      })
      if (badVar) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_source_statement,
          [],
          badVar.range
        ))
      }
    })
  }

  private validateVariableDeclarationNode(node: VariableDeclaration): void {
    // Ensure no restricted globals and namespaces are reassigned
    if (
      node.initializer && node.initializer.kind === NodeKind.Identifier && (
        blacklist.constructors.includes((<IdentifierExpression>node.initializer).text) ||
        blacklist.namespaces.includes((<IdentifierExpression>node.initializer).text) ||
        blacklist.globalFns.includes((<IdentifierExpression>node.initializer).text) ||
        blacklist.patterns[(<IdentifierExpression>node.initializer).text]?.length
      )
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Illegal_assignment,
        [(<IdentifierExpression>node.initializer).text],
        node.range
      ))
    }
  }
}

/**
 * Mega simple cache class to improve performance of TransformCtx getters.
 */
class SimpleCache {
  data: {[key: string]: any} = {};

  get<T>(key: string, callback: () => T) {
    return this.data[key] ||= callback()
  }
}

// Returns true if node kind is a safe literal
function isAllowedLiteral(node: Expression | null): Boolean {
  if (!node) return false
  return node.kind === NodeKind.Literal && [
    LiteralKind.Float,
    LiteralKind.Integer,
    LiteralKind.String,
    LiteralKind.Template,
    LiteralKind.RegExp,
  ].includes((<LiteralExpression>node).literalKind)
}

// Returns true if node kind is a safe literal other
function isAllowedLiteralOther(node: Expression | null): Boolean {
  if (!node) return false
  return [
    NodeKind.True,
    NodeKind.False,
    NodeKind.Null
  ].includes(node.kind)
}

// Returns true if node has flags for given method kind
function nodeHasMethodFlags(node: MethodDeclaration, kind: MethodKind): boolean {
  switch (kind) {
    case MethodKind.STATIC: return isStatic(node.flags)
    case MethodKind.CONSTRUCTOR: return isConstructor(node.flags)
    case MethodKind.INSTANCE: return isInstance(node.flags)
    case MethodKind.PRIVATE: return isPrivate(node.flags)
    case MethodKind.PROTECTED: return isProtected(node.flags)
    default: return false
  }
}