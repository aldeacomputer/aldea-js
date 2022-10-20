import {
  CallExpression,
  DiagnosticCategory,
  IdentifierExpression,
  NewExpression,
  Node,
  NodeKind,
  PropertyAccessExpression,
  Source,
  VariableDeclaration,
} from 'assemblyscript'

import { ObjectKind } from '../abi.js'
import { TransformCtx } from './ctx.js'
import { AldeaDiagnosticCode, createDiagnosticMessage } from './diagnostics.js'
import { ObjectWrap, FieldWrap, TypeWrap } from './nodes.js'
import { filterAST, isStatic } from './filters.js'

// Allowed top-level statements - everything else is an error!
const allowedSrcStatements = [
  NodeKind.CLASSDECLARATION,
  NodeKind.ENUMDECLARATION,
  NodeKind.FUNCTIONDECLARATION,
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
    'Int8Array', 'Int16Array', 'Int32Array', 'BigInt64Array',
    'Uint8Array', 'Uint16Array', 'Uint32Array', 'BigUint64Array',
    'Array', 'StaticArray',
    // 'Map', 'Set'
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
    /**
     * TODO - extra validations
     * - at least one export!
     * - globals that are literal types should be allowed!
     */

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

  // Ensures all source top-level statements are allowed
  private validateSourceStatements(src: Source): void {
    src.statements.forEach(n => {
      if (!allowedSrcStatements.includes(n.kind)) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.ERROR,
          AldeaDiagnosticCode.Invalid_source_statement,
          [],
          n.range
        ))
      }
    })
  }

  // Ensures no static properties and no instance methods begin with underscore
  private validateClassMembers(obj: ObjectWrap): void {
    obj.node.members.forEach(n => {
      if (n.kind === NodeKind.FIELDDECLARATION && isStatic(n.flags)) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.ERROR,
          AldeaDiagnosticCode.Invalid_class_member,
          ['Static properties'],
          n.range
        ))
      }
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

  // Ensures all field types are supported
  private validateFieldTypes(obj: ObjectWrap): void {
    obj.fields.forEach(n => {
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

  // Ensures all exposed argument and return types are supported
  private validateMethodTypes(obj: ObjectWrap): void {
    obj.methods.forEach(m => {
      m.args.forEach(n => {
        if (
          !whitelist.types.includes(n.type.name) &&
          !this.ctx.exposedObjects.map(n => n.name).includes(n.type.name)
        ) {
          this.ctx.parser.diagnostics.push(createDiagnosticMessage(
            DiagnosticCategory.ERROR,
            AldeaDiagnosticCode.Invalid_method_type,
            [n.type.name, m.name],
            (<FieldWrap>n).node.range
          ))
        }
      })
      if (
        m.rtype && m.rtype.name && m.rtype.name !== 'void' &&
        !whitelist.types.includes(m.rtype.name) &&
        !this.ctx.exposedObjects.map(n => n.name).includes(m.rtype.name)
      ) {
        this.ctx.parser.diagnostics.push(createDiagnosticMessage(
          DiagnosticCategory.ERROR,
          AldeaDiagnosticCode.Invalid_method_type,
          [m.rtype.name, m.name],
          (<TypeWrap>m.rtype).node.range
        ))
      }
    })
  }

  // Ensures no double underscore identifiers
  private validateIdentifierNode(node: IdentifierExpression): void {
    if (node.text.startsWith('__')) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.ERROR,
        AldeaDiagnosticCode.Invalid_identifier,
        [],
        node.range
      ))
    }
  }

  // Ensures no calls to blacklisted globals
  private validateCallNode(node: CallExpression): void {
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

  // Ensures no new expressions on blacklisted classes
  private validateNewExpressionNode(node: NewExpression): void {
    if (blacklist.constructors.includes(node.typeName.identifier.text)) {
      this.ctx.parser.diagnostics.push(createDiagnosticMessage(
        DiagnosticCategory.ERROR,
        AldeaDiagnosticCode.Illegal_global,
        [node.typeName.identifier.text],
        node.range
      ))
    }
  }

  // Ensures no access to blacklisted namespaces
  // and ensures no access to restricted property names
  private validatePropertyAccessNode(node: PropertyAccessExpression): void {
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

  // Ensures no restricted globals and namespaces are reassigned
  private validateVariableDeclarationNode(node: VariableDeclaration): void {
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
