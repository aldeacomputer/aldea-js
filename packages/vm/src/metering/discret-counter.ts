import {ExecutionError} from "../errors.js";

export class DiscretCounter {
  private tag: string;
  private total: bigint
  private count: bigint
  private hydroSize: bigint
  hydros: bigint
  private maxHydros: bigint;

  constructor (tag: string, hydroSize: bigint, maxHydros: bigint) {
    this.tag = tag
    this.total = 0n
    this.count = 0n
    this.hydros = 0n
    this.hydroSize = hydroSize
    this.maxHydros = maxHydros
  }

  add (amount: bigint) {
    this.total += amount
    this.count += amount
    const newHydros = this.count / this.hydroSize
    this.hydros += newHydros
    this.count = this.count % this.hydroSize

    if (this.hydros > this.maxHydros) {
      throw new ExecutionError(`Max hydros for ${this.tag} (${this.maxHydros}) was over passed`)
    }
  }

  clear (): number {
    let res = Number(this.hydros)
    if (this.count > 0n) {
      res += 1
    }
    this.total = 0n
    this.count = 0n
    this.hydros = 0n
    return res
  }

  inc () {
    this.add(1n)
  }
}
