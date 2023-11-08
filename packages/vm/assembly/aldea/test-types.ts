export class TestTypes extends Jig{
  arrU8: Array<u8>;
  arrU16: Array<u16>;
  staticArrU16: StaticArray<u16>;

  constructor () {
    super()
    this.arrU8 = [0]
    this.arrU16 = [1]
    this.staticArrU16 = new StaticArray<u16>(1)
    this.staticArrU16[0] = 2
  }
}
