import { assert } from 'chai'
import { compile } from '@aldea/compiler'
import { abiFromCbor } from '@aldea/compiler/abi'
import { WasmInstance } from '../vm/wasm-instance.js'
import { Internref } from '../vm/memory.js'

async function compileToWasm(src: string, id: string = 'test'): Promise<WasmInstance> {
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
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, -42)
  })

  it('reads i16 as number', async () => {
    const wasm = await compileToWasm('export function test(): i16 { return -42 }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, -42)
  })

  it('reads i32 as number', async () => {
    const wasm = await compileToWasm('export function test(): i32 { return -42 }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, -42)
  })

  it('reads i64 as bigint', async () => {
    const wasm = await compileToWasm('export function test(): i64 { return -42 }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'bigint')
    assert.equal(res.value, -42n)
  })

  it('reads u8 as number', async () => {
    const wasm = await compileToWasm('export function test(): u8 { return 42 }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, 42)
  })

  it('reads u16 as number', async () => {
    const wasm = await compileToWasm('export function test(): u16 { return 42 }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, 42)
  })

  it('reads u32 as number', async () => {
    const wasm = await compileToWasm('export function test(): u32 { return 42 }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, 42)
  })

  it('reads u64 as bigint', async () => {
    const wasm = await compileToWasm('export function test(): u64 { return 42 }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'bigint')
    assert.equal(res.value, 42n)
  })

  xit('reads f32 as number', async () => {
    const wasm = await compileToWasm('export function test(): f32 { return 42.12345 }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, 42.12345)
  })

  it('reads f64 as number', async () => {
    const wasm = await compileToWasm('export function test(): f64 { return 42.12345 }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'number')
    assert.equal(res.value, 42.12345)
  })

  it('reads boolean', async () => {
    const wasm = await compileToWasm('export function test(): bool { return true }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'boolean')
    assert.equal(res.value, true)
  })

  it('reads string', async () => {
    const wasm = await compileToWasm('export function test(): string { return "hello world!" }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'string')
    assert.equal(res.value, 'hello world!')
  })

  it('reads ArrayBuffer', async () => {
    const wasm = await compileToWasm('export function test(): ArrayBuffer { return new ArrayBuffer(5) }')
    const res = wasm.functionCall('test', [])
    assert.typeOf(res.value, 'ArrayBuffer')
    assert.equal(res.value.byteLength, 5)
  })
})

describe('writing basic types to memory', () => {
  it('writes number as i8', async () => {
    const wasm = await compileToWasm('export function test(a: i8): bool { return a == -42 }')
    const res = wasm.functionCall('test', [-42])
    assert.isTrue(res.value)
  })

  it('writes number as i16', async () => {
    const wasm = await compileToWasm('export function test(a: i16): bool { return a == -42 }')
    const res = wasm.functionCall('test', [-42])
    assert.isTrue(res.value)
  })

  it('writes number as i32', async () => {
    const wasm = await compileToWasm('export function test(a: i32): bool { return a == -42 }')
    const res = wasm.functionCall('test', [-42])
    assert.isTrue(res.value)
  })

  it('writes number as i64', async () => {
    const wasm = await compileToWasm('export function test(a: i64): bool { return a == -42 }')
    const res = wasm.functionCall('test', [-42])
    assert.isTrue(res.value)
  })

  it('writes bigint as i64', async () => {
    const wasm = await compileToWasm('export function test(a: i64): bool { return a == -42 }')
    const res = wasm.functionCall('test', [-42n])
    assert.isTrue(res.value)
  })

  it('writes number as u8', async () => {
    const wasm = await compileToWasm('export function test(a: u8): bool { return a == 42 }')
    const res = wasm.functionCall('test', [42])
    assert.isTrue(res.value)
  })

  it('writes number as u16', async () => {
    const wasm = await compileToWasm('export function test(a: u16): bool { return a == 42 }')
    const res = wasm.functionCall('test', [42])
    assert.isTrue(res.value)
  })

  it('writes number as u32', async () => {
    const wasm = await compileToWasm('export function test(a: u32): bool { return a == 42 }')
    const res = wasm.functionCall('test', [42])
    assert.isTrue(res.value)
  })

  it('writes number as u64', async () => {
    const wasm = await compileToWasm('export function test(a: u64): bool { return a == 42 }')
    const res = wasm.functionCall('test', [42])
    assert.isTrue(res.value)
  })

  it('writes bigint as u64', async () => {
    const wasm = await compileToWasm('export function test(a: u64): bool { return a == 42 }')
    const res = wasm.functionCall('test', [42n])
    assert.isTrue(res.value)
  })

  it('writes number as f32', async () => {
    const wasm = await compileToWasm('export function test(a: f32): bool { return a == 42.12345 }')
    const res = wasm.functionCall('test', [42.12345])
    assert.isTrue(res.value)
  })

  it('writes number as f64', async () => {
    const wasm = await compileToWasm('export function test(a: f64): bool { return a == 42.12345 }')
    const res = wasm.functionCall('test', [42.12345])
    assert.isTrue(res.value)
  })

  it('writes boolean', async () => {
    const wasm = await compileToWasm('export function test(a: bool): bool { return a == true }')
    const res = wasm.functionCall('test', [true])
    assert.isTrue(res.value)
  })

  it('writes string', async () => {
    const wasm = await compileToWasm('export function test(a: string): bool { return a == "hello world!" }')
    const res = wasm.functionCall('test', ['hello world!'])
    assert.isTrue(res.value)
  })

  it('writes ArrayBuffer', async () => {
    const wasm = await compileToWasm('export function test(a: ArrayBuffer): bool { return a.byteLength == 5 }')
    const res = wasm.functionCall('test', [new ArrayBuffer(5)])
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
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Int8Array)
      assert.equal(res.value.byteLength, 3)
      assert.deepEqual(res.value, new Int8Array([11, 22, 33]))
    })

    it('reads Int16Array', async () => {
      const wasm = await compileToWasm(bufCode('Int16Array'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Int16Array)
      assert.equal(res.value.byteLength, 6)
      assert.deepEqual(res.value, new Int16Array([11, 22, 33]))
    })

    it('reads Int32Array', async () => {
      const wasm = await compileToWasm(bufCode('Int32Array'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Int32Array)
      assert.equal(res.value.byteLength, 12)
      assert.deepEqual(res.value, new Int32Array([11, 22, 33]))
    })

    it('reads Int64Array', async () => {
      const wasm = await compileToWasm(bufCode('Int64Array'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, BigInt64Array)
      assert.equal(res.value.byteLength, 24)
      assert.deepEqual(res.value, new BigInt64Array([11n, 22n, 33n]))
    })

    it('reads Uint8Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint8Array'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Uint8Array)
      assert.equal(res.value.byteLength, 3)
      assert.deepEqual(res.value, new Uint8Array([11, 22, 33]))
    })

    it('reads Uint16Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint16Array'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Uint16Array)
      assert.equal(res.value.byteLength, 6)
      assert.deepEqual(res.value, new Uint16Array([11, 22, 33]))
    })

    it('reads Uint32Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint32Array'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Uint32Array)
      assert.equal(res.value.byteLength, 12)
      assert.deepEqual(res.value, new Uint32Array([11, 22, 33]))
    })

    it('reads Uint64Array', async () => {
      const wasm = await compileToWasm(bufCode('Uint64Array'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, BigUint64Array)
      assert.equal(res.value.byteLength, 24)
      assert.deepEqual(res.value, new BigUint64Array([11n, 22n, 33n]))
    })

    it('reads Float32Array', async () => {
      const wasm = await compileToWasm(bufCode('Float32Array', [11.1, 22.2, 33.3]))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Float32Array)
      assert.equal(res.value.byteLength, 12)
      assert.deepEqual(res.value, new Float32Array([11.1, 22.2, 33.3]))
    })

    it('reads Float64Array', async () => {
      const wasm = await compileToWasm(bufCode('Float64Array', [11.1, 22.2, 33.3]))
      const res = wasm.functionCall('test', [])
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
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, [11, 22, 33])
    })

    it('reads array with u16 values', async () => {
      const wasm = await compileToWasm(arrayCode('u16'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, [11, 22, 33])
    })

    it('reads array with u32 values', async () => {
      const wasm = await compileToWasm(arrayCode('u32'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, [11, 22, 33])
    })

    it('reads array with u64 values', async () => {
      const wasm = await compileToWasm(arrayCode('u64'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, [11n, 22n, 33n])
    })

    it('reads array with string values', async () => {
      const wasm = await compileToWasm(arrayCode('string', ['"aaa"', '"bbb"', '"ccc"']))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Array)
      assert.deepEqual(res.value, ['aaa', 'bbb', 'ccc'])
    })

    it('reads static array with string values', async () => {
      const wasm = await compileToWasm('export function test(): StaticArray<string> { return StaticArray.fromArray<string>(["aaa", "bbb", "ccc"]) }')
      const res = wasm.functionCall('test', [])
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
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u8 keys and u16 values', async () => {
      const wasm = await compileToWasm(mapCode('u8', 'u16'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u8 keys and u32 values', async () => {
      const wasm = await compileToWasm(mapCode('u8', 'u32'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u8 keys and u64 values', async () => {
      const wasm = await compileToWasm(mapCode('u8', 'u64'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11n], [2, 22n], [3, 33n]]))
    })

    it('reads map with u16 keys and u8 values', async () => {
      const wasm = await compileToWasm(mapCode('u16', 'u8'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u16 keys and u16 values', async () => {
      const wasm = await compileToWasm(mapCode('u16', 'u16'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u16 keys and u32 values', async () => {
      const wasm = await compileToWasm(mapCode('u16', 'u32'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u16 keys and u64 values', async () => {
      const wasm = await compileToWasm(mapCode('u16', 'u64'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11n], [2, 22n], [3, 33n]]))
    })

    it('reads map with u32 keys and u8 values', async () => {
      const wasm = await compileToWasm(mapCode('u32', 'u8'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u32 keys and u16 values', async () => {
      const wasm = await compileToWasm(mapCode('u32', 'u16'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u32 keys and u32 values', async () => {
      const wasm = await compileToWasm(mapCode('u32', 'u32'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11], [2, 22], [3, 33]]))
    })

    it('reads map with u32 keys and u64 values', async () => {
      const wasm = await compileToWasm(mapCode('u32', 'u64'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1, 11n], [2, 22n], [3, 33n]]))
    })

    it('reads map with u64 keys and u8 values', async () => {
      const wasm = await compileToWasm(mapCode('u64', 'u8'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1n, 11], [2n, 22], [3n, 33]]))
    })

    it('reads map with u64 keys and u16 values', async () => {
      const wasm = await compileToWasm(mapCode('u64', 'u16'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1n, 11], [2n, 22], [3n, 33]]))
    })

    it('reads map with u64 keys and u32 values', async () => {
      const wasm = await compileToWasm(mapCode('u64', 'u32'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Map)
      assert.deepEqual(res.value, new Map([[1n, 11], [2n, 22], [3n, 33]]))
    })

    it('reads map with u64 keys and u64 values', async () => {
      const wasm = await compileToWasm(mapCode('u64', 'u64'))
      const res = wasm.functionCall('test', [])
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
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Set)
      assert.deepEqual(res.value, new Set([11, 22, 33]))
    })

    it('reads set with u16 entries', async () => {
      const wasm = await compileToWasm(setCode('u16'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Set)
      assert.deepEqual(res.value, new Set([11, 22, 33]))
    })

    it('reads set with u32 entries', async () => {
      const wasm = await compileToWasm(setCode('u32'))
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Set)
      assert.deepEqual(res.value, new Set([11, 22, 33]))
    })

    it('reads set with u64 entries', async () => {
      const wasm = await compileToWasm(setCode('u64'))
      const res = wasm.functionCall('test', [])
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
      const res = wasm.functionCall('test', [])
      assert.typeOf(res.value, 'object')
      assert.equal(res.value.name, 'Fred')
      assert.equal(res.value.age, 42)
    })
    
    it('reads exported objects (jigs)', async() => {
      const code = `
      export class Test {
        name: string = 'Fred';
        age: u8 = 42;
      }
  
      export function test(): Test {
        return new Test()
      }
      `.trim()
  
      const wasm = await compileToWasm(code)
      const res = wasm.functionCall('test', [])
      assert.instanceOf(res.value, Internref)
      assert.equal(res.value.name, 'Test')
      assert.typeOf(res.value.ptr, 'number')
    })
  })
})
