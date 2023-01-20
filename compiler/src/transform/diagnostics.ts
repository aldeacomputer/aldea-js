/**
 * Module for building Aldea-specific Diagnostic Messages.
 */
import {
  DiagnosticCategory,
  DiagnosticMessage,
  Range
} from 'assemblyscript'

/**
 * Aldea disagnostic error codes.
 * 
 * - Illegal means not allowed
 * - Invalid means wrong, but there is a right alternative
 */
export enum AldeaDiagnosticCode {
  Invalid_source_statement = 400,
  Invalid_export,
  Invalid_jig_class,
  Invalid_class_member,
  Invalid_jig_member,
  Invalid_field_type,
  Invalid_method_type,
  Invalid_decorator,
  Invalid_package,
  Illegal_identifier = 410,
  Illegal_access_global,
  Illegal_access_property,
  Illegal_assignment,
  Private_member = 420,
  Private_member_warn,
}

/**
 * Returns a string template for the given diagnostic error code.
 */
export function diagnosticCodeToString(code: AldeaDiagnosticCode): string {
  switch(code) {
    case AldeaDiagnosticCode.Invalid_source_statement:
      return 'Illegal statement. Only classes, functions, enums and literal constants can be declared.'
    case AldeaDiagnosticCode.Invalid_export:
      return 'Invalid export. Imported objects and functions must not be exported from the entry.'
    case AldeaDiagnosticCode.Invalid_jig_class:
      return 'Invalid class. {0} {1} inherit from `Jig`.'
    case AldeaDiagnosticCode.Invalid_class_member:
      return 'Invalid member. {0} are not allowed on classes.'
    case AldeaDiagnosticCode.Invalid_jig_member:
      return 'Invalid member. {0} are not allowed on jigs.'
    case AldeaDiagnosticCode.Invalid_field_type:
      return 'Invalid type. `{0}` type cannot be serialized on `{1}` class.'
    case AldeaDiagnosticCode.Invalid_method_type:
      return 'Invalid type. `{0}` type cannot be be passed to/from `{1}` method.'
    case AldeaDiagnosticCode.Invalid_decorator:
      return 'Invalid decorator. AssemblyScript decorators are not allowed.'
    case AldeaDiagnosticCode.Invalid_package:
      return 'Invalid package. {0}'

    case AldeaDiagnosticCode.Illegal_identifier:
      return 'Illegal identifier. Double underscore-prefixed identifiers cannot be used.'
    case AldeaDiagnosticCode.Illegal_access_global:
      return 'Illegal access. The `{0}` global is restricted.'
    case AldeaDiagnosticCode.Illegal_access_property:
      return 'Illegal access. The `{0}` property is restricted.'
    case AldeaDiagnosticCode.Illegal_assignment:
      return 'Illegal assignment. `{0}` cannot be reassigned.'
    
    case AldeaDiagnosticCode.Private_member:
      return 'Private and protected members are not accessable on imported jigs.' // todo
    case AldeaDiagnosticCode.Private_member_warn:
      return 'Private and protected members are only partially enforeced by Aldea. See https://xxxxx' // todo

    default: return 'Unrecognized error code.'
  }
}

/**
 * Returns an AssemblyScript DiagnosticMessage using Aldea disagnostic codes.
 */
export function createDiagnosticMessage(
  category: DiagnosticCategory,
  code: AldeaDiagnosticCode,
  args: string[] = [],
  range?: Range,
  relatedRange?: Range
): DiagnosticMessage {
  // Build and interpolate message string
  let message = diagnosticCodeToString(code)
  for (let i = 0; i < args.length; i++) {
    message = message.replace(`{${i}}`, args[i])
  }

  // this is a hack because DiagnosticMessage has a private constructor
  const msg = new (DiagnosticMessage as any)(code, category, message) as DiagnosticMessage
  if (range) { msg.range = range }
  if (relatedRange) { msg.relatedRange = relatedRange }
  return msg
}
