import { blake3 } from '@noble/hashes/blake3'

/**
 * Returns a digest of the given data using the Blake3 algorithm.
 */
export function hash(data: Uint8Array | string, bytes: number = 32): Uint8Array {
  return blake3(data, { dkLen: bytes })
}

/**
 * TODO
 */
export function keyedHash(data: Uint8Array | string, key: Uint8Array | string, bytes: number = 64): Uint8Array {
  return blake3(data, { dkLen: bytes, key })
}

/**
 * TODO
 */
export function deriveKey(data: Uint8Array | string, ctx: Uint8Array | string): Uint8Array {
  return blake3(data, { dkLen: 32, context: ctx })
}
