/**
 * Bytes class
 * 
 * A wrapper around an ArrayBuffer that provides convinience helpers for
 * converting to and from common encoding formats.
 */
@global export class Bytes {
  buffer: ArrayBuffer;

  constructor(buf: ArrayBuffer) {
    this.buffer = buf
  }

  static fromBase16(str: string): Bytes {
    return new Bytes(fromBase16(str))
  }

  static fromBase64(str: string): Bytes {
    return new Bytes(fromBase64(str))
  }

  static fromBase64url(str: string, padding: bool = false): Bytes {
    return new Bytes(fromBase64url(str, padding))
  }

  static fromBech32(str: string): Bytes {
    return new Bytes(fromBech32(str))
  }

  static fromBech32m(str: string): Bytes {
    return new Bytes(fromBech32m(str))
  }

  static fromHex(str: string): Bytes {
    return new Bytes(fromHex(str))
  }

  static fromString(str: string): Bytes {
    return new Bytes(fromString(str))
  }

  toBase16(): string {
    return toBase16(this.buffer)
  }

  toBase64(): string {
    return toBase64(this.buffer)
  }

  toBase64url(padding: bool = false): string {
    return toBase64url(this.buffer, padding)
  }

  toBech32(prefix: string): string {
    return toBech32(this.buffer, prefix)
  }

  toBech32m(prefix: string): string {
    return toBech32m(this.buffer, prefix)
  }

  toHex(): string {
    return toHex(this.buffer)
  }

  toString(): string {
    return toString(this.buffer)
  }
}

/**
 * Decodes the Base16 encoded string into a Buffer.
 */
export function fromBase16(str: string): ArrayBuffer {
  return decodeBase16(str, BASE16)
}

/**
 * Decodes the Base64 encoded string into a Buffer.
 */
export function fromBase64(str: string): ArrayBuffer {
  return decodeBase64(str, true, BASE64)
}

/**
 * Decodes the Base64url encoded string into a Buffer.
 */
export function fromBase64url(str: string, padding: bool = false): ArrayBuffer {
  return decodeBase64(str, padding, BASE64URL)
}

/**
 * Decodes the Bech32 encoded string into a Buffer.
 */
export function fromBech32(str: string): ArrayBuffer {
  return decodeBech32(str, 1)
}

/**
 * Decodes the Base32m encoded string into a Buffer.
 */
export function fromBech32m(str: string): ArrayBuffer {
  return decodeBech32(str, 0x2bc830a3)
}

/**
 * Decodes the Hex encoded string into a Buffer.
 */
export function fromHex(str: string): ArrayBuffer {
  return decodeBase16(str, BASE16HEX)
}

/**
 * Decodes the UTF-16 encoded string into a Buffer.
 */
export function fromString(str: string): ArrayBuffer {
  return String.UTF8.encode(str)
}

/**
 * Encodes the buffer into a Base16 encoded string.
 */
export function toBase16(buf: ArrayBuffer): string {
  return encodeBase16(buf, BASE16)
}

/**
 * Encodes the buffer into a Base64 encoded string.
 */
export function toBase64(buf: ArrayBuffer): string {
  return encodeBase64(buf, true, BASE64)
}

/**
 * Encodes the buffer into a Base64url encoded string.
 */
export function toBase64url(buf: ArrayBuffer, padding: bool = false): string {
  return encodeBase64(buf, padding, BASE64URL)
}

/**
 * Encodes the buffer into a Bech32 encoded string.
 */
export function toBech32(buf: ArrayBuffer, prefix: string): string {
  return encodeBech32(buf, prefix, 1)
}

/**
 * Encodes the buffer into a Bech32m encoded string.
 */
export function toBech32m(buf: ArrayBuffer, prefix: string): string {
  return encodeBech32(buf, prefix, 0x2bc830a3)
}

/**
 * Encodes the buffer into a Hex encoded string.
 */
export function toHex(buf: ArrayBuffer): string {
  return encodeBase16(buf, BASE16HEX)
}

/**
 * Encodes the buffer into a UTF-16 encoded string.
 */
export function toString(buf: ArrayBuffer): string {
  return String.UTF8.decode(buf)
}


// Helpers: Alphabet
// =================

const BASE16: string = '0123456789ABCDEF'
const BASE16HEX: string = '0123456789abcdef'
const BASE64: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const BASE64URL: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const BECH32: string = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

// Encodes the given digitis into a string using the specified alphabet
function encodeAlphabet(digits: u8[], alphabet: string): string[] {
  const chars: string[] = []
  for (let i = 0; i < digits.length; i++) {
    const digit: i32 = digits[i]
    if (digit < 0 || digit >= alphabet.length) {
      throw new Error(`digit index outside alphabet: ${i} (alphabet: ${alphabet.length})`)
    }
    chars[i] = alphabet.charAt(digit)
  }
  return chars
}

// Decodes the given input chars into digits using the specified alphabet
function decodeAlphabet(input: string[], alphabet: string): u8[] {
  const digits: u8[] = []
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const idx = alphabet.indexOf(char) as u8
    if (idx === -1) throw new Error(`unknown char: "${char}". Allowed: ${alphabet}`);
    digits[i] = idx
  }
  return digits
}

// Helpers: Base16
// ===============

// Encodes the given data into a base16/hex string
function encodeBase16(buffer: ArrayBuffer, alphabet: string): string {
  const digits = encodeRadix2(buffer, 4)
  const chars = encodeAlphabet(digits, alphabet)
  return chars.join('')
}

// Decodes the given base16/hex string into a buffer
function decodeBase16(input: string, alphabet: string): ArrayBuffer {
  const digits = decodeAlphabet(input.split(''), alphabet)
  return decodeRadix2(digits, 4)
}

// Helpers: Base64
// ===============

// Encodes the given data into a base64/base64url string
function encodeBase64(buffer: ArrayBuffer, padding: bool, alphabet: string): string {
  const digits = encodeRadix2(buffer, 6)
  const chars = encodeAlphabet(digits, alphabet)
  return (padding ? encodePadding(chars, 6) : chars).join('')
}

// Decodes the given base64/base64url string into a buffer
function decodeBase64(input: string, padding: bool, alphabet: string): ArrayBuffer {
  const chars = padding ? decodePadding(input.split(''), 6) : input.split('')
  const digits = decodeAlphabet(chars, alphabet)
  return decodeRadix2(digits, 6)
}

// Helpers: Bech32
// ===============

const POLYMOD_GENERATORS = [
  0x3b6a57b2,
  0x26508e6d,
  0x1ea119fa,
  0x3d4233dd,
  0x2a1462b3
]

// Encodes the given data into a bech32/bech32m string
function encodeBech32(buffer: ArrayBuffer, prefix: string, encodingConst: u32): string {
  const length = prefix.length + buffer.byteLength + 7
  if (length > 90) {
    throw new Error(`bech32: encoded length ${length} exceeds limit (90)`);
  }

  const words = encodeRadix2(buffer, 5)
  const chars = encodeAlphabet(words, BECH32)
  const checksum = bech32Checksum(prefix, words, encodingConst)
  return `${prefix.toLowerCase()}1${chars.join('')}${checksum}`
}

// Decodes the given bech32/bech32m string into a buffer
function decodeBech32(input: string, encodingConst: u32): ArrayBuffer {
  if (input.length < 8 || input.length > 90) {
    throw new Error(`bech32: invalid string length: ${input.length}. expected (8..90)`);
  }

  const lowered = input.toLowerCase()
  if (lowered !== input && input !== input.toUpperCase()) {
    throw new Error(`bech32: string must be lowercase or uppercase`);
  }

  const sepIdx = lowered.lastIndexOf('1')
  if (sepIdx === 0 || sepIdx === -1) {
    throw new Error('letter "1" must be present between prefix and data only')
  }

  const prefix = lowered.slice(0, sepIdx)
  const _words = lowered.slice(sepIdx + 1)
  if (_words.length < 6) {
    throw new Error('bech32: string must be at least 6 characters long')
  }

  const words = decodeAlphabet(_words.split(''), BECH32).slice(0, -6)
  const sum = bech32Checksum(prefix, words, encodingConst)
  if (!_words.endsWith(sum)) {
    throw new Error(`bech32: invalid checksum in ${prefix}: expected "${sum}"`)
  }

  return decodeRadix2(words, 5)    
}

// Calculates a bech32 checksum for the given words
function bech32Checksum(prefix: string, words: u8[], encodingConst: u32): string {
  let chk = 1
  for (let i = 0; i < prefix.length; i++) {
    const c = prefix.charCodeAt(i)
    if (c < 33 || c > 126) throw new Error(`invalid prefix (${prefix})`)
    chk = bech32Polymod(chk) ^ (c >> 5)
  }
  chk = bech32Polymod(chk)
  for (let i = 0; i < prefix.length; i++) {
    chk = bech32Polymod(chk) ^ (prefix.charCodeAt(i) & 0x1f)
  }
  for (let i = 0; i < words.length; i++) {
    chk = bech32Polymod(chk) ^ words[i]
  }
  for (let i = 0; i < 6; i++) {
    chk = bech32Polymod(chk)
  }
  chk ^= encodingConst
  
  const digits = radix2Convert([chk % 2 ** 30], 30, 5, false)
  const chars = encodeAlphabet(digits, BECH32)
  return chars.join('')
}


function bech32Polymod(pre: u32): u32 {
  const b = pre >> 25
  let chk = (pre & 0x1ffffff) << 5
  for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
    if (((b >> i) & 1) === 1) chk ^= POLYMOD_GENERATORS[i]
  }
  return chk
}

// Helpers: Padding
// ================

// Pads the given array of chars with the specified char element
function encodePadding(data: string[], bits: u8, chr: string = '='): string[] {
  while ((data.length * bits) % 8) data.push(chr)
  return data
}

// Unpads the given array of chars
function decodePadding(input: string[], bits: u8, chr: string = '='): string[] {
  let end = input.length;
  if ((end * bits) % 8) {
    throw new Error('invalid padding: string should have whole number of bytes')
  }
  for (end; end > 0 && input[end - 1] === chr; end--) {
    if (!(((end - 1) * bits) % 8)) {
      throw new Error('invalid padding: string has too much padding')
    }
  }
  return input.slice(0, end);
}

// Helpers: Radix2
// ===============

// Encodes the given data into an array of digits
function encodeRadix2(buffer: ArrayBuffer, bits: u8, revPadding: bool = false): u8[] {
  radix2Validate(bits)
  const bytes = Uint8Array.wrap(buffer)
  const data: u32[] = []
  for (let i = 0; i < bytes.length; i++) { data[i] = bytes[i] }
  return radix2Convert(data, 8, bits, !revPadding)
}

// Decodes the given array of digitis string into a buffer
function decodeRadix2(digits: u8[], bits: u8, revPadding: bool = false): ArrayBuffer {
  radix2Validate(bits)
  const data = radix2Convert(digits.map((n: u8) => u32(n)), bits, 8, revPadding)
  const bytes = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) { bytes[i] = data[i] }
  return bytes.buffer
}

function radix2Carry(from: u8, to: u8): u8 {
  return from + (to - gcd(from, to))
}

function radix2Convert(data: u32[], from: u8, to: u8, padding: bool): u8[] {
  if (from <= 0 || from > 32) throw new Error(`radix2Convert: wrong from=${from}`)
  if (to <= 0 || to > 32) throw new Error(`radix2Convert: wrong to=${to}`)
  const carryBits = radix2Carry(from, to)
  if (carryBits > 32) {
    throw new Error(`radix2Convert: carry overflow from=${from} to=${to} carryBits=${carryBits}`)
  }

  let carry: u32 = 0
  let pos: u8 = 0 // bitwise position in current element
  const mask: u32 = 2 ** to - 1
  const res: u8[] = [];

  for (let i = 0; i < data.length; i++) {
    const n: u32 = data[i]
    if (n >= u32(2 ** from)) throw new Error(`radix2Convert: invalid data word=${n} from=${from}`)
    carry = (carry << from) | n
    if (pos + from > 32) throw new Error(`radix2Convert: carry overflow pos=${pos} from=${from}`)
    pos += from
    for (; pos >= to; pos -= to) {
      res.push((((carry >> (pos - to)) & mask) >>> 0) as u8)
    }
    carry &= 2 ** pos - 1 // clean carry, otherwise it will cause overflow
  }

  carry = (carry << (to - pos)) & mask
  if (!padding && pos >= from) throw new Error('excess padding')
  if (!padding && carry) throw new Error(`non-zero padding: ${carry}`)
  if (padding && pos > 0) res.push((carry >>> 0) as u8)

  return res
}

function radix2Validate(bits: u8): void {
  if (bits <= 0 || bits > 32) {
    throw new Error('radix2: bits should be in (0..32]')
  } 
  if (radix2Carry(8, bits) > 32 || radix2Carry(bits, 8) > 32) {
    throw new Error('radix2: carry overflow')
  }
}

function gcd(a: u8, b: u8): u8 {
  return !b ? a : gcd(b, a % b)
}
