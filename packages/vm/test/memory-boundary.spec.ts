import {assert} from 'chai'
import {compile} from '@aldea/compiler'
import {WasmContainer} from '../src/wasm-container.js'
import {abiFromBin, BufReader, BufWriter} from "@aldea/core";
import {WasmWord} from "../src/wasm-word.js";
import {AbiType} from "../src/memory/abi-helpers/abi-type.js";

async function compileToWasm (src: string, id: Uint8Array = new Uint8Array([0, 0, 0, 0])): Promise<WasmContainer> {
  try {
    const {output} = await compile(src)
    const module = new WebAssembly.Module(output.wasm)
    return new WasmContainer(module, abiFromBin(output.abi), id)
  } catch (e: any) {
    if (e.stderr) {
      console.log(e.stderr.toString())
    }
    throw e
  }
}

describe('reading basic types from memory', () => {
  it('reads i8 as number', async () => {
    const wasm = await compileToWasm('export function test(): i8 { return -42 }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toInt(), -42)
  })

  it('reads i16 as number', async () => {
    const wasm = await compileToWasm('export function test(): i16 { return -42 }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toInt(), -42)
  })

  it('reads i32 as number', async () => {
    const wasm = await compileToWasm('export function test(): i32 { return -42 }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toInt(), -42)
  })

  it('reads i64 as bigint', async () => {
    const wasm = await compileToWasm('export function test(): i64 { return -42 }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toBigInt(), -42n)
  })

  it('reads u8 as number', async () => {
    const wasm = await compileToWasm('export function test(): u8 { return 42 }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toInt(), 42)
  })

  it('reads u16 as number', async () => {
    const wasm = await compileToWasm('export function test(): u16 { return 42 }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toInt(), 42)
  })

  it('reads u32 as number', async () => {
    const wasm = await compileToWasm('export function test(): u32 { return 42 }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toInt(), 42)
  })

  it('reads u64 as bigint', async () => {
    const wasm = await compileToWasm('export function test(): u64 { return 42 }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toBigInt(), 42n)
  })

  it('reads f32 as number', async () => {
    const wasm = await compileToWasm('export function test(): f32 { return 42.12345 }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toFloat().toFixed(5), '42.12345')
  })

  it('reads f64 as number', async () => {
    const wasm = await compileToWasm('export function test(): f64 { return 42.12345 }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toFloat(), 42.12345)
  })

  it('reads boolean', async () => {
    const wasm = await compileToWasm('export function test(): bool { return true }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(res.toBool(), true)
  })

  it('reads string', async () => {
    const wasm = await compileToWasm('export function test(): string { return "hello world!" }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(wasm.liftString(res), 'hello world!')
  })

  it('reads ArrayBuffer', async () => {
    const wasm = await compileToWasm('export function test(): ArrayBuffer { return new ArrayBuffer(5) }')
    const res = wasm.callFn('test', [], []).get()
    assert.equal(wasm.liftBuf(res).byteLength, 5)
  })
})

describe('writing basic types to memory', () => {
  const i8Ty = AbiType.fromName('i8')
  const i16Ty = AbiType.fromName('i16')
  const i32Ty = AbiType.fromName('i32')
  const i64Ty = AbiType.fromName('i64')

  const u8Ty = AbiType.fromName('u8')
  const u16Ty = AbiType.fromName('u16')
  const u32Ty = AbiType.fromName('u32')
  const u64Ty = AbiType.fromName('u64')

  const f32Ty = AbiType.fromName('f32')
  const f64Ty = AbiType.fromName('f64')

  const boolTy = AbiType.fromName('boolean')
  const stringTy = AbiType.fromName('string')
  const arrBuffTy = AbiType.fromName('ArrayBuffer')

  it('writes number as i8', async () => {
    const wasm = await compileToWasm('export function test(a: i8): bool { return a == -42 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumber(-42)], [i8Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumber(-40)], [i8Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes number as i16', async () => {
    const wasm = await compileToWasm('export function test(a: i16): bool { return a == -42 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumber(-42)], [i16Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumber(-40)], [i16Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes number as i32', async () => {
    const wasm = await compileToWasm('export function test(a: i32): bool { return a == -42 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumber(-42)], [i32Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumber(-40)], [i32Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes number as i64', async () => {
    const wasm = await compileToWasm('export function test(a: i64): bool { return a == -42 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumber(-42)], [i64Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumber(-40)], [i64Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes bigint as i64', async () => {
    const wasm = await compileToWasm('export function test(a: i64): bool { return a == -42 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumeric(-42n)], [i64Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumeric(-40n)], [i64Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes number as u8', async () => {
    const wasm = await compileToWasm('export function test(a: u8): bool { return a == 42 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumeric(42)], [u8Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumeric(40)], [u8Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes number as u16', async () => {
    const wasm = await compileToWasm('export function test(a: u16): bool { return a == 42 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumeric(42)], [u16Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumeric(40)], [u16Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes number as u32', async () => {
    const wasm = await compileToWasm('export function test(a: u32): bool { return a == 42 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumeric(42)], [u32Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumeric(40)], [u32Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes number as u64', async () => {
    const wasm = await compileToWasm('export function test(a: u64): bool { return a == 42 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumeric(42)], [u64Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumeric(40)], [u64Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes bigint as u64', async () => {
    const wasm = await compileToWasm('export function test(a: u64): bool { return a == 42 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumeric(42n)], [u64Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumeric(40n)], [u64Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes number as f32', async () => {
    const wasm = await compileToWasm('export function test(a: f32): bool { return a == 42.12345 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumber(42.12345)], [f32Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumber(40.12345)], [f32Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes number as f64', async () => {
    const wasm = await compileToWasm('export function test(a: f64): bool { return a == 42.12345 }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumber(42.12345)], [f64Ty]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumber(40.12345)], [f64Ty]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  it('writes boolean', async () => {
    const wasm = await compileToWasm('export function test(a: bool): bool { return a == true }')
    const res1 = wasm.callFn('test', [WasmWord.fromNumber(1)], [boolTy]).get()
    const res2 = wasm.callFn('test', [WasmWord.fromNumber(0)], [boolTy]).get()
    assert.isTrue(res1.toBool())
    assert.isFalse(res2.toBool())
  })

  function lowerString (wasm: WasmContainer, string: string): WasmWord {
    const buf = new BufWriter()
    buf.writeBytes(Buffer.from(string))
    return wasm.low.lower(buf.data, stringTy)
  }

  it('writes string', async () => {
    const wasm = await compileToWasm('export function test(a: string): bool { return a == "hello world!" }')
    const res1 = wasm.callFn('test', [lowerString(wasm, 'hello world!')], [stringTy]).get()
    assert.isTrue(res1.toBool())
  })

  function lowerBuffer (wasm: WasmContainer, buf: ArrayBuffer): WasmWord {
    const w = new BufWriter()
    w.writeBytes(new Uint8Array(buf))
    return wasm.low.lower(w.data, arrBuffTy)
  }

  it('writes ArrayBuffer', async () => {
    const wasm = await compileToWasm('export function test(a: ArrayBuffer): bool { return a.byteLength == 5 }')
    const res = wasm.callFn('test', [lowerBuffer(wasm, new ArrayBuffer(5))], [arrBuffTy]).get()
    assert.isTrue(res.toBool())
  })
})
//
describe('reading complex types from memory', () => {
  const int8ArrTy = AbiType.fromName('Int8Array')
  const int16ArrTy = AbiType.fromName('Int16Array')
  const int32ArrTy = AbiType.fromName('Int32Array')
  const int64ArrTy = AbiType.fromName('Int64Array')

  const uInt8ArrTy = AbiType.fromName('Uint8Array')
  const uInt16ArrTy = AbiType.fromName('Uint16Array')
  const uInt32ArrTy = AbiType.fromName('Uint32Array')
  const uInt64ArrTy = AbiType.fromName('Uint64Array')

  const float32ArrTy = AbiType.fromName('Float32Array')
  const float64ArrTy = AbiType.fromName('Float64Array')

  function lift (wasm: WasmContainer, ptr: WasmWord, type: AbiType): BufReader {
    const buf = wasm.lifter.lift(ptr, type)
    return new BufReader(buf)
  }

  describe('typed arrays', () => {
  function bufCode (t: string, vals: any[] = [11, 22, 33]): string {
    return `
      export function test(): ${t} {
        const buf = new ${t}(3)
        ${vals.map((v, i) => `buf.set([${v}], ${i})`).join('\n')}
        return buf
      }
      `.trim()
  }



  it('reads Int8Array', async () => {
    const wasm = await compileToWasm(bufCode('Int8Array'))
    const res = wasm.callFn('test', [], []).get()
    const read = lift(wasm, res, int8ArrTy)
    assert.deepEqual(read.readBytes(), new Uint8Array([11, 22, 33]))
  })

  it('reads Int16Array', async () => {
    const wasm = await compileToWasm(bufCode('Int16Array'))
    const res = wasm.callFn('test', [], []).get()
    const read = lift(wasm, res, int16ArrTy)
    assert.deepEqual(read.readBytes(), new Uint8Array([11, 0, 22, 0, 33, 0]))
  })

  it('reads Int32Array', async () => {
    const wasm = await compileToWasm(bufCode('Int32Array'))
    const res = wasm.callFn('test', [], []).get()
    const read = lift(wasm, res, int32ArrTy)
    assert.deepEqual(read.readBytes(), new Uint8Array([11, 0, 0, 0, 22, 0, 0, 0, 33, 0 , 0, 0]))
  })

    it('reads Int64Array', async () => {
      const wasm = await compileToWasm(bufCode('Int64Array'))
      const res = wasm.callFn('test', [], []).get()
      const read = lift(wasm, res, int64ArrTy)
      assert.deepEqual(read.readBytes(), new Uint8Array([
        11, 0, 0, 0, 0, 0, 0, 0,
        22, 0, 0, 0, 0, 0, 0, 0,
        33, 0, 0, 0, 0, 0, 0, 0,
      ]))
    })

    it('reads Uint8Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint8Array'))
      const res = wasm.callFn('test', [], []).get()
      const read = lift(wasm, res, uInt8ArrTy)
      assert.deepEqual(read.readBytes(), new Uint8Array([11, 22, 33]))
    })

    it('reads Uint16Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint16Array'))
      const res = wasm.callFn('test', [], []).get()
      const read = lift(wasm, res, uInt16ArrTy)
      assert.deepEqual(read.readBytes(), new Uint8Array([11, 0, 22, 0, 33, 0]))
    })

    it('reads Uint32Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint32Array'))
      const res = wasm.callFn('test', [], []).get()
      const read = lift(wasm, res, uInt32ArrTy)
      assert.deepEqual(read.readBytes(), new Uint8Array([11, 0, 0, 0, 22, 0, 0, 0, 33, 0 , 0, 0]))
    })

    it('reads Uint64Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint64Array'))
      const res = wasm.callFn('test', [], []).get()
      const read = lift(wasm, res, uInt64ArrTy)
      assert.deepEqual(read.readBytes(), new Uint8Array([
        11, 0, 0, 0, 0, 0, 0, 0,
        22, 0, 0, 0, 0, 0, 0, 0,
        33, 0, 0, 0, 0, 0, 0, 0,
      ]))
    })

    it('reads Float32Array', async () => {
      const wasm = await compileToWasm(bufCode('Float32Array', [11.1, 22.2, 33.3]))
      const res = wasm.callFn('test', [], []).get()
      const read = lift(wasm, res, float32ArrTy)
      assert.equal(read.readULEB(), 3 * 4)
      assert.equal(read.readF32().toFixed(5), '11.10000')
      assert.equal(read.readF32().toFixed(5), '22.20000')
      assert.equal(read.readF32().toFixed(5), '33.30000')
    })

    it('reads Float64Array', async () => {
      const wasm = await compileToWasm(bufCode('Float64Array', [11.1, 22.2, 33.3]))
      const res = wasm.callFn('test', [], []).get()
      const read = lift(wasm, res, float64ArrTy)
      assert.equal(read.readULEB(), 3 * 8)
      assert.equal(read.readF64().toFixed(5), '11.10000')
      assert.equal(read.readF64().toFixed(5), '22.20000')
      assert.equal(read.readF64().toFixed(5), '33.30000')
    })
  })

  describe('arrays and static arrays of different types', () => {
    function arrayCode(t: string, vals: any[] = [11, 22, 33]): string {
      return `
      export function test(): Array<${t}> {
        const a = new Array<${t}>()
        ${ vals.map(v => `a.push(${v})`).join('\n') }
        return a
      }
      `.trim()
    }

    function arrTy(innerName: string): AbiType {
      return new AbiType({
        name: 'Array',
        nullable: false,
        args: [{ name: innerName, args: [], nullable: false }]
      })
    }

    const arrU8Ty = arrTy('u8')
    const arrU16Ty = arrTy('u16')
    const arrU32Ty = arrTy('u32')
    const arrU64Ty = arrTy('u64')
    const arrStrTy = arrTy('string')
    const staticArrStrTy = new AbiType({
      name: 'StaticArray',
      nullable: false,
      args: [{ name: 'string', args: [], nullable: false }]
    })

    // const arrI8Ty = arrTy('i8')
    // const arrI16Ty = arrTy('i16')
    // const arrI32Ty = arrTy('i32')
    // const arrI64Ty = arrTy('i64')


    it('reads array with u8 values', async () => {
      const wasm = await compileToWasm(arrayCode('u8'))
      const res = wasm.callFn('test', [], []).get()
      const lifted = lift(wasm, res, arrU8Ty)
      assert.equal(lifted.readULEB(), 3)
      assert.equal(lifted.readU8(), 11)
      assert.equal(lifted.readU8(), 22)
      assert.equal(lifted.readU8(), 33)
    })

    it('reads array with u16 values', async () => {
      const wasm = await compileToWasm(arrayCode('u16'))
      const res = wasm.callFn('test', [], []).get()
      const lifted = lift(wasm, res, arrU16Ty)
      assert.equal(lifted.readULEB(), 3)
      assert.equal(lifted.readU16(), 11)
      assert.equal(lifted.readU16(), 22)
      assert.equal(lifted.readU16(), 33)
    })

    it('reads array with u32 values', async () => {
      const wasm = await compileToWasm(arrayCode('u32'))
      const res = wasm.callFn('test', [], []).get()
      const lifted = lift(wasm, res, arrU32Ty)
      assert.equal(lifted.readULEB(), 3)
      assert.equal(lifted.readU32(), 11)
      assert.equal(lifted.readU32(), 22)
      assert.equal(lifted.readU32(), 33)
    })

    it('reads array with u64 values', async () => {
      const wasm = await compileToWasm(arrayCode('u64'))
      const res = wasm.callFn('test', [], []).get()
      const lifted = lift(wasm, res, arrU64Ty)
      assert.equal(lifted.readULEB(), 3)
      assert.equal(lifted.readU64(), 11n)
      assert.equal(lifted.readU64(), 22n)
      assert.equal(lifted.readU64(), 33n)
    })

    it('reads array with string values', async () => {
      const wasm = await compileToWasm(arrayCode('string', ['"aaa"', '"bbb"', '"ccc"']))
      const res = wasm.callFn('test', [], []).get()
      const lifted = lift(wasm, res, arrStrTy)
      assert.equal(lifted.readULEB(), 3)
      assert.equal(Buffer.from(lifted.readBytes()).toString(), 'aaa')
      assert.equal(Buffer.from(lifted.readBytes()).toString(), 'bbb')
      assert.equal(Buffer.from(lifted.readBytes()).toString(), 'ccc')
    })

    it('reads static array with string values', async () => {
      const wasm = await compileToWasm('export function test(): StaticArray<string> { return StaticArray.fromArray<string>(["aaa", "bbb", "ccc"]) }')
      const res = wasm.callFn('test', [], []).get()
      const lifted = lift(wasm, res, staticArrStrTy)
      assert.equal(lifted.readULEB(), 3)
      assert.equal(Buffer.from(lifted.readBytes()).toString(), 'aaa')
      assert.equal(Buffer.from(lifted.readBytes()).toString(), 'bbb')
      assert.equal(Buffer.from(lifted.readBytes()).toString(), 'ccc')
    })
  })
//
//   describe('maps with combos of types', () => {
//     // It's important we test these combos as alignment in the memory is
//     // different for each combo of byte size
//
//     function mapCode(kt: string, vt: string): string {
//       return `
//       export function test(): Map<${kt}, ${vt}> {
//         const map = new Map<${kt}, ${vt}>()
//         map.set(1, 11)
//         map.set(2, 22)
//         map.set(3, 33)
//         return map
//       }
//       `.trim()
//     }
//
//     it('reads map with u8 keys and u8 values', async () => {
//       const wasm = await compileToWasm(mapCode('u8', 'u8'))
//       const res = wasm.callFn('test', [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
//     })
//
//     it('reads map with u8 keys and u16 values', async () => {
//       const wasm = await compileToWasm(mapCode('u8', 'u16'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
//     })
//
//     it('reads map with u8 keys and u32 values', async () => {
//       const wasm = await compileToWasm(mapCode('u8', 'u32'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
//     })
//
//     it('reads map with u8 keys and u64 values', async () => {
//       const wasm = await compileToWasm(mapCode('u8', 'u64'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11n], [2, 22n], [3, 33n]]))
//     })
//
//     it('reads map with u16 keys and u8 values', async () => {
//       const wasm = await compileToWasm(mapCode('u16', 'u8'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
//     })
//
//     it('reads map with u16 keys and u16 values', async () => {
//       const wasm = await compileToWasm(mapCode('u16', 'u16'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
//     })
//
//     it('reads map with u16 keys and u32 values', async () => {
//       const wasm = await compileToWasm(mapCode('u16', 'u32'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
//     })
//
//     it('reads map with u16 keys and u64 values', async () => {
//       const wasm = await compileToWasm(mapCode('u16', 'u64'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11n], [2, 22n], [3, 33n]]))
//     })
//
//     it('reads map with u32 keys and u8 values', async () => {
//       const wasm = await compileToWasm(mapCode('u32', 'u8'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
//     })
//
//     it('reads map with u32 keys and u16 values', async () => {
//       const wasm = await compileToWasm(mapCode('u32', 'u16'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
//     })
//
//     it('reads map with u32 keys and u32 values', async () => {
//       const wasm = await compileToWasm(mapCode('u32', 'u32'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
//     })
//
//     it('reads map with u32 keys and u64 values', async () => {
//       const wasm = await compileToWasm(mapCode('u32', 'u64'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1, 11n], [2, 22n], [3, 33n]]))
//     })
//
//     it('reads map with u64 keys and u8 values', async () => {
//       const wasm = await compileToWasm(mapCode('u64', 'u8'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1n, 11], [2n, 22], [3n, 33]]))
//     })
//
//     it('reads map with u64 keys and u16 values', async () => {
//       const wasm = await compileToWasm(mapCode('u64', 'u16'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1n, 11], [2n, 22], [3n, 33]]))
//     })
//
//     it('reads map with u64 keys and u32 values', async () => {
//       const wasm = await compileToWasm(mapCode('u64', 'u32'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1n, 11], [2n, 22], [3n, 33]]))
//     })
//
//     it('reads map with u64 keys and u64 values', async () => {
//       const wasm = await compileToWasm(mapCode('u64', 'u64'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Map)
//       assert.deepEqual(res.value, new Map([[1n, 11n], [2n, 22n], [3n, 33n]]))
//     })
//   })
//
//   describe('sets with different types', () => {
//     function setCode(t: string): string {
//       return `
//       export function test(): Set<${t}> {
//         const set = new Set<${t}>()
//         set.add(11)
//         set.add(22)
//         set.add(33)
//         return set
//       }
//       `.trim()
//     }
//
//     it('reads set with u8 entries', async () => {
//       const wasm = await compileToWasm(setCode('u8'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Set)
//       assert.deepEqual(res.value, new Set([11, 22, 33]))
//     })
//
//     it('reads set with u16 entries', async () => {
//       const wasm = await compileToWasm(setCode('u16'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Set)
//       assert.deepEqual(res.value, new Set([11, 22, 33]))
//     })
//
//     it('reads set with u32 entries', async () => {
//       const wasm = await compileToWasm(setCode('u32'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Set)
//       assert.deepEqual(res.value, new Set([11, 22, 33]))
//     })
//
//     it('reads set with u64 entries', async () => {
//       const wasm = await compileToWasm(setCode('u64'))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, Set)
//       assert.deepEqual(res.value, new Set([11n, 22n, 33n]))
//     })
//   })
//
//   describe('objects', () => {
//     it('reads plain objects', async() => {
//       const code = `
//       declare class Test {
//         name: string;
//         age: u8;
//       }
//
//       export function test(): Test {
//         return { name: 'Fred', age: 42 }
//       }
//       `.trim()
//
//       const wasm = await compileToWasm(code)
//       const res = wasm.callFn('test, [], []).get()
//       assert.typeOf(res.value, 'object')
//       assert.equal(res.value.name, 'Fred')
//       assert.equal(res.value.age, 42)
//     })
//
//     it('reads exported objects (jigs)', async() => {
//       const code = `
//       export class Test extends Jig {
//         name: string = 'Fred';
//         age: u8 = 42;
//       }
//
//       export function test(): Test {
//         return new Test()
//       }
//       `.trim()
//
//       const wasm = await compileToWasm(code)
//       const storage = new Storage();
//       const clock = new MomentClock();
//       const vm = new VM(storage, storage, clock, compile);
//       wasm.setExecution(new TxExecution(new StorageTxContext(new Tx(), storage, vm, clock)))
//       const res = wasm.callFn('test, [], []).get()
//       assert.instanceOf(res.value, JigRef)
//       assert.typeOf(res.value.ref.ptr, 'number')
//     })
//   })
// })
//
// describe('writing complex types to memory', () => {
//   describe('typed arrays', () => {
//     it('writes Int8Array', async () => {
//       const wasm = await compileToWasm('export function test(a: Int8Array): bool { return a.length == 3 && a.byteLength == 3 }')
//       const res = wasm.callFn('test, [new Int8Array([11, 22, 33])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes Int16Array', async () => {
//       const wasm = await compileToWasm('export function test(a: Int16Array): bool { return a.length == 3 && a.byteLength == 6 }')
//       const res = wasm.callFn('test, [new Int16Array([11, 22, 33])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes Int32Array', async () => {
//       const wasm = await compileToWasm('export function test(a: Int32Array): bool { return a.length == 3 && a.byteLength == 12 }')
//       const res = wasm.callFn('test, [new Int32Array([11, 22, 33])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes Int64Array', async () => {
//       const wasm = await compileToWasm('export function test(a: Int64Array): bool { return a.length == 3 && a.byteLength == 24 }')
//       const res = wasm.callFn('test, [new BigInt64Array([11n, 22n, 33n])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes Uint8Array', async () => {
//       const wasm = await compileToWasm('export function test(a: Uint8Array): bool { return a.length == 3 && a.byteLength == 3 }')
//       const res = wasm.callFn('test, [new Uint8Array([11, 22, 33])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes Uint16Array', async () => {
//       const wasm = await compileToWasm('export function test(a: Uint16Array): bool { return a.length == 3 && a.byteLength == 6 }')
//       const res = wasm.callFn('test, [new Uint16Array([11, 22, 33])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes Uint32Array', async () => {
//       const wasm = await compileToWasm('export function test(a: Uint32Array): bool { return a.length == 3 && a.byteLength == 12 }')
//       const res = wasm.callFn('test, [new Uint32Array([11, 22, 33])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes Uint64Array', async () => {
//       const wasm = await compileToWasm('export function test(a: Uint64Array): bool { return a.length == 3 && a.byteLength == 24 }')
//       const res = wasm.callFn('test, [new BigUint64Array([11n, 22n, 33n])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes Float32Array', async () => {
//       const wasm = await compileToWasm('export function test(a: Float32Array): bool { return a.length == 3 && a.byteLength == 12 }')
//       const res = wasm.callFn('test, [new Float32Array([11.1, 22.2, 33.3])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes Float64Array', async () => {
//       const wasm = await compileToWasm('export function test(a: Float64Array): bool { return a.length == 3 && a.byteLength == 24 }')
//       const res = wasm.callFn('test, [new Float64Array([11.1, 22.2, 33.3])], []).get()
//       assert.isTrue(res.value)
//     })
//   })
//
//   describe('arrays and static arrays', () => {
//     it('writes array with u8 values', async () => {
//       const wasm = await compileToWasm('export function test(a: u8[]): bool { return a.length == 3 }')
//       const res = wasm.callFn('test, [[11, 22, 33]], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes array with u16 values', async () => {
//       const wasm = await compileToWasm('export function test(a: u16[]): bool { return a.length == 3 }')
//       const res = wasm.callFn('test, [[11, 22, 33]], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes array with u32 values', async () => {
//       const wasm = await compileToWasm('export function test(a: u32[]): bool { return a.length == 3 }')
//       const res = wasm.callFn('test, [[11, 22, 33]], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes array with u64 values', async () => {
//       const wasm = await compileToWasm('export function test(a: u64[]): bool { return a.length == 3 }')
//       const res = wasm.callFn('test, [[11, 22, 33]], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes array with string values', async () => {
//       const wasm = await compileToWasm('export function test(a: string[]): bool { return a.length == 3 }')
//       const res = wasm.callFn('test, [['aaa', 'bbb', 'ccc']], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes static array with string values', async () => {
//       const wasm = await compileToWasm('export function test(a: StaticArray<string>): bool { return a.length == 3 }')
//       const res = wasm.callFn('test, [['aaa', 'bbb', 'ccc']], []).get()
//       assert.isTrue(res.value)
//     })
//   })
//
//   describe('maps with combos of types', () => {
//     it('writes map with u8 keys and u8 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u8, u8>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u8 keys and u16 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u8, u16>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u8 keys and u32 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u8, u32>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u8 keys and u64 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u8, u64>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u16 keys and u8 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u16, u8>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u16 keys and u16 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u16, u16>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u16 keys and u32 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u16, u32>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u16 keys and u64 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u16, u64>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u32 keys and u8 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u32, u8>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u32 keys and u16 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u32, u16>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u32 keys and u32 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u32, u32>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u32 keys and u64 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u32, u64>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u64 keys and u8 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u64, u8>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u64 keys and u16 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u64, u16>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u64 keys and u32 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u64, u32>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes map with u64 keys and u64 values', async () => {
//       const wasm = await compileToWasm('export function test(a: Map<u64, u64>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
//       const res = wasm.callFn('test, [new Map([[1, 11], [2, 22], [3, 33]])], []).get()
//       assert.isTrue(res.value)
//     })
//   })
//
//   describe('sets with different types', () => {
//     it('writes set with u8 entries', async () => {
//       const wasm = await compileToWasm('export function test(a: Set<u8>): bool { return a.has(11) && a.has(22) && a.has(33) }')
//       const res = wasm.callFn('test, [new Set([11, 22, 33])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes set with u16 entries', async () => {
//       const wasm = await compileToWasm('export function test(a: Set<u16>): bool { return a.has(11) && a.has(22) && a.has(33) }')
//       const res = wasm.callFn('test, [new Set([11, 22, 33])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes set with u32 entries', async () => {
//       const wasm = await compileToWasm('export function test(a: Set<u32>): bool { return a.has(11) && a.has(22) && a.has(33) }')
//       const res = wasm.callFn('test, [new Set([11, 22, 33])], []).get()
//       assert.isTrue(res.value)
//     })
//
//     it('writes set with u64 entries', async () => {
//       const wasm = await compileToWasm('export function test(a: Set<u64>): bool { return a.has(11) && a.has(22) && a.has(33) }')
//       const res = wasm.callFn('test, [new Set([11, 22, 33])], []).get()
//       assert.isTrue(res.value)
//     })
//   })
//
//   describe('objects', () => {
//     it('writes plain objects', async() => {
//       const code = `
//       declare class Test {
//         name: string;
//         age: u8;
//       }
//
//       export function test(a: Test): bool {
//         return a.name == 'Fred' && a.age == 42
//       }
//       `.trim()
//
//       const wasm = await compileToWasm(code)
//       const res = wasm.callFn('test, [{ name: 'Fred', age: 42 }], []).get()
//       assert.isTrue(res.value)
//     })
//   })
})
