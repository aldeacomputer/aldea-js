import {
  CallExpression,
  DiagnosticCategory,
  Expression,
  IdentifierExpression,
  LiteralExpression,
  LiteralKind,
  NewExpression,
  Node,
  NodeKind,
  PropertyAccessExpression,
  Source,
  VariableDeclaration,
  VariableStatement,
} from 'assemblyscript'

import { ObjectKind } from '../abi.js'
import { TransformCtx } from './ctx.js'
import { AldeaDiagnosticCode, createDiagnosticMessage } from './diagnostics.js'
import { ObjectWrap, FieldWrap, TypeWrap, FunctionWrap, MethodWrap } from './nodes.js'
import { filterAST, isConst, isStatic } from './filters.js'

// Allowed top-level statements - everything else is an error!
const allowedSrcStatements = [
  NodeKind.CLASSDECLARATION,
  NodeKind.ENUMDECLARATION,
  NodeKind.FUNCTIONDECLARATION,
  NodeKind.VARIABLE,
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
    'Map', 'Set'
  ]
}

/**
 * The validator takes a TransformCtx and executes a sequence of validations.
 * Diagnostic messages get added to the Parser.
 */
export class Validator {
  ctx: TransformCtx;

  constructor(ctx: TransformCtx) {
    this.ctx = ctx
  }

  validate(): void {
    this.ctx.sources.forEach(src => {
      this.validateSourceStatements(src)
    })

    this.ctx.objects.forEach(obj => {
      this.validateClassMembers(obj)
    })

    this.ctx.exposedObjects.forEach(obj => {
      this.validateFieldTypes(obj)
      this.validateMethodTypes(obj)
    })

    this.ctx.exportedFunctions.forEach(fn => {
      this.validateArgTypes(fn)
      this.validateReturnType(fn)
    })

    filterAST(this.ctx.entry, (node: Node) => {
      switch (node.kind) {
        case NodeKind.IDENTIFIER:
          this.validateIdentifierNode(node as IdentifierExpression)
          break
        case NodeKind.CALL:
          this.validateCallNode(node as CallExpression)
          break
        case NodeKind.NEW:
          this.validateNewExpressionNode(node as NewExpression)
          break
        case NodeKind.PROPERTYACCESS:
          this.validatePropertyAccessNode(node as PropertyAccessExpression)
          break
        case NodeKind.VARIABLEDECLARATION:
          this.validateVariableDeclarationNode(node as VariableDeclaration)
          break
      }
    })
  }

  private validateSourceStatements(src: Source): void {
    src.statements.forEach(n => {
      // Ensure all source top-level statements are allowed
      if (!allowedSrcStatements.includes(n.kind)) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.ERROR,
          AldeaDiagnosticCode.Invalid_source_statement,
          [],
          n.range
        ))
      }
      // Ensure global variables are literal constants
      const badVar = n.kind === NodeKind.VARIABLE && (<VariableStatement>n).declarations.find(d => {
        return !isConst(d.flags) || !(isAllowedLiteral(d.initializer) || isAllowedLiteralOther(d.initializer))
      })
      if (badVar) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.ERROR,
          AldeaDiagnosticCode.Invalid_source_statement,
          [],
          badVar.range
        ))
      }
    })
  }

  private validateClassMembers(obj: ObjectWrap): void {
    obj.node.members.forEach(n => {
      // Ensure no static properties
      if (n.kind === NodeKind.FIELDDECLARATION && isStatic(n.flags)) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.ERROR,
          AldeaDiagnosticCode.Invalid_class_member,
          ['Static properties'],
          n.range
        ))
      }
      // Ensure no instance methods begin with underscore
      if (
        obj.kind === ObjectKind.EXPORTED &&
        n.kind === NodeKind.METHODDECLARATION &&
        n.name.text.startsWith('_')
      ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.ERROR,
          AldeaDiagnosticCode.Invalid_method_name,
          [],
          n.range
        ))
      }
    })
  }

  private validateFieldTypes(obj: ObjectWrap): void {
    obj.fields.forEach(n => {
      // Ensure all field types are allowed
      if (
        !whitelist.types.includes(n.type.name) &&
        !this.ctx.exposedObjects.map(n => n.name).includes(n.type.name)
      ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.ERROR,
          AldeaDiagnosticCode.Invalid_field_type,
          [n.type.name, n.name],
          n.node.range
        ))
      }
    })
  }

  private validateMethodTypes(obj: ObjectWrap): void {
    obj.methods.forEach(fn => {
      this.validateArgTypes(fn)
      this.validateReturnType(fn)
    })
  }

  private validateArgTypes(fn: FunctionWrap | MethodWrap): void {
    fn.args.forEach(n => {
      // Ensures all exposed argument types are allowed
      if (
        !whitelist.types.includes(n.type.name) &&
        !this.ctx.exposedObjects.map(n => n.name).includes(n.type.name)
      ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.ERROR,
          AldeaDiagnosticCode.Invalid_method_type,
          [n.type.name, fn.name],
          (<FieldWrap>n).node.range
        ))
      }
    })
  }

  private validateReturnType(fn: FunctionWrap | MethodWrap): void {
    // Ensures all exposed return types are allowed
    if (
      fn.rtype && fn.rtype.name && fn.rtype.name !== 'void' &&
      !whitelist.types.includes(fn.rtype.name) &&
      !this.ctx.exposedObjects.map(n => n.name).includes(fn.rtype.name)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.ERROR,
        AldeaDiagnosticCode.Invalid_method_type,
        [fn.rtype.name, fn.name],
        (<TypeWrap>fn.rtype).node.range
      ))
    }
  }

  private validateIdentifierNode(node: IdentifierExpression): void {
    // Ensure no double underscore identifiers
    if (node.text.startsWith('__')) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.ERROR,
        AldeaDiagnosticCode.Invalid_identifier,
        [],
        node.range
      ))
    }
  }

  private validateCallNode(node: CallExpression): void {
    // Ensure no calls to blacklisted globals
    if (
      node.expression.kind === NodeKind.IDENTIFIER &&
      blacklist.globalFns.includes((<IdentifierExpression>node.expression).text)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.ERROR,
        AldeaDiagnosticCode.Illegal_global,
        [(<IdentifierExpression>node.expression).text],
        node.range
      ))
    }
  }

  private validateNewExpressionNode(node: NewExpression): void {
    // Ensure no new expressions on blacklisted classes
    if (blacklist.constructors.includes(node.typeName.identifier.text)) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.ERROR,
        AldeaDiagnosticCode.Illegal_global,
        [node.typeName.identifier.text],
        node.range
      ))
    }
  }

  private validatePropertyAccessNode(node: PropertyAccessExpression): void {
    // Ensure no access to blacklisted namespaces
    if (
        node.expression.kind === NodeKind.IDENTIFIER &&
        blacklist.namespaces.includes((<IdentifierExpression>node.expression).text)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.ERROR,
        AldeaDiagnosticCode.Illegal_global,
        [(<IdentifierExpression>node.expression).text],
        node.range
      ))
    }
    // Ensure no access to restricted property names
    if (
      node.expression.kind === NodeKind.IDENTIFIER &&
      blacklist.patterns[(<IdentifierExpression>node.expression).text]?.includes(node.property.text)
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.ERROR,
        AldeaDiagnosticCode.Illegal_property,
        [node.property.text],
        node.range
      ))
    }
  }

  private validateVariableDeclarationNode(node: VariableDeclaration): void {
    // Ensure no restricted globals and namespaces are reassigned
    if (
      node.initializer && node.initializer.kind === NodeKind.IDENTIFIER && (
        blacklist.constructors.includes((<IdentifierExpression>node.initializer).text) ||
        blacklist.namespaces.includes((<IdentifierExpression>node.initializer).text) ||
        blacklist.globalFns.includes((<IdentifierExpression>node.initializer).text) ||
        blacklist.patterns[(<IdentifierExpression>node.initializer).text]?.length
      )
    ) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.ERROR,
        AldeaDiagnosticCode.Illegal_assignment,
        [(<IdentifierExpression>node.initializer).text],
        node.range
      ))
    }
  }
}

// Returns true if node kind is a safe literal
function isAllowedLiteral(node: Expression | null): Boolean {
  if (!node) return false
  return node.kind === NodeKind.LITERAL && [
    LiteralKind.FLOAT,
    LiteralKind.INTEGER,
    LiteralKind.STRING,
    LiteralKind.TEMPLATE,
    LiteralKind.REGEXP,
  ].includes((<LiteralExpression>node).literalKind)
}

// Returns true if node kind is a safe literal other
function isAllowedLiteralOther(node: Expression | null): Boolean {
  if (!node) return false
  return [
    NodeKind.TRUE,
    NodeKind.FALSE,
    NodeKind.NULL
  ].includes(node.kind)
}
