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
  const d = new Uint32Array(5);
  let i = 0;
  while (val != 0n) {
    d[i++] = Number(val & digitMask);
    val >>= bigIntP;
  }
  let n = i;

  while (n > 0 && d[n - 1] == 0) {
    n--;
  }

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
