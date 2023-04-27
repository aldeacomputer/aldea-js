import { HDPubKey, PubKey } from './internal.js'
import { base16, bech32m } from './support/base.js'
import { hash, keyedHash, deriveKey } from './support/blake3.js'
import { Point } from './support/ed25519.js'
import { bnToBytes, bytesToBn, concatBytes, randomBytes } from './support/util.js'

const MASTER_SECRET = 'ed25519 seed'
const HARDENED_OFFSET = 0x80000000
const PREFIX = 'xsec'

/**
 * Hierarchical deterministic private key
 * 
 * Implements [BIP32-ed25519](https://github.com/LedgerHQ/orakolo/blob/master/papers/Ed25519_BIP%20Final.pdf)
 * with hashing primitives swapped out for BLAKE3.
 * 
 * To use with BIP39, we recommend using [@scure/bip39](https://github.com/paulmillr/scure-bip39).
 * 
 * ```ts
 * import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
 * import { wordlist } from '@scure/bip39/wordlists/english'
 * import { HDPrivKey } from '@aldea/sdk-js'
 * 
 * const mnemonic = generateMnemonic(wordlist)
 * const seed = mnemonicToSeedSync(mnemonic)
 * const rootKey = HDPrivKey.fromSeed(seed)
 * const childKey = rootKey.derive('m/1/2/3')
 * ```
 */
export class HDPrivKey {
  private k: Uint8Array;
  readonly chainCode: Uint8Array;

  constructor(k: Uint8Array, chainCode: Uint8Array) {
    if (k.length !== 64) throw new Error('invalid extended key length')
    if (chainCode.length !== 32) throw new Error('invalid chainCode length')
    this.k = k
    this.chainCode = chainCode
  }

  /**
   * Returns a HDPrivKey from the given bytes.
   * 
   * HD Private Keys are 96 bytes.
   */
  static fromBytes(bytes: Uint8Array): HDPrivKey {
    if (!ArrayBuffer.isView(bytes)) {
      throw Error('The first argument to `HDPrivKey.fromBytes()` must be a `Uint8Array`')
    }
    return new HDPrivKey(bytes.slice(0, 64), bytes.slice(64))
  }

  /**
   * Returns a HDPrivKey from the given hex-encoded string.
   */
  static fromHex(str: string): HDPrivKey {
    if (typeof str !== 'string') {
      throw Error('The first argument to `HDPrivKey.fromHex()` must be a `string`')
    }
    const bytes = base16.decode(str)
    return HDPrivKey.fromBytes(bytes)
  }

  /**
   * Returns a HDPrivKey from the given bech32m-encoded string.
   */
  static fromString(str: string): HDPrivKey {
    if (typeof str !== 'string') {
      throw Error('The first argument to `HDPrivKey.fromString()` must be a `string`')
    }
    const bytes = bech32m.decode(str, PREFIX)
    return HDPrivKey.fromBytes(bytes)
  }

  /**
   * Generates and returns a new random HDPrivKey.
   */
  static fromRandom(): HDPrivKey {
    return HDPrivKey.fromSeed(randomBytes(32))
  }

  /**
   * Generates and returns an HDPrivKey from the given seed bytes.
   */
  static fromSeed(seed: Uint8Array): HDPrivKey {
    if (!ArrayBuffer.isView(seed)) {
      throw Error('The first argument to `HDPrivKey.fromSeed()` must be a `Uint8Array`')
    }
    if (![16, 32, 64].includes(seed.length)) {
      throw new Error(`invalid seed length: ${seed.length}`)
    }

    const key = deriveKey(seed, MASTER_SECRET)
    let block = seed
    while (true) {
      block = keyedHash(block, key)
      const extended = hash(block.slice(0, 32), 64)
      //console.log({ block, extended })
      if ((extended[31] & 0b00100000) === 0) {
        extended[0] &= ~0b00000111
        extended[31] &= ~0b10000000
        extended[31] |= 0b01000000
        return new HDPrivKey(extended, block.slice(32, 64))
      }
    }
  }

  /**
   * Derives a new HD key from the given derivation path. Returns either a
   * HDPrivKey or HDPubKey.
   * 
   * The derivation path must of the format described in [BIP-32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki).
   * All of the following examples are valid derivation paths:
   * 
   * ```text
   * m/1/2/3 - derives HDPrivkey
   * M/1/2/3 - derives HDPubkey
   * m/1'/200 - derives hardened HDPrivkey
   * m/1h/200 - equivalent
   * m/1H/200 - equivalent
   * ```
   */
  derive(path: string): HDPrivKey | HDPubKey {
    if (!(typeof path === 'string' && /^[mM]['hH]?(\/\d+['hH]?)+/.test(path))) {
      throw new Error('invalid derivation path')
    }

    const parts = path.replace(/^[mM]['hH]?\//, '')
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
   * Derives new HDPrivKey from the given index integer.
   */
  deriveChild(idx: number): HDPrivKey {
    if (!(typeof idx === 'number' && idx >= 0)) {
      throw new Error(`invalid child index: ${idx}`)
    }

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
   * Returns the HDPrivKey as bytes.
   * 
   * HD Private Keys are 96 bytes.
   */
  toBytes(): Uint8Array {
    return concatBytes(this.k, this.chainCode)
  }

  /**
   * Returns the HDPrivKey as hex-encoded string.
   */
  toHex(): string {
    return base16.encode(this.toBytes())
  }

  /**
   * Returns the HDPrivKey as bech32m-encoded string.
   */
  toString(): string {
    return bech32m.encode(this.toBytes(), PREFIX)
  }

  /**
   * Returns the HDPrivKey's corresponding HDPubKey.
   */
  toHDPubKey(): HDPubKey {
    return new HDPubKey(this.pubkeyBytes(), this.chainCode)
  }

  /**
   * Returns the HDPrivKey's corresponding normal PubKey.
   */
  toPubKey(): PubKey {
    return PubKey.fromBytes(this.pubkeyBytes())
  }

  // Calculates and returns the HDPrivKey's corresponding 32 byte public key
  private pubkeyBytes() {
    return Point.BASE._scalarMult(bytesToBn(this.k.slice(0, 32))).toRawBytes()
  }
}

// Maps the derivation path part to an index number
function toIndex(part: string): number {
  const m = /^(\d+)(['hH])?$/.exec(part)
  if (!m || m.length !== 3) {
    throw new Error(`invalid child index: ${part}`)
  }
  let idx = +m[1]
  if (idx < 0 || idx >= HARDENED_OFFSET) {
    throw new Error(`invalid child index: ${part}`)
  }
  if (typeof m[2] !== 'undefined') idx += HARDENED_OFFSET
  return idx
}
