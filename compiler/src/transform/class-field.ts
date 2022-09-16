import {
  CommonFlags,
  FieldDeclaration,
  NamedTypeNode,
  ParameterNode
} from 'assemblyscript'

/**
 * Class field.
 */
export class ClassField {
  name: string;
  type: string;
  flags: number;

  constructor(name: string, type: string, flags: number = 0) {
    this.name = name
    this.type = type
    this.flags = flags
  }

  static fromNode(field: FieldDeclaration | ParameterNode): ClassField {
    return new this(
      field.name.text,
      (field.type as NamedTypeNode).name.identifier.text,
      field.flags
    )
  }

  get isAmbiant(): boolean {
    return (this.flags & CommonFlags.AMBIENT) === CommonFlags.AMBIENT
  }

  get isPrivate(): boolean {
    return (this.flags & CommonFlags.PRIVATE) === CommonFlags.PRIVATE
  }

  get isProtected(): boolean {
    return (this.flags & CommonFlags.PROTECTED) === CommonFlags.PROTECTED
  }
}
