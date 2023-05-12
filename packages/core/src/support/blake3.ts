import { blake3 } from '@noble/hashes/blake3'

/**
 * Returns a digest of the given data using the Blake3 algorithm.
 */
export function hash(data: Uint8Array | string, bytes: number = 32): Uint8Array {
  return blake3(data, { dkLen: bytes })
}

/**
 * Returns a keyed hash of the given data using the Blake3 algorithm. The key
 * must be 32 bytes.
 */
export function keyedHash(data: Uint8Array | string, key: Uint8Array | string, bytes: number = 64): Uint8Array {
  // todo - workaround for this bug: https://github.com/paulmillr/noble-hashes/issues/50
  const keyCopy = typeof key === 'string' ? key : new Uint8Array(key)
  return blake3(data, { dkLen: bytes, key: keyCopy })
}

/**
 * Derives a 32 byte key from the given key material and context string.
 */
export function deriveKey(data: Uint8Array | string, ctx: Uint8Array | string): Uint8Array {
  return blake3(data, { dkLen: 32, context: ctx })
}
