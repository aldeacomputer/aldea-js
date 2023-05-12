/**
 * Original code (public domain) is taken from: https://www.npmjs.com/package/uleb128
 */

/**
 * Encodes the given number into a ULEB encoded byte array.
 */
export function ulebEncode(num: number): number[] {
  let arr = []
  let len = 0

  if (num === 0) {
    return [0]
  }

  while (num > 0) {
    arr[len] = num & 0x7f
    if ((num >>= 7)) arr[len] |= 0x80
    len += 1
  }

  return arr;
}

/**
 * Decode the given ULEB encoded byte array into a number.
 */
export function ulebDecode(arr: number[] | Uint8Array): {
  value: number;
  length: number;
} {
  let total = 0
  let shift = 0
  let len = 0

  while (true) {
    let byte = arr[len]
    len++
    total |= (byte & 0x7f) << shift
    if ((byte & 0x80) === 0) break
    shift += 7
  }

  return {
    value: total,
    length: len,
  };
}
