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
    let byte = arr[len];
    let data = byte & 0b01111111; // keep everything but most significant bit
    data = data * (2 ** shift) // Avoid shifting. Causes issues in big numbers
    total = total + data
    len++;
    shift += 7;

    if ((byte & 0x80) === 0) { // check if the most significat bit is 0. If its 0 the number finished.
      break;
    }

  }

  return {
    value: total,
    length: len,
  };
}
