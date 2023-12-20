import {ExecutionError} from "../errors.js";

/**
 * Hydros are discrete units of work that are measuered and used to charge for transaction.
 * A Hydro is always an integer amount. They cannot be fractioned, but they are charged every certain number of events
 *
 * For example, if the cost of 1000 bytes moved between containers is one hydro then:
 * - 100 bytes moved -> 1 Hydro
 * - 3000 bytes moved -> 3 Hydros
 * - 4500 bytes moved -> 5 Hydros
 * - 0 bytes moved -> 0 Hydros
 *
 * This class helps to keep track of the hydros consumed by a certain operation.
 */
export class HydroCounter {
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
