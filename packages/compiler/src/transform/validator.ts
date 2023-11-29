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
  AbiQuery,
  ClassNode,
  CodeKind,
  FunctionNode,
  InterfaceNode,
  MethodKind,
  MethodNode,
  ObjectNode,
  TypeNode,
  normalizeTypeName,
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
    'Map', 'Set',
    'BigInt',
    'Jig', 'Coin', 'Fungible',
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
        if (isClass(code.node))     { classes.push(code.abiNode as ClassNode | ObjectNode) }
        if (isInterface(code.node)) { classes.push(code.abiNode as InterfaceNode) }
      })
      this.ctx.imports.map(im => im.code).forEach(code => {
        if (isClass(code.node))     { classes.push(code.abiNode as ClassNode | ObjectNode) }
        if (isInterface(code.node)) { classes.push(code.abiNode as InterfaceNode) }
      })
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
      switch (ex.code.abiCodeKind) {
        case CodeKind.CLASS:
          this.validateJigImpl(ex.code as CodeNode<ClassDeclaration>)
          this.validateJigInheritance(ex.code as CodeNode<ClassDeclaration>)
          this.validateJigMembers(ex.code as CodeNode<ClassDeclaration>)
          this.validateClassTypes(ex.code as CodeNode<ClassDeclaration>)
          break
        case CodeKind.FUNCTION:
          this.validateFunctionArgTypes(ex.code as CodeNode<FunctionDeclaration>)
          this.validateFunctionReturnType(ex.code as CodeNode<FunctionDeclaration>)
          break
        case CodeKind.INTERFACE:
          this.validateInterfaceInheritance(ex.code as CodeNode<InterfaceDeclaration>)
          break
        case CodeKind.OBJECT:
          break
      }
    })

    this.ctx.imports.forEach(im => {
      this.validatePackageId(im)
      this.validateImportedCode(im)

      switch (im.abiCodeKind) {
        case CodeKind.PROXY_CLASS:
          //this.validateJigInheritance(im.code as CodeNode<ClassDeclaration>)
          this.validateJigMembers(im.code as CodeNode<ClassDeclaration>)
          this.validatePrivateMembers(im.code as CodeNode<ClassDeclaration>)
          this.validateClassTypes(im.code as CodeNode<ClassDeclaration>)
          break
        case CodeKind.PROXY_FUNCTION:
          this.validateFunctionArgTypes(im.code as CodeNode<FunctionDeclaration>)
          this.validateFunctionReturnType(im.code as CodeNode<FunctionDeclaration>)
          break
        case CodeKind.PROXY_INTERFACE:
          break
        case CodeKind.OBJECT:
          break
      }
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
      if (code.isJig && (<ClassDeclaration>code.node).members.some(n => isStatic(n.flags))) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_class_member,
          ['Static members'],
          code.node.range
        ))
      }

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

      if (!code.isJig && !code.isObj && this.exportedClassNodes.some(n => code.node === n)) {
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
    if (node.name.text === 'Jig') {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_class,
        ['Class cannot be named `Jig`.'],
        node.range
      ))
    }
    // Ensures class is not ambient and exported from entry
    //if (
    //  isExported(node.flags) &&
    //  isAmbient(node.flags) &&
    //  node.range.source.sourceKind === SourceKind.UserEntry
    //) {
    //  this.ctx.parser.diagnostics.push(createDiagnosticMessage(
    //    DiagnosticCategory.Error,
    //    AldeaDiagnosticCode.Invalid_export,
    //    ['Ambient classes'],
    //    node.range
    //  ))
    //}

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
      // Ensure no static properties or methods
      if (isStatic(n.flags)) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_class_member,
          ['Static members'],
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

    // Ensure no renaming of exports
    else if (!ex.edges.every(n => n.name === n.exportedName)) {
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

  private validateJigImpl(code: CodeNode<ClassDeclaration>): void {
    if (code.isJig && code.node.implementsTypes?.length) {
      const abi = code.src.ctx.toABI()
      const query = new AbiQuery(abi).fromExports().byName(code.name)
      const fullCode = query.getClassFull()

      // get interface abi nodes from the source, rather than the abi
      // as it could be imported and the abi only includes proxy details
      const interfaces = fullCode.implements.reduce((map, name) => {
        const int = code.src.findCode(name)!
        const children = int.findAllParents().map(i => i.abiNode as InterfaceNode)
        map.set(int.abiNode as InterfaceNode, children.reverse())
        return map
      }, new Map<InterfaceNode, InterfaceNode[]>())

      interfaces.forEach((children, parent) => {
        [...children, parent].forEach(int => {
          int.fields.forEach(t => {
            const f = fullCode.fields.find(f => f.name === t.name)!
            if (!isCompatibleTypes(f.type, t.type, code)) {
              this.ctx.parser.diagnostics.push(createDiagnosticMessage(
                DiagnosticCategory.Error,
                AldeaDiagnosticCode.Invalid_implementation,
                [fullCode.name, parent.name, f.name],
                code.node.range,
              ))
            }
          })
          int.methods.forEach(t => {
            const m = fullCode.methods.find(f => f.name === t.name)!
            if (!(
              t.args.length === m.args.length &&
              t.args.every((a, i) => isCompatibleTypes(m.args[i].type, a.type, code)) &&
              isCompatibleTypes(m.rtype, t.rtype, code)
            )) {
              this.ctx.parser.diagnostics.push(createDiagnosticMessage(
                DiagnosticCategory.Error,
                AldeaDiagnosticCode.Invalid_implementation,
                [fullCode.name, parent.name, m.name],
                code.node.range,
              ))
            }
          })
        })
      })
    }
  }

  private validateInterfaceInheritance(code: CodeNode<InterfaceDeclaration>): void {
    if (code.node.implementsTypes?.length) {
      const fullCode = code.abiNode as InterfaceNode

      // get interface abi nodes from the source, rather than the abi
      // as it could be imported and the abi only includes proxy details
      const interfaces = fullCode.extends.reduce((map, name) => {
        const int = code.src.findCode(name)!
        const children = int.findAllParents().map(i => i.abiNode as InterfaceNode)
        map.set(int.abiNode as InterfaceNode, children.reverse())
        return map
      }, new Map<InterfaceNode, InterfaceNode[]>())

      interfaces.forEach((children, parent) => {
        [...children, parent].forEach(int => {
          int.fields.forEach(t => {
            const f = fullCode.fields.find(f => f.name === t.name)!
            if (!isCompatibleTypes(f.type, t.type, code)) {
              this.ctx.parser.diagnostics.push(createDiagnosticMessage(
                DiagnosticCategory.Error,
                AldeaDiagnosticCode.Invalid_interface_inheritance,
                [fullCode.name, parent.name, f.name],
                code.node.range,
              ))
            }
          })
          int.methods.forEach(t => {
            const m = fullCode.methods.find(f => f.name === t.name)
            if (m && !(
              t.args.length === m.args.length &&
              t.args.every((a, i) => isCompatibleTypes(m.args[i].type, a.type, code)) &&
              isCompatibleTypes(m.rtype, t.rtype, code)
            )) {
              this.ctx.parser.diagnostics.push(createDiagnosticMessage(
                DiagnosticCategory.Error,
                AldeaDiagnosticCode.Invalid_interface_inheritance,
                [fullCode.name, parent.name, m.name],
                code.node.range,
              ))
            }
          })
        })
      })
    }
  }

  private validateJigInheritance(code: CodeNode<ClassDeclaration>): void {
    if (
      code.isJig &&
      code.node.extendsType?.name.identifier.text !== 'Jig' &&
      !code.node.members.some(n => n.kind === NodeKind.MethodDeclaration && isConstructor(n.flags))
    ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_class,
          ['Constructor method required for child Jig class.'],
          code.node.range
        ))
    }
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

  private validatePrivateMembers(code: CodeNode<ClassDeclaration>): void {
    code.node.members.forEach(n => {
      if (isPrivate(n.flags) || isProtected(n.flags)) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Private_member,
          [],
          n.range
        ))
      }
    })
  }

  private validateMethodTypes(code: CodeNode<ClassDeclaration>): void {
    const abiNode = code.abiNode as ClassNode
    abiNode.methods.forEach(m => {
      const node = code.node.members.find(n => {
        return n.kind === NodeKind.MethodDeclaration &&
          nodeHasMethodFlags(n as MethodDeclaration, m.kind!) &&
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

// TODO ??
// What this checks
// - the type name exactly matches
// - the subject is a class that directly implements the interface
// - the subject is a subclass of a class that directly implements the interface
// - the subject is an interface that directly extends the interface
//
// What this doesn't check
// - the subject is an interface that extends from a parent interface that implements the target
function isCompatibleTypes(subject: TypeNode | null, target: TypeNode | null, context: CodeNode): boolean {
  if (
    normalizeTypeName(subject) === normalizeTypeName(target) ||
    normalizeTypeName(subject) === context.name
  ) {
    return true
  }

  if (subject!.args.length > 0 && subject!.args.length === target?.args.length) {
    return subject!.args.every((_a, i) => isCompatibleTypes(subject!.args[i], target!.args[i], context))
  }

  const code = context.src.findCode(normalizeTypeName(subject))
  if (
    code && code.node.kind === NodeKind.ClassDeclaration &&
    (<ClassNode>code.abiNode).implements.includes(normalizeTypeName(target))
  ) {
    return true
  }

  if (
    code && code.node.kind === NodeKind.InterfaceDeclaration &&
    code.findAllParents().map(c => c.name).includes(normalizeTypeName(target))
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

// Returns true if node has flags for given method kind
function nodeHasMethodFlags(node: MethodDeclaration, kind: MethodKind): boolean {
  switch (kind) {
    case MethodKind.PUBLIC: return isConstructor(node.flags) || isInstance(node.flags)
    case MethodKind.PROTECTED: return isProtected(node.flags)
    default: return false
  }
}
