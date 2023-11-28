export function bigIntEncode (data: Uint8Array): bigint {
  let encoded = 0n;

  for (let i = 0, l = data.length; i < l; i++) {
    encoded |= BigInt(data[i]) << ((BigInt(l) - BigInt(i) - 1n) * 8n);
  }

  return encoded;
}

export function bigIntDecode (data: bigint): Uint8Array {
  if (data < 0n) throw new Error('Negative BigInts are not supported'); //TODO: Support them too
  const decoded: number[] = [];

  while (data) {
    decoded.push(Number(data & 0xFFn));
    data >>= 8n;
  }

  return new Uint8Array(decoded.reverse());
}

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

function countBits(d: Uint32Array, n: number) {
  if (n == 0) return 0;
  // initialize to bits in fully used digits
  let bits = (n - 1) * Number(bigIntP);
  // count bits used in most significant digit
  let q = d[n - 1];
  while (q > 0) {
    ++bits;
    q >>= 1;
  }
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
