/**
 * Original code (public domain) is taken from: https://www.npmjs.com/package/uleb128
 */

/**
 * Encodes the given number into a ULEB encoded byte array.
 */
export function ulebEncode(num: number): number[] {
  let arr = []

  if (num === 0) {
    return [0]
  }

  while (num > 0) {
    let temp = num & 0x7f
    num = num >>> 7
    if (num) {
      temp = temp | 0x80
    }
    arr.push(temp)
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
    console.log('shiftshiftshiftshiftshiftshiftshift', shift)
    console.log('total', total)
    let byte = arr[len]

    byte = byte & 0x7f
    total |= byte << shift

    if ((byte & 0x80) === 0) break

    len++
    shift += 7
  }
  console.log('total', total)

  return {
    value: total,
    length: len,
  };
}
