export class Imported extends Jig {
  exported1: string;
  exported2: u32;

  constructor (aString: string, aNumber: u32) {
    super()
    this.exported1 = aString
    this.exported2 = aNumber
  }
}


export declare class ImportedObj {
  prop1: i32
  prop2: f64
  prop3: string
}
