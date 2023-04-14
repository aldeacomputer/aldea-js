import { blake3 as _blake3 } from '@noble/hashes/blake3'
import { hmac as _hmac } from '@noble/hashes/hmac'
import { sha512 as _sha512 } from '@noble/hashes/sha512'

/**
 * Returns a digest of the given data using the Blake3 algorithm.
 */
export function blake3(data: Uint8Array | string, bytes: number = 32): Uint8Array {
  return _blake3(data, { dkLen: bytes })
}

/**
 * TODO
 */
export function sha512(data: Uint8Array | string): Uint8Array {
  return _sha512(data)
}

/**
 * TODO
 */
export function hmacSha512(key: Uint8Array, data: Uint8Array): Uint8Array {
  return _hmac(_sha512, key, data)
}
