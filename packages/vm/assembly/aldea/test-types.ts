export class TestTypes extends Jig{
  arrU8: Array<u8>;
  arrU16: Array<u16>;
  staticArrU16: StaticArray<u16>;
  uint8Array: Uint8Array;
  uint16Array: Uint16Array;
  uint32Array: Uint32Array;
  uint64Array: Uint64Array;
  int8Array: Int8Array;
  int16Array: Int16Array;
  int32Array: Int32Array;
  int64Array: Int64Array;
  f32Array: Float32Array;
  f64Array: Float64Array;
  attr: SomeExportedClass;
  importedClass: ImportedClass;
  importedObj: ImportedObj;

  constructor () {
    super()
    this.arrU8 = [0]
    this.arrU16 = [1]
    this.staticArrU16 = new StaticArray<u16>(1)
    this.uint8Array = new Uint8Array(1);
    this.uint16Array = new Uint16Array(1);
    this.uint32Array = new Uint32Array(1);
    this.uint64Array = new Uint64Array(1);
    this.int8Array = new Int8Array(1);
    this.int16Array = new Int16Array(1);
    this.int32Array = new Int32Array(1);
    this.int64Array = new Int64Array(1);
    this.f32Array = new Float32Array(1);
    this.f64Array = new Float64Array(1);
    this.attr = {
      name: 'outer',
      obj: {
        age: 15,
        intraName: 'intra'
      },
      value: 10
    }
    this.importedClass = new ImportedClass("imported", 1)
    this.importedObj = {
      prop1: 1,
      prop2: 1.2,
      prop3: "prop3"
    }
  }
}

export class SmallJig extends Jig {
  aNumber: u32
  aList: ImportedObj[]

  constructor (aNumber: u32, aList: ImportedObj[]) {
    super();
    this.aNumber = aNumber
    this.aList = aList
  }
}

export class JigWithJig extends Jig {
  contained: SmallJig

  constructor (contained: SmallJig) {
    super();
    this.contained = contained
  }
}


export declare class SomeExportedClass {
  name: string;
  obj: SomeExportedIntraClass;
  value: u32;
}

export declare class SomeExportedIntraClass {
  intraName: string;
  age: i32;
}


// @ts-ignore
@imported("cb7c6fcf7907bf207e3030a2b53fa267cfab6b412ec203b9697490b1a3a16bf9")
declare class ImportedClass {
  exported1: string;
  exported2: u32;

  constructor (aString: string, aNumber: u32);
}

// @ts-ignore
@imported("cb7c6fcf7907bf207e3030a2b53fa267cfab6b412ec203b9697490b1a3a16bf9")
declare class ImportedObj {
  prop1: i32
  prop2: f64
  prop3: string
}
