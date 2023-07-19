import { CURVE } from '@noble/ed25519'
import { PrivKey, PubKey } from './internal.js'
import { hash, keyedHash } from './support/blake3.js'
import { Point, getSharedSecret } from './support/ed25519.js'
import { mod, bnToBytes, bytesToBn, concatBytes } from './support/util.js'
import { adjustScalarBytes } from './support/x25519.js'

export class SharedKeyPair {
  ownPrivKey: PrivKey;
  theirPubKey: PubKey;
  s: Uint8Array;

  constructor(ownPrivKey: PrivKey, theirPubKey: PubKey) {
    this.ownPrivKey = ownPrivKey
    this.theirPubKey = theirPubKey
    this.s = getSharedSecret(ownPrivKey, theirPubKey)
  }

  getSharedSecret(data: string | Uint8Array, bytes: number = 32): Uint8Array {
    return keyedHash(data, this.s, bytes)
  }

  deriveOwnPrivKeyBytes(data: string | Uint8Array): Uint8Array {
    const k = adjustScalarBytes(hash(this.ownPrivKey.toBytes(), 64))
    const ss = this.getSharedSecret(data)
    return concatBytes(
      bnToBytes(mod(bytesToBn(k.slice(0, 32)) + bytesToBn(ss), CURVE.n)),
      k.slice(32, 64)
    )
  }

  deriveOwnPubKey(data: string | Uint8Array): PubKey {
    const privKey = this.deriveOwnPrivKeyBytes(data).slice(0, 32)
    const point = Point.BASE._scalarMult(bytesToBn(privKey))
    return new PubKey(point)
  }

  deriveTheirPubKey(data: string | Uint8Array): PubKey {
    const ss = this.getSharedSecret(data)
    const point = this.theirPubKey.point.add(Point.BASE._scalarMult(bytesToBn(ss)))
    return new PubKey(point)
  }
}
