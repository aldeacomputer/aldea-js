import { blake3 as _blake3 } from '@noble/hashes/blake3'

/**
 * Returns a digest of the given data using the Blake3 algorithm.
 */
export function blake3(data: Uint8Array | string, bytes: number = 32): Uint8Array {
  return _blake3(data, { dkLen: bytes })
}
