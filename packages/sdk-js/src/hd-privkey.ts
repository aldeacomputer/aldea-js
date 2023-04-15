import { HDPubKey, PubKey } from './internal.js'
import { bech32m } from './support/base.js'
import { hash, keyedHash } from './support/blake3.js'
import { Point } from './support/ed25519.js'
import { bnToBytes, bytesToBn, concatBytes, randomBytes } from './support/util.js'

const MASTER_SECRET = 'ed25519 seed'
const HARDENED_OFFSET = 0x80000000
const PREFIX = 'xsec'

/**
 * TODO
 */
export class HDPrivKey {
  constructor(private k: Uint8Array, readonly chainCode: Uint8Array) {
    if (this.k.length !== 64) throw new Error('invalid extended key length')
    if (this.chainCode.length !== 32) throw new Error('invalid chainCode length : '+chainCode.length)
  }

  /**
   * TODO
   */
  static fromRandom(): HDPrivKey {
    return HDPrivKey.fromSeed(randomBytes(32))
  }

  /**
   * TODO
   */
  static fromSeed(seed: Uint8Array): HDPrivKey {
    if (![16, 32, 64].includes(seed.length)) {
      throw new Error(`invalid seed length: ${seed.length}`)
    }

    let i = 0
    while (true) {
      const block = keyedHash(seed, hash(`${MASTER_SECRET} ${i}`, 32))
      const extended = hash(block.slice(0, 32), 64)
      if ((extended[31] & 0b00100000) === 0) {
        extended[0] &= ~0b00000111
        extended[31] &= ~0b10000000
        extended[31] |= 0b01000000
        return new HDPrivKey(extended, block.slice(32, 64))
      }
      i++
    }
  }

  /**
   * TODO
   */
  derive(path: string): HDPrivKey | HDPubKey {
    const parts = path.replace(/^[mM]['hH]?/, '')
      .split('/')
      .filter(p => !!p)
      .map(toIndex)

    let child: HDPrivKey | HDPubKey = this
    if (path[0] === 'M') child = child.toHDPubKey()
    for (const idx of parts) {
      child = child.deriveChild(idx)
    }
    return child
  }

  /**
   * TODO
   */
  deriveChild(idx: number): HDPrivKey {
    const kl = this.k.slice(0, 32)
    const kr = this.k.slice(32, 64)
    const ch = hash(this.chainCode, 32)
    const pk = this.pubkeyBytes()

    const iBuf = new Uint8Array(4)
    const iBufView = new DataView(iBuf.buffer)
    iBufView.setUint32(0, idx, true)

    let z: Uint8Array, c: Uint8Array;
    if (idx < HARDENED_OFFSET) {
      z = keyedHash(concatBytes(new Uint8Array([2]), pk, iBuf), ch)
      c = keyedHash(concatBytes(new Uint8Array([3]), pk, iBuf), ch).slice(32, 64)
    } else {
      z = keyedHash(concatBytes(new Uint8Array([0]), this.k, iBuf), ch)
      c = keyedHash(concatBytes(new Uint8Array([1]), this.k, iBuf), ch).slice(32, 64)
    }

    const zl = z.slice(0, 28)
    const zr = z.slice(32, 64)

    const left = bnToBytes((bytesToBn(zl) * BigInt(8)) + bytesToBn(kl))
    const right = bnToBytes((bytesToBn(zr) + bytesToBn(kr)) % (BigInt(2) ** BigInt(256)))

    return new HDPrivKey(concatBytes(left, right), c)
  }

  /**
   * TODO
   */
  toHDPubKey(): HDPubKey {
    return new HDPubKey(this.pubkeyBytes(), this.chainCode)
  }

  /**
   * TODO
   */
  toPubKey(): PubKey {
    return PubKey.fromBytes(this.pubkeyBytes())
  }

  /**
   * TODO
   */
  toBytes(): Uint8Array {
    return concatBytes(this.k, this.chainCode)
  }

  /**
   * TODO
   */
  toString(): string {
    return bech32m.encode(this.toBytes(), PREFIX)
  }

  // TODO
  private pubkeyBytes() {
    return Point.BASE._scalarMult(bytesToBn(this.k.slice(0, 32))).toRawBytes()
  }
}

// TODO
function toIndex(part: string): number {
  const m = /^(\d+)(['hH])?$/.exec(part)
  if (!m || m.length !== 3) {
    throw new Error(`invalid child index: ${part}`)
  }
  let idx = +m[1]
  if (!Number.isSafeInteger(idx) || idx >= HARDENED_OFFSET) {
    throw new Error(`invalid child index: ${part}`)
  }
  if (typeof m[2] !== 'undefined') idx += HARDENED_OFFSET
  return idx
}
