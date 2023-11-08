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
    return new this(bigint)
  }

  toBool (): boolean {
    return this.toNumber() !== 0
  }

  plus(n: number): WasmWord {
    return new WasmWord(this.toNumber() + n)
  }

  minus(n: number): WasmWord {
    return new WasmWord(this.toNumber() - n)
  }

  align (toSize: number): WasmWord {
    const self = this.toNumber()
    const rem = self % toSize
    if (rem === 0) {
      return this
    } else {
      return new WasmWord(self + toSize - rem)
    }
  }
}
