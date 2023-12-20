/**
 * These are a series of helpers to deal with Aldea's Wasm bigints.
 */

const bigIntP = 28n
const digitMask = (1n << bigIntP) - 1n

export interface WasmBigIntData {
  d: Uint32Array
  n: number
  isNeg: boolean
}

function abs(b: bigint): bigint {
  return b >= 0n ? b : -b
}

export function bigIntToDigits(originalVal: bigint): WasmBigIntData {
  let val = abs(originalVal)
  const dNumbers: number[] = [];
  let i = 0;
  while (val != 0n) {
    dNumbers[i++] = Number(val & digitMask);
    val >>= bigIntP;
  }
  let n = i;

  while (n > 0 && dNumbers[n - 1] == 0) {
    n--;
  }

  const d = new Uint32Array(dNumbers)

  return {
    d,
    n,
    isNeg: originalVal < 0
  };
}

export function digitsToBigInt(d: Uint32Array, n: number, isNeg: boolean): bigint {
  let shift = 0n
  let res = 0n
  for (let i = 0; i < n; i++) {
    const num = d[i]
    res += BigInt(num) << shift
    shift += 28n
  }
  res = isNeg ? res * -1n : res
  return res
}
