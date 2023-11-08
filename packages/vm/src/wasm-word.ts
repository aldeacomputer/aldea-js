export class WasmWord {
  value: number | bigint;

  constructor (value: number | bigint) {
    this.value = value
  }

  static fromNumber (number: number): WasmWord {
    return new this(number);
  }

  toNumber (): number {
    return Number(this.value)
  }

  toBigInt (): bigint {
    return BigInt(this.value)
  }

  static fromBigInt (bigint: bigint): WasmWord {
    return new this(bigint);
  }
}
