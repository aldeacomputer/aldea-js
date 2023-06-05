export class BufTest extends Jig {
  a: ArrayBuffer = new ArrayBuffer(16)
  d1: string = '----------'
  u8: Uint8Array = new Uint8Array(16)
  d2: string = '----------'
  u16: Uint16Array = new Uint16Array(16)
  d3: string = '----------'
  u32: Uint32Array = new Uint32Array(16)
  d4: string = '----------'
  u64: Uint64Array = new Uint64Array(16)

  constructor() {
    super()
    Uint8Array.wrap(this.a).fill(255)
    this.u8.fill(255)
    this.u16.fill(255)
    this.u32.fill(255)
    this.u64.fill(255)
  }
}

export class DifferentPointerSizeTest extends Jig {
  u8arr: Uint8Array = new Uint8Array(16)
  u8n: u8 = 1
  u16arr: Uint16Array = new Uint16Array(16)
  u16n: u16 = 2
  u32arr: Uint32Array = new Uint32Array(16)
  u32n: u32 = 3
  u64arr: Uint64Array = new Uint64Array(16)
  u64n: u32 = 4

  constructor() {
    super()
    this.u8arr.fill(255)
    this.u16arr.fill(255)
    this.u32arr.fill(255)
    this.u64arr.fill(255)
  }
}

export class BuffCollectionTest extends Jig {
  array: Array<Uint16Array>
  set: Set<Uint16Array>
  map: Map<Uint16Array, Uint16Array>
  staticArray: StaticArray<Uint16Array>

  constructor() {
    super()
    const arr1 = new Uint16Array(4);
    const arr2 = new Uint16Array(4);
    arr1.fill(1);
    arr2.fill(2);
    this.array = [
      arr1,
      arr2
    ]
    this.set = new Set()
    this.map = new Map()
    this.staticArray = new StaticArray(2)

    const set1 = new Uint16Array(4);
    const set2 = new Uint16Array(4);
    set1.fill(3)
    set2.fill(4)

    this.set.add(set1)
    this.set.add(set2)

    const key1 = new Uint16Array(4)
    const key2 = new Uint16Array(4)
    const value1 = new Uint16Array(4)
    const value2 = new Uint16Array(4)
    key1.fill(5)
    key2.fill(6)
    value1.fill(7)
    value2.fill(8)

    this.map.set(key1, value1)
    this.map.set(key2, value2)


    const static1 = new Uint16Array(4)
    const static2 = new Uint16Array(4)
    static1.fill(9)
    static2.fill(10)
    this.staticArray[0] = static1
    this.staticArray[1] = static2
  }
}
