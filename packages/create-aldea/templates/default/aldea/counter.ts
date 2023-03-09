/**
 * The "Hello World!" of smart contracts.
 */
export class Counter extends Jig {
  count: i64 = 0;

  increase (): void {
    this.count++
  }

  decrease (): void {
    this.count--
  }
  
  reset (): void {
    this.count = 0
  }
}
