/**
 * Module defines a filter methods based on AST node flags.
 */
import { CommonFlags } from 'assemblyscript'

/**
 * Returns true if the node is an ambiant class.
 * 
 * An ambient class is a declared class without implementation.
 */
export function isAmbient(flags: number): boolean {
  return (flags & CommonFlags.AMBIENT) === CommonFlags.AMBIENT
}

/**
 * Returns true if the node is a constructor method.
 */
export function isConstructor(flags: number): boolean {
  return (flags & CommonFlags.CONSTRUCTOR) === CommonFlags.CONSTRUCTOR
}

/**
 * Returns true if the node exported from its module.
 */
export function isExported(flags: number): boolean {
  return (flags & CommonFlags.EXPORT) === CommonFlags.EXPORT
}

/**
 * Returns true if the node has a private modifier.
 */
export function isPrivate(flags: number): boolean {
  return (flags & CommonFlags.PRIVATE) === CommonFlags.PRIVATE
}

/**
 * Returns true if the node has a protected modifier.
 */
export function isProtected(flags: number): boolean {
  return (flags & CommonFlags.PROTECTED) === CommonFlags.PROTECTED
}

/**
 * Returns true if the node is a static method.
 */
export function isStatic(flags: number): boolean {
  return (flags & CommonFlags.STATIC) === CommonFlags.STATIC
}
