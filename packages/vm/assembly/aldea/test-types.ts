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
    // this.staticArrU16[0] = 2
    // this.uint8Array[0] = 3
    // this.uint16Array
    // this.int8Array[0] = -4
  }
}
