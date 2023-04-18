import { etc } from '@noble/ed25519'
import { randomBytes, utf8ToBytes } from '@noble/hashes/utils'
import { base16 } from './base.js'

/**
 * Encodes the given bigint as a little-endian Uint8Array. 
 */
export function bnToBytes(num: bigint, len: number = 32): Uint8Array {
  let hex = num.toString(16)
  if (hex.length % 2) hex = '0'+hex
  const buf = base16.decode(hex.padStart(len * 2, '0'))
  buf.reverse()
  return buf
}

/**
 * Decodes the given Uint8Array as a little-endian bigint. 
 */
export function bytesToBn(data: Uint8Array): bigint {
  const buf = new Uint8Array(data)
  buf.reverse()
  return BigInt(`0x${base16.encode(buf)}`)
}

/**
 * Check if 2 Uint8Arrays are equal
 */
export function buffEquals(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i])
}

const {
  bytesToHex,
  hexToBytes,
  concatBytes,
  mod,
  invert,
} = etc

export {
  bytesToHex,
  hexToBytes,
  concatBytes,
  randomBytes,
  mod,
  invert,
  utf8ToBytes,
}
