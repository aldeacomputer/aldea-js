import { FieldDeclaration, NamedTypeNode, ParameterNode } from 'assemblyscript'

/**
 * Jig field.
 */
export class JigField {
  name: string;
  type: string;
  flags?: number;

  constructor(name: string, type: string, flags?: number) {
    this.name = name
    this.type = type
    this.flags = flags
  }

  static fromNode(field: FieldDeclaration | ParameterNode): JigField {
    return new this(
      field.name.text,
      (field.type as NamedTypeNode).name.identifier.text,
      field.flags
    )
  }
}
