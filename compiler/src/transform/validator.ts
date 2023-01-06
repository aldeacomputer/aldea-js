import {
  CallExpression,
  ClassDeclaration,
  DecoratorKind,
  DecoratorNode,
  DiagnosticCategory,
  Expression,
  FunctionDeclaration,
  IdentifierExpression,
  LiteralExpression,
  LiteralKind,
  NewExpression,
  Node,
  NodeKind,
  PropertyAccessExpression,
  Source,
  SourceKind,
  VariableDeclaration,
  VariableStatement,
} from 'assemblyscript'

import { CodeKind } from '../abi.js'
import { TransformCtx } from './ctx.js'
import { AldeaDiagnosticCode, createDiagnosticMessage } from './diagnostics.js'
import { ClassWrap, ObjectWrap, FieldWrap, TypeWrap, FunctionWrap, MethodWrap } from './nodes.js'
import { filterAST, isConst, isExported, isGetter, isPrivate, isProtected, isReadonly, isSetter, isStatic } from './filters.js'

// Allowed top-level statements - everything else is an error!
const allowedSrcStatements = [
  NodeKind.Import,
  NodeKind.Variable,
  NodeKind.ClassDeclaration,
  NodeKind.EnumDeclaration,
  NodeKind.FunctionDeclaration,
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
  ctx: TransformCtx;
  cache: SimpleCache = new SimpleCache();

  constructor(ctx: TransformCtx) {
    this.ctx = ctx
  }

  get exportedClassNodes(): ClassDeclaration[] {
    return this.cache.get<ClassDeclaration[]>('exportedClassNodes', () => {
      return this.ctx.exports
        .filter(ex => ex.kind === CodeKind.CLASS)
        .map(ex => (<ClassWrap>ex.code).node)
    })
  }

  get exportedFunctionNodes(): FunctionDeclaration[] {
    return this.cache.get<FunctionDeclaration[]>('exportedFunctionNodes', () => {
      return this.ctx.exports
        .filter(ex => ex.kind === CodeKind.FUNCTION)
        .map(ex => (<FunctionWrap>ex.code).node)
    })
  }

  get exposedClasses(): Array<ClassWrap | ObjectWrap> {
    return this.cache.get<Array<ClassWrap | ObjectWrap>>('exposedClasses', () => {
      const classes: Array<ClassWrap | ObjectWrap> = []
      this.ctx.exports.filter(ex => ex.kind === CodeKind.CLASS).forEach(ex => {
        classes.push(ex.code as ClassWrap)
      })
      this.ctx.imports.filter(im => im.kind === CodeKind.CLASS).forEach(im => {
        classes.push(im.code as ClassWrap)
      })
      classes.push(...this.ctx.objects)
      return classes
    })
  }

  get importedClassNodes(): ClassDeclaration[] {
    return this.cache.get<ClassDeclaration[]>('importedClassNodes', () => {
      return this.ctx.imports
        .filter(ex => ex.kind === CodeKind.CLASS)
        .map(ex => (<ClassWrap>ex.code).node)
    })
  }

  validate(): void {
    this.ctx.sources.forEach(src => {
      this.validateSourceStatements(src)
    })

    this.ctx.exports.forEach(ex => {
      switch (ex.kind) {
        case CodeKind.CLASS:
          this.validateJigInheritance(ex.code as ClassWrap)
          this.validateJigMembers(ex.code as ClassWrap)
          this.validateClassTypes(ex.code as ClassWrap)
          break
        case CodeKind.FUNCTION:
          this.validateArgTypes(ex.code as FunctionWrap)
          this.validateReturnType(ex.code as FunctionWrap)
          break
        case CodeKind.INTERFACE:
          break
      }
    })

    this.ctx.imports.forEach(im => {
      switch (im.kind) {
        case CodeKind.CLASS:
          // must not export from entry
          this.validateJigInheritance(im.code as ClassWrap)
          this.validateJigMembers(im.code as ClassWrap)
          this.validateClassTypes(im.code as ClassWrap)
          break
        case CodeKind.FUNCTION:
          // must not export from entry
          this.validateArgTypes(im.code as FunctionWrap)
          this.validateReturnType(im.code as FunctionWrap)
          break
        case CodeKind.INTERFACE:
          break
      }
    })

    this.ctx.objects.forEach(obj => {
      // must not export from entry
      this.validateFieldTypes(obj)
    })

    this.ctx.sources.forEach(src => {
      filterAST(src, (node: Node) => {
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

  private validateArgTypes(fn: FunctionWrap | MethodWrap): void {
    fn.args.forEach(n => {
      // Ensures all exposed argument types are allowed
      if (
        !whitelist.types.includes(n.type.name) &&
        !this.exposedClasses.map(n => n.name).includes(n.type.name)
      ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_method_type,
          [n.type.name, fn.name],
          (<FieldWrap>n).node.range
        ))
      }
    })
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
    // Ensures sidekick and imported code is not exported from entry
    if (
      isExported(node.flags) &&
      !this.exportedClassNodes.includes(node) &&
      node.range.source.sourceKind === SourceKind.UserEntry
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_export,
        [],
        node.range
      ))
    }

    // Ensure plain or sidekick classes do not inherit from Jig
    if (
      !this.exportedClassNodes.includes(node) &&
      !this.importedClassNodes.includes(node) &&
      node.extendsType?.name.identifier.text === 'Jig'
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_jig_class,
        [node.name.text, 'must not'],
        node.range
      ))
    }

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

  private validateClassTypes(obj: ClassWrap): void {
    this.validateFieldTypes(obj)
    this.validateMethodTypes(obj)
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

  private validateFieldTypes(obj: ClassWrap | ObjectWrap): void {
    obj.fields.forEach(n => {
      // Ensure all field types are allowed
      if (
        !whitelist.types.includes(n.type.name) &&
        !this.exposedClasses.map(n => n.name).includes(n.type.name)
      ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Error,
          AldeaDiagnosticCode.Invalid_field_type,
          [n.type.name, n.name],
          (<FieldWrap>n).node.range
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
        [],
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

  private validateJigInheritance(obj: ClassWrap): void {
    // Ensure imported or exported object inherits from Jig
    if (!isJig(obj, this.ctx)) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_jig_class,
        [obj.name, 'must'],
        obj.node.range
      ))
    
    }
  }

  private validateJigMembers(obj: ClassWrap): void {
    obj.node.members.forEach(n => {
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
      // Warn about private or protected members
      if (
        (isPrivate(n.flags) || isProtected(n.flags))
      ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.Warning,
          AldeaDiagnosticCode.Private_member,
          [],
          n.range
        ))
      }
    })
  }

  private validateMethodTypes(obj: ClassWrap): void {
    obj.methods.forEach(fn => {
      this.validateArgTypes(fn as MethodWrap)
      this.validateReturnType(fn as MethodWrap)
    })
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

  private validateReturnType(fn: FunctionWrap | MethodWrap): void {
    // Ensures all exposed return types are allowed
    if (
      fn.rtype && fn.rtype.name && fn.rtype.name !== 'void' &&
      !whitelist.types.includes(fn.rtype.name) &&
      !this.exposedClasses.map(n => n.name).includes(fn.rtype.name)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.Error,
        AldeaDiagnosticCode.Invalid_method_type,
        [fn.rtype.name, fn.name],
        (<TypeWrap>fn.rtype).node.range
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

// Returns the greatest ancestor of the given object
function isJig(obj: ObjectWrap, ctx: TransformCtx): boolean {
  let extendsFrom: string | null = obj.extends
  let parent: ObjectWrap | undefined = obj

  while (parent?.extends) {
    extendsFrom = parent.extends
    parent = ctx.objects.find(o => o.name === extendsFrom)
  }
  return extendsFrom === 'Jig'
}
