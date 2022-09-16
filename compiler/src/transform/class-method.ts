import { CommonFlags, MethodDeclaration, NamedTypeNode } from 'assemblyscript'
import { ClassField } from './class-field.js'

/**
 * Jig method.
 */
export class ClassMethod {
  name: string;
  args: ClassField[];
  returnType: string;
  flags: number;

  constructor(name: string, args: ClassField[], returnType: string, flags: number) {
    this.name = name
    this.args = args
    this.returnType = returnType
    this.flags = flags
  }

  static fromNode(method: MethodDeclaration): ClassMethod {
    return new this(
      method.name.text,
      method.signature.parameters.map(p => ClassField.fromNode(p)),
      (method.signature.returnType as NamedTypeNode).name.identifier.text,
      method.flags
    )
  }

  get isAmbiant(): boolean {
    return (this.flags & CommonFlags.AMBIENT) === CommonFlags.AMBIENT
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
