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
 */
export enum AldeaDiagnosticCode {
  Invalid_source_statement = 400,
  Invalid_jig_class = 401,
  Invalid_class_member = 402,
  Invalid_jig_member = 403,
  Invalid_field_type = 404,
  Invalid_method_type = 405,
  Invalid_identifier = 406,
  Illegal_global = 407,
  Illegal_property = 408,
  Illegal_assignment = 409,
  Illegal_decorator = 410,
  Private_member = 420
}

/**
 * Returns a string template for the given diagnostic error code.
 */
export function diagnosticCodeToString(code: AldeaDiagnosticCode): string {
  switch(code) {
    case 400: return 'Invalid statement. Only classes, functions, enums and literal constants can be declared at the top level.'
    case 401: return 'Invalid class. {0} {1} inherit from `Jig`.'
    case 402: return 'Invalid member. {0} are not allowed on classes.'
    case 403: return 'Invalid member. {0} are not allowed on jigs.'
    case 404: return 'Invalid type. `{0}` type cannot be serialized on `{1}` class.'
    case 405: return 'Invalid type. `{0}` type cannot be be passed to/from `{1}` method.'
    case 406: return 'Invalid identifier. Double underscore-prefixed identifiers cannot be used.'
    case 407: return 'Illegal access. The `{0}` global is restricted.'
    case 408: return 'Illegal access. The `{0}` property is restricted.'
    case 409: return 'Illegal assignment. `{0}` cannot be reassigned.'
    case 410: return 'Illegal decorator. AssemblyScript decorators are not allowed.'

    case 420: return 'Private and protected members are only partially enforeced by Aldea. See https://xxxxx'

    default:  return 'Unrecognized error code.'
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
