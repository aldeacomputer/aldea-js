

export class WasmWord {
  value: number | BigInt;

  constructor (value: number | BigInt) {
    this.value = value
  }

  static fromNumber (number: number): WasmWord {
    return new this(number);
  }

  toNumber (): number {
    return Number(this.value)
  }
}
