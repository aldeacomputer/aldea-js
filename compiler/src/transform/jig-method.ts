import { CommonFlags, MethodDeclaration, NamedTypeNode } from 'assemblyscript'
import { JigField } from './jig-field.js'

/**
 * Jig method.
 */
export class JigMethod {
  name: string;
  args: JigField[];
  returnType: string;
  flags: number;

  constructor(name: string, args: JigField[], returnType: string, flags: number) {
    this.name = name
    this.args = args
    this.returnType = returnType
    this.flags = flags
  }

  static fromNode(method: MethodDeclaration): JigMethod {
    return new this(
      method.name.text,
      method.signature.parameters.map(p => JigField.fromNode(p)),
      (method.signature.returnType as NamedTypeNode).name.identifier.text,
      method.flags
    )
  }

  get isConstructor(): boolean {
    return (this.flags & CommonFlags.CONSTRUCTOR) === CommonFlags.CONSTRUCTOR
  }

  get isPrivate(): boolean {
    return (this.flags & CommonFlags.PRIVATE) === CommonFlags.PRIVATE
  }

  get isProtected(): boolean {
    return (this.flags & CommonFlags.PROTECTED) === CommonFlags.PROTECTED
  }

  get isStatic(): boolean {
    return (this.flags & CommonFlags.STATIC) === CommonFlags.STATIC
  }
}
