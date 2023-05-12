/**
 * Endian enum
 */
export enum Endian {
  BIG,
  LITTLE
}

/**
 * Returns true if the given endiam enum is LITTLE.
 */
export function isLE(endian: Endian = Endian.LITTLE): boolean {
  return endian === Endian.LITTLE
}
