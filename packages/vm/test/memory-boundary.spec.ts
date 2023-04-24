import { assert } from 'chai'
import { compile } from '@aldea/compiler'
import { abiFromCbor } from '@aldea/compiler/abi'
import { WasmInstance } from '../src/wasm-instance.js'
import {TxExecution} from "../src/tx-execution.js";
import {VM, Storage, MomentClock} from "../src/index.js";
import {Tx} from "@aldea/sdk-js";
import {JigRef} from "../src/jig-ref.js";
import {StorageTxContext} from "../src/tx-context/storage-tx-context.js";
import {Compiler} from "../src/compiler.js";

async function compileToWasm(src: string, id: Uint8Array = new Uint8Array([0, 0, 0, 0])): Promise<WasmInstance> {
  try {
    const { output } = await compile(src)
    const module = new WebAssembly.Module(output.wasm)
    return new WasmInstance(module, abiFromCbor(output.abi.buffer), id)
  } catch (e: any) {
    if (e.stderr) { console.log(e.stderr.toString()) }
    throw e
  }
}

describe('reading basic types from memory', () => {
  it('reads i8 as number', async () => {
    const wasm = await compileToWasm('export function test(): i8 { return -42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, -42)
  })

  it('reads i16 as number', async () => {
    const wasm = await compileToWasm('export function test(): i16 { return -42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, -42)
  })

  it('reads i32 as number', async () => {
    const wasm = await compileToWasm('export function test(): i32 { return -42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, -42)
  })

  it('reads i64 as bigint', async () => {
    const wasm = await compileToWasm('export function test(): i64 { return -42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'bigint')
    assert.equal(res.value, -42n)
  })

  it('reads u8 as number', async () => {
    const wasm = await compileToWasm('export function test(): u8 { return 42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, 42)
  })

  it('reads u16 as number', async () => {
    const wasm = await compileToWasm('export function test(): u16 { return 42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, 42)
  })

  it('reads u32 as number', async () => {
    const wasm = await compileToWasm('export function test(): u32 { return 42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, 42)
  })

  it('reads u64 as bigint', async () => {
    const wasm = await compileToWasm('export function test(): u64 { return 42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'bigint')
    assert.equal(res.value, 42n)
  })

  it('reads f32 as number', async () => {
    const wasm = await compileToWasm('export function test(): f32 { return 42.12345 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value.toFixed(5), 42.12345)
  })

  it('reads f64 as number', async () => {
    const wasm = await compileToWasm('export function test(): f64 { return 42.12345 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, 42.12345)
  })

  it('reads boolean', async () => {
    const wasm = await compileToWasm('export function test(): bool { return true }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'boolean')
    assert.equal(res.value, true)
  })

  it('reads string', async () => {
    const wasm = await compileToWasm('export function test(): string { return "hello world!" }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'string')
    assert.equal(res.value, 'hello world!')
  })

  it('reads ArrayBuffer', async () => {
    const wasm = await compileToWasm('export function test(): ArrayBuffer { return new ArrayBuffer(5) }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
    assert.typeOf(res.value, 'Uint8Array')
    assert.equal(res.value.byteLength, 5)
  })
})

describe('writing basic types to memory', () => {
  it('writes number as i8', async () => {
    const wasm = await compileToWasm('export function test(a: i8): bool { return a == -42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [-42])
    assert.isTrue(res.value)
  })

  it('writes number as i16', async () => {
    const wasm = await compileToWasm('export function test(a: i16): bool { return a == -42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [-42])
    assert.isTrue(res.value)
  })

  it('writes number as i32', async () => {
    const wasm = await compileToWasm('export function test(a: i32): bool { return a == -42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [-42])
    assert.isTrue(res.value)
  })

  it('writes number as i64', async () => {
    const wasm = await compileToWasm('export function test(a: i64): bool { return a == -42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [-42])
    assert.isTrue(res.value)
  })

  it('writes bigint as i64', async () => {
    const wasm = await compileToWasm('export function test(a: i64): bool { return a == -42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [-42n])
    assert.isTrue(res.value)
  })

  it('writes number as u8', async () => {
    const wasm = await compileToWasm('export function test(a: u8): bool { return a == 42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [42])
    assert.isTrue(res.value)
  })

  it('writes number as u16', async () => {
    const wasm = await compileToWasm('export function test(a: u16): bool { return a == 42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [42])
    assert.isTrue(res.value)
  })

  it('writes number as u32', async () => {
    const wasm = await compileToWasm('export function test(a: u32): bool { return a == 42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [42])
    assert.isTrue(res.value)
  })

  it('writes number as u64', async () => {
    const wasm = await compileToWasm('export function test(a: u64): bool { return a == 42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [42])
    assert.isTrue(res.value)
  })

  it('writes bigint as u64', async () => {
    const wasm = await compileToWasm('export function test(a: u64): bool { return a == 42 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [42n])
    assert.isTrue(res.value)
  })

  it('writes number as f32', async () => {
    const wasm = await compileToWasm('export function test(a: f32): bool { return a == 42.12345 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [42.12345])
    assert.isTrue(res.value)
  })

  it('writes number as f64', async () => {
    const wasm = await compileToWasm('export function test(a: f64): bool { return a == 42.12345 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [42.12345])
    assert.isTrue(res.value)
  })

  it('writes boolean', async () => {
    const wasm = await compileToWasm('export function test(a: bool): bool { return a == true }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [true])
    assert.isTrue(res.value)
  })

  it('writes string', async () => {
    const wasm = await compileToWasm('export function test(a: string): bool { return a == "hello world!" }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), ['hello world!'])
    assert.isTrue(res.value)
  })

  it('writes ArrayBuffer', async () => {
    const wasm = await compileToWasm('export function test(a: ArrayBuffer): bool { return a.byteLength == 5 }')
    const res = wasm.functionCall(wasm.abi.functionByName('test'), [new ArrayBuffer(5)])
    assert.isTrue(res.value)
  })
})

describe('reading complex types from memory', () => {
  describe('typed arrays', () => {
    function bufCode(t: string, vals: any[] = [11, 22, 33]): string {
      return `
      export function test(): ${t} {
        const buf = new ${t}(3)
        ${ vals.map((v, i) => `buf.set([${v}], ${i})` ).join('\n') }
        return buf
      }
      `.trim()
    }

    it('reads Int8Array', async () => {
      const wasm = await compileToWasm(bufCode('Int8Array'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Int8Array)
      assert.equal(res.value.byteLength, 3)
      assert.deepEqual(res.value, new Int8Array([11, 22, 33]))
    })

    it('reads Int16Array', async () => {
      const wasm = await compileToWasm(bufCode('Int16Array'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Int16Array)
      assert.equal(res.value.byteLength, 6)
      assert.deepEqual(res.value, new Int16Array([11, 22, 33]))
    })

    it('reads Int32Array', async () => {
      const wasm = await compileToWasm(bufCode('Int32Array'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Int32Array)
      assert.equal(res.value.byteLength, 12)
      assert.deepEqual(res.value, new Int32Array([11, 22, 33]))
    })

    it('reads Int64Array', async () => {
      const wasm = await compileToWasm(bufCode('Int64Array'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, BigInt64Array)
      assert.equal(res.value.byteLength, 24)
      assert.deepEqual(res.value, new BigInt64Array([11n, 22n, 33n]))
    })

    it('reads Uint8Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint8Array'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Uint8Array)
      assert.equal(res.value.byteLength, 3)
      assert.deepEqual(res.value, new Uint8Array([11, 22, 33]))
    })

    it('reads Uint16Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint16Array'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Uint16Array)
      assert.equal(res.value.byteLength, 6)
      assert.deepEqual(res.value, new Uint16Array([11, 22, 33]))
    })

    it('reads Uint32Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint32Array'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Uint32Array)
      assert.equal(res.value.byteLength, 12)
      assert.deepEqual(res.value, new Uint32Array([11, 22, 33]))
    })

    it('reads Uint64Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint64Array'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, BigUint64Array)
      assert.equal(res.value.byteLength, 24)
      assert.deepEqual(res.value, new BigUint64Array([11n, 22n, 33n]))
    })

    it('reads Float32Array', async () => {
      const wasm = await compileToWasm(bufCode('Float32Array', [11.1, 22.2, 33.3]))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Float32Array)
      assert.equal(res.value.byteLength, 12)
      assert.deepEqual(res.value, new Float32Array([11.1, 22.2, 33.3]))
    })

    it('reads Float64Array', async () => {
      const wasm = await compileToWasm(bufCode('Float64Array', [11.1, 22.2, 33.3]))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Float64Array)
      assert.equal(res.value.byteLength, 24)
      assert.deepEqual(res.value, new Float64Array([11.1, 22.2, 33.3]))
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

    it('reads array with u8 values', async () => {
      const wasm = await compileToWasm(arrayCode('u8'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, [11, 22, 33])
    })

    it('reads array with u16 values', async () => {
      const wasm = await compileToWasm(arrayCode('u16'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, [11, 22, 33])
    })

    it('reads array with u32 values', async () => {
      const wasm = await compileToWasm(arrayCode('u32'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, [11, 22, 33])
    })

    it('reads array with u64 values', async () => {
      const wasm = await compileToWasm(arrayCode('u64'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, [11n, 22n, 33n])
    })

    it('reads array with string values', async () => {
      const wasm = await compileToWasm(arrayCode('string', ['"aaa"', '"bbb"', '"ccc"']))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, ['aaa', 'bbb', 'ccc'])
    })

    it('reads static array with string values', async () => {
      const wasm = await compileToWasm('export function test(): StaticArray<string> { return StaticArray.fromArray<string>(["aaa", "bbb", "ccc"]) }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, ['aaa', 'bbb', 'ccc'])
    })
  })

  describe('maps with combos of types', () => {
    // It's important we test these combos as alignment in the memory is
    // different for each combo of byte size

    function mapCode(kt: string, vt: string): string {
      return `
      export function test(): Map<${kt}, ${vt}> {
        const map = new Map<${kt}, ${vt}>()
        map.set(1, 11)
        map.set(2, 22)
        map.set(3, 33)
        return map
      }
      `.trim()
    }

    it('reads map with u8 keys and u8 values', async () => {
      const wasm = await compileToWasm(mapCode('u8', 'u8'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u8 keys and u16 values', async () => {
      const wasm = await compileToWasm(mapCode('u8', 'u16'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u8 keys and u32 values', async () => {
      const wasm = await compileToWasm(mapCode('u8', 'u32'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u8 keys and u64 values', async () => {
      const wasm = await compileToWasm(mapCode('u8', 'u64'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11n], [2, 22n], [3, 33n]]))
    })

    it('reads map with u16 keys and u8 values', async () => {
      const wasm = await compileToWasm(mapCode('u16', 'u8'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u16 keys and u16 values', async () => {
      const wasm = await compileToWasm(mapCode('u16', 'u16'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u16 keys and u32 values', async () => {
      const wasm = await compileToWasm(mapCode('u16', 'u32'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u16 keys and u64 values', async () => {
      const wasm = await compileToWasm(mapCode('u16', 'u64'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11n], [2, 22n], [3, 33n]]))
    })

    it('reads map with u32 keys and u8 values', async () => {
      const wasm = await compileToWasm(mapCode('u32', 'u8'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u32 keys and u16 values', async () => {
      const wasm = await compileToWasm(mapCode('u32', 'u16'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u32 keys and u32 values', async () => {
      const wasm = await compileToWasm(mapCode('u32', 'u32'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u32 keys and u64 values', async () => {
      const wasm = await compileToWasm(mapCode('u32', 'u64'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11n], [2, 22n], [3, 33n]]))
    })

    it('reads map with u64 keys and u8 values', async () => {
      const wasm = await compileToWasm(mapCode('u64', 'u8'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1n, 11], [2n, 22], [3n, 33]]))
    })

    it('reads map with u64 keys and u16 values', async () => {
      const wasm = await compileToWasm(mapCode('u64', 'u16'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1n, 11], [2n, 22], [3n, 33]]))
    })

    it('reads map with u64 keys and u32 values', async () => {
      const wasm = await compileToWasm(mapCode('u64', 'u32'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1n, 11], [2n, 22], [3n, 33]]))
    })

    it('reads map with u64 keys and u64 values', async () => {
      const wasm = await compileToWasm(mapCode('u64', 'u64'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1n, 11n], [2n, 22n], [3n, 33n]]))
    })
  })

  describe('sets with different types', () => {
    function setCode(t: string): string {
      return `
      export function test(): Set<${t}> {
        const set = new Set<${t}>()
        set.add(11)
        set.add(22)
        set.add(33)
        return set
      }
      `.trim()
    }

    it('reads set with u8 entries', async () => {
      const wasm = await compileToWasm(setCode('u8'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Set)
      assert.deepEqual(res.value, new Set([11, 22, 33]))
    })

    it('reads set with u16 entries', async () => {
      const wasm = await compileToWasm(setCode('u16'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Set)
      assert.deepEqual(res.value, new Set([11, 22, 33]))
    })

    it('reads set with u32 entries', async () => {
      const wasm = await compileToWasm(setCode('u32'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Set)
      assert.deepEqual(res.value, new Set([11, 22, 33]))
    })

    it('reads set with u64 entries', async () => {
      const wasm = await compileToWasm(setCode('u64'))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, Set)
      assert.deepEqual(res.value, new Set([11n, 22n, 33n]))
    })
  })

  describe('objects', () => {
    it('reads plain objects', async() => {
      const code = `
      declare class Test {
        name: string;
        age: u8;
      }

      export function test(): Test {
        return { name: 'Fred', age: 42 }
      }
      `.trim()

      const wasm = await compileToWasm(code)
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.typeOf(res.value, 'object')
      assert.equal(res.value.name, 'Fred')
      assert.equal(res.value.age, 42)
    })
    
    it('reads exported objects (jigs)', async() => {
      const code = `
      export class Test extends Jig {
        name: string = 'Fred';
        age: u8 = 42;
      }
  
      export function test(): Test {
        return new Test()
      }
      `.trim()
  
      const wasm = await compileToWasm(code)
      const storage = new Storage();
      const clock = new MomentClock();
      const compiler = new Compiler(compile);
      wasm.setExecution(new TxExecution(new StorageTxContext(new Tx(), storage, storage, compiler, clock)))
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [])
      assert.instanceOf(res.value, JigRef)
      assert.typeOf(res.value.ref.ptr, 'number')
    })
  })
})

describe('writing complex types to memory', () => {
  describe('typed arrays', () => {
    it('writes Int8Array', async () => {
      const wasm = await compileToWasm('export function test(a: Int8Array): bool { return a.length == 3 && a.byteLength == 3 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Int8Array([11, 22, 33])])
      assert.isTrue(res.value)
    })
  
    it('writes Int16Array', async () => {
      const wasm = await compileToWasm('export function test(a: Int16Array): bool { return a.length == 3 && a.byteLength == 6 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Int16Array([11, 22, 33])])
      assert.isTrue(res.value)
    })
  
    it('writes Int32Array', async () => {
      const wasm = await compileToWasm('export function test(a: Int32Array): bool { return a.length == 3 && a.byteLength == 12 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Int32Array([11, 22, 33])])
      assert.isTrue(res.value)
    })
  
    it('writes Int64Array', async () => {
      const wasm = await compileToWasm('export function test(a: Int64Array): bool { return a.length == 3 && a.byteLength == 24 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new BigInt64Array([11n, 22n, 33n])])
      assert.isTrue(res.value)
    })
  
    it('writes Uint8Array', async () => {
      const wasm = await compileToWasm('export function test(a: Uint8Array): bool { return a.length == 3 && a.byteLength == 3 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Uint8Array([11, 22, 33])])
      assert.isTrue(res.value)
    })
  
    it('writes Uint16Array', async () => {
      const wasm = await compileToWasm('export function test(a: Uint16Array): bool { return a.length == 3 && a.byteLength == 6 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Uint16Array([11, 22, 33])])
      assert.isTrue(res.value)
    })
  
    it('writes Uint32Array', async () => {
      const wasm = await compileToWasm('export function test(a: Uint32Array): bool { return a.length == 3 && a.byteLength == 12 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Uint32Array([11, 22, 33])])
      assert.isTrue(res.value)
    })
  
    it('writes Uint64Array', async () => {
      const wasm = await compileToWasm('export function test(a: Uint64Array): bool { return a.length == 3 && a.byteLength == 24 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new BigUint64Array([11n, 22n, 33n])])
      assert.isTrue(res.value)
    })
  
    it('writes Float32Array', async () => {
      const wasm = await compileToWasm('export function test(a: Float32Array): bool { return a.length == 3 && a.byteLength == 12 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Float32Array([11.1, 22.2, 33.3])])
      assert.isTrue(res.value)
    })
  
    it('writes Float64Array', async () => {
      const wasm = await compileToWasm('export function test(a: Float64Array): bool { return a.length == 3 && a.byteLength == 24 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Float64Array([11.1, 22.2, 33.3])])
      assert.isTrue(res.value)
    })
  })

  describe('arrays and static arrays', () => {
    it('writes array with u8 values', async () => {
      const wasm = await compileToWasm('export function test(a: u8[]): bool { return a.length == 3 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [[11, 22, 33]])
      assert.isTrue(res.value)
    })

    it('writes array with u16 values', async () => {
      const wasm = await compileToWasm('export function test(a: u16[]): bool { return a.length == 3 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [[11, 22, 33]])
      assert.isTrue(res.value)
    })

    it('writes array with u32 values', async () => {
      const wasm = await compileToWasm('export function test(a: u32[]): bool { return a.length == 3 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [[11, 22, 33]])
      assert.isTrue(res.value)
    })

    it('writes array with u64 values', async () => {
      const wasm = await compileToWasm('export function test(a: u64[]): bool { return a.length == 3 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [[11, 22, 33]])
      assert.isTrue(res.value)
    })

    it('writes array with string values', async () => {
      const wasm = await compileToWasm('export function test(a: string[]): bool { return a.length == 3 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [['aaa', 'bbb', 'ccc']])
      assert.isTrue(res.value)
    })

    it('writes static array with string values', async () => {
      const wasm = await compileToWasm('export function test(a: StaticArray<string>): bool { return a.length == 3 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [['aaa', 'bbb', 'ccc']])
      assert.isTrue(res.value)
    })
  })

  describe('maps with combos of types', () => {
    it('writes map with u8 keys and u8 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u8, u8>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u8 keys and u16 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u8, u16>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u8 keys and u32 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u8, u32>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u8 keys and u64 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u8, u64>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u16 keys and u8 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u16, u8>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u16 keys and u16 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u16, u16>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u16 keys and u32 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u16, u32>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u16 keys and u64 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u16, u64>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u32 keys and u8 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u32, u8>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u32 keys and u16 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u32, u16>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u32 keys and u32 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u32, u32>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u32 keys and u64 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u32, u64>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u64 keys and u8 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u64, u8>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u64 keys and u16 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u64, u16>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u64 keys and u32 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u64, u32>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })

    it('writes map with u64 keys and u64 values', async () => {
      const wasm = await compileToWasm('export function test(a: Map<u64, u64>): bool { return a.get(1) == 11 && a.get(2) == 22 && a.get(3) == 33 }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Map([[1, 11], [2, 22], [3, 33]])])
      assert.isTrue(res.value)
    })
  })

  describe('sets with different types', () => {
    it('writes set with u8 entries', async () => {
      const wasm = await compileToWasm('export function test(a: Set<u8>): bool { return a.has(11) && a.has(22) && a.has(33) }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Set([11, 22, 33])])
      assert.isTrue(res.value)
    })

    it('writes set with u16 entries', async () => {
      const wasm = await compileToWasm('export function test(a: Set<u16>): bool { return a.has(11) && a.has(22) && a.has(33) }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Set([11, 22, 33])])
      assert.isTrue(res.value)
    })

    it('writes set with u32 entries', async () => {
      const wasm = await compileToWasm('export function test(a: Set<u32>): bool { return a.has(11) && a.has(22) && a.has(33) }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Set([11, 22, 33])])
      assert.isTrue(res.value)
    })

    it('writes set with u64 entries', async () => {
      const wasm = await compileToWasm('export function test(a: Set<u64>): bool { return a.has(11) && a.has(22) && a.has(33) }')
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [new Set([11, 22, 33])])
      assert.isTrue(res.value)
    })
  })

  describe('objects', () => {
    it('writes plain objects', async() => {
      const code = `
      declare class Test {
        name: string;
        age: u8;
      }

      export function test(a: Test): bool {
        return a.name == 'Fred' && a.age == 42
      }
      `.trim()

      const wasm = await compileToWasm(code)
      const res = wasm.functionCall(wasm.abi.functionByName('test'), [{ name: 'Fred', age: 42 }])
      assert.isTrue(res.value)
    })
  })
})
