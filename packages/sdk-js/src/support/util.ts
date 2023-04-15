import { etc } from '@noble/ed25519'
import { base16 } from './base.js'

/**
 * TODO
 */
export function bnToBytes(num: bigint, len: number = 32): Uint8Array {
  let hex = num.toString(16)
  if (hex.length % 2) hex = '0'+hex
  const buf = base16.decode(hex.padStart(len * 2, '0'))
  buf.reverse()
  return buf
}

/**
 * TODO
 */
export function bytesToBn(data: Uint8Array): bigint {
  const buf = new Uint8Array(data)
  buf.reverse()
  return BigInt(`0x${base16.encode(buf)}`)
}

/**
 * TODO
 */
export function utf8ToBytes(str: string): Uint8Array {
  if (typeof str !== 'string') {
    throw new TypeError(`utf8ToBytes expected string, got ${typeof str}`);
  }
  return new TextEncoder().encode(str);
}

const {
  bytesToHex,
  hexToBytes,
  concatBytes,
  randomBytes,
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
}
