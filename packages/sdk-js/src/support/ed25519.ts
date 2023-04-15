import {
  ExtendedPoint as Point,
  sign as _sign,
  verify as _verify,
  CURVE,
  etc,
  utils,
} from '@noble/ed25519'
import { hash } from './blake3.js'
import { bnToBytes, bytesToBn, concatBytes } from './util.js'
import { PrivKey, PubKey, HDPrivKey, HDPubKey } from '../internal.js'

// Internally we replace nobles sha512Sync function with our own blake3
// function. As long as we use the sync methods, we are now using
// blake3-flavoured ed25519 - just like magic!
etc.sha512Sync = (...m: Uint8Array[]): Uint8Array => {
  return hash(concatBytes(...m), 64)
}

/**
 * Calculates the EdDSA Point (public key) from the given bytes (private key).
 */
export function calcPoint(bytes: Uint8Array): Point {
  return utils.getExtendedPublicKey(bytes).point
}

/**
 * Returns a point from the given bytes (compressed public key).
 */
export function pointFromBytes(bytes: string | Uint8Array): Point {
  return Point.fromHex(bytes)
}

/**
 * Converts a point to bytes (compressed public key).
 */
export function pointToBytes(point: Point): Uint8Array {
  if (!(point instanceof Point)) {
    throw Error('The first argument to `pointToBytes()` must be a `Point`')
  }
  return point.toRawBytes()
}

/**
 * Signs the given message with the PrivKey and returns a 64 byte signature.
 */
export function sign(msg: Uint8Array, privKey: PrivKey | HDPrivKey | Uint8Array): Uint8Array {
  if (!(privKey instanceof Uint8Array)) { privKey = privKey.toBytes()}
  return privKey.length === 96 ? _signExt(msg, privKey) : _sign(msg, privKey)
}

/**
 * Verifies the given signature using the specified message and Public Key.
 */
export function verify(sig: Uint8Array, msg: Uint8Array, pubKey: PubKey | HDPubKey | Uint8Array): boolean {
  if (!(pubKey instanceof Uint8Array)) {
    if ('toPubKey' in pubKey) pubKey = pubKey.toPubKey()
    pubKey = pubKey.toBytes()
  }
  return _verify(sig, msg, pubKey)
}

// Special signing function for handling extended public keys
function _signExt(msg: Uint8Array, k: Uint8Array): Uint8Array {
  const kl = k.slice(0, 32)
  const kr = k.slice(32, 64)
  const aBuf = Point.BASE._scalarMult(bytesToBn(kl)).toRawBytes()
  const r = etc.mod(bytesToBn(hash(concatBytes(kr, msg), 64)), CURVE.n)
  const rBuf = Point.BASE.mul(r).toRawBytes()
  const x = bytesToBn(hash(concatBytes(rBuf, aBuf, msg), 64))
  const sBuf = bnToBytes(etc.mod(r + (x * bytesToBn(kl)), CURVE.n))
  return concatBytes(rBuf, sBuf)
}

// Monkey patch in typescript friendly way
declare module '@noble/ed25519' {
  interface ExtendedPoint {
    _scalarMult(n: bigint): ExtendedPoint;
  } 
}

/**
 * PATCH Same as `mul()` method but without validation on `n` size.
 */
Point.prototype._scalarMult = function(n: bigint): Point {
  if (n === 0n) return this.mul(n)
  let p = Point.ZERO
  for (let d: Point = this; n > 0n; d = d.double(), n >>= 1n) {
    if (n & 1n) p = p.add(d)
  }
  return p;
}

export { Point }
