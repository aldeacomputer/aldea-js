import test from 'ava'
import fs from 'fs'
import { join } from 'path'
import { BCS, BCSWriter, Pointer, base16, ref } from '../dist/index.js'

function loadABI(filename) {
  const abiStr = fs.readFileSync(join('./test/abis', filename), 'utf8')
  return JSON.parse(abiStr)
}

const abi1 = loadABI('bcs1.abi.json')
const abi2 = loadABI('bcs2.abi.json')
const abi3 = loadABI('bcs3.abi.json')

test.before(t => {
  t.context.bcs = new BCS()
})

test('encodes and decodes jig state', t => {
  const bcs = new BCS(abi1)
  const state = ['test', 180n]
  const data = bcs.encode('Foo', state)
  const res = bcs.decode('Foo', data)
  t.deepEqual(res, state)
})

test('encodes and decodes jig state with nullable field', t => {
  const bcs = new BCS(abi1)
  const state = [null, 180n]
  const data = bcs.encode('Foo', state)
  const res = bcs.decode('Foo', data)
  t.deepEqual(res, state)
})

test('encodes and decodes jig state with pointer', t => {
  const bcs = new BCS(abi1)
  const state = ['test', Pointer.fromString('1234567812345678123456781234567812345678123456781234567812345678_0')]
  const data = bcs.encode('Bar', state)
  const res = bcs.decode('Bar', data)
  t.deepEqual(res, state)
})

test('encodes and decodes jig state with nested pointer', t => {
  const bcs = new BCS(abi3)
  const state = [new Map([
    ['a', Pointer.fromString('1234567812345678123456781234567812345678123456781234567812345678_0')],
    ['b', Pointer.fromString('1234567812345678123456781234567812345678123456781234567812345678_0')]
  ])]
  const data = bcs.encode('Nested', state)
  const res = bcs.decode('Nested', data)
  t.deepEqual(res, state)
})

test('encodes and decodes method args', t => {
  const bcs = new BCS(abi1)
  const args = ['test']
  const data = bcs.encode('Foo$setA', args)
  const res = bcs.decode('Foo$setA', data)
  t.deepEqual(res, args)
})

test('encodes and decodes method args with instruction ref', t => {
  const bcs = new BCS(abi1)
  const args = [ref(11)]
  const data = bcs.encode('Bar$setB', args)
  const res = bcs.decode('Bar$setB', data)
  t.deepEqual(res, args)
})

test('encodes and decodes function args', t => {
  const bcs = new BCS(abi1)
  const args = ['foo', 180n, 'bar']
  const data = bcs.encode('test1', args)
  const res = bcs.decode('test1', data)
  t.deepEqual(res, args)
})

test('encodes and decodes function args with nullable field', t => {
  const bcs = new BCS(abi1)
  const args = ['foo', 180n, null]
  const data = bcs.encode('test1', args)
  const res = bcs.decode('test1', data)
  t.deepEqual(res, args)
})

test('encodes and decodes function args with nested instruction ref', t => {
  const bcs = new BCS(abi3)
  const args = ['foo', new Map([
    ['a', 'aaaa'],
    ['b', ref(11)],
    ['c', 'cccc'],
    ['d', ref(21)],
  ])]
  const data = bcs.encode('test', args)
  const res = bcs.decode('test', data)
  t.deepEqual(res, args)
})

test('encodes and decodes object', t => {
  const bcs = new BCS(abi1)
  const obj = {
    foo: 'bar',
    i8: -1,
    u8: 1,
    i64: -1311768467750121216n,
    u64: 1311768467750121216n,
  }
  const data = bcs.encode('Primitives', obj)
  const res = bcs.decode('Primitives', data)
  t.deepEqual(res, obj)
})

test('encodes and decodes object with nullable field', t => {
  const bcs = new BCS(abi1)
  const obj = {
    foo: null,
    i8: -1,
    u8: 1,
    i64: -1311768467750121216n,
    u64: 1311768467750121216n,
  }
  const data = bcs.encode('Primitives', obj)
  const res = bcs.decode('Primitives', data)
  t.deepEqual(res, obj)
})

test('encodes and decodes recursive object', t => {
  const bcs = new BCS(abi1)
  const obj = {
    foo: 'bar',
    bar: [
      { foo: 'a', bar: [] },
      { foo: 'b', bar: [{ foo: 'x', bar: [] }] },
    ]
  }
  const data = bcs.encode('Recursive', obj)
  const res = bcs.decode('Recursive', data)
  t.deepEqual(res, obj)
})

test('encodes and decodes a full abi document', t => {
  const bcs = new BCS({ addAbiTypes: true })
  const dat = bcs.encode('abi', abi1)
  const res = bcs.decode('abi', dat)
  t.deepEqual(res, abi1)
})

test('encodes and decodes a package tuple', t => {
  const pkg = [['index.ts'], new Map([['index.ts', 'exports function foo(): void {}']])]
  const bcs = new BCS({ addPkgTypes: true })
  const dat = bcs.encode('pkg', pkg)
  const res = bcs.decode('pkg', dat)
  t.deepEqual(res, pkg)
})

test('encodes jig state with inheritance', t => {
  const bcs = new BCS(abi2)
  const state = ['foo', 'bar', 9999, new Map([['foo', 'bar']])]
  const data = bcs.encode('Child', state)
  const res = bcs.decode('Child', data)
  t.deepEqual(res, state)
})

test('encodes true bool', t => {
  t.is(base16.encode(t.context.bcs.encode('bool', true)), '01')
})

test('encodes false bool', t => {
  t.is(base16.encode(t.context.bcs.encode('bool', false)), '00')
})

test('encodes 8-bit signed int', t => {
  t.is(base16.encode(t.context.bcs.encode('i8', -1)), 'ff')
})

test('encodes 8-bit unsigned int', t => {
  t.is(base16.encode(t.context.bcs.encode('u8', 1)), '01')
})

test('encodes 16-bit signed int', t => {
  t.is(base16.encode(t.context.bcs.encode('i16', -4660)), 'cced')
})

test('encodes 16-bit unsigned int', t => {
  t.is(base16.encode(t.context.bcs.encode('u16', 4660)), '3412')
})

test('encodes 32-bit signed int', t => {
  t.is(base16.encode(t.context.bcs.encode('i32', -305419896)), '88a9cbed')
})

test('encodes 32-bit unsigned int', t => {
  t.is(base16.encode(t.context.bcs.encode('u32', 305419896)), '78563412')
})

test('encodes 64-bit signed int', t => {
  t.is(base16.encode(t.context.bcs.encode('i64', -1311768467750121216n)), '0011325487a9cbed')
})

test('encodes 64-bit unsigned int', t => {
  t.is(base16.encode(t.context.bcs.encode('u64', 1311768467750121216n)), '00efcdab78563412')
})

test('encodes ULEB int 1', t => {
  const writer = new BCSWriter()
  writer.writeULEB(1)
  t.is(base16.encode(writer.toBytes()), '01')
})

test('encodes ULEB int 128', t => {
  const writer = new BCSWriter()
  writer.writeULEB(128)
  t.is(base16.encode(writer.toBytes()), '8001')
})

test('encodes ULEB int 16384', t => {
  const writer = new BCSWriter()
  writer.writeULEB(16384)
  t.is(base16.encode(writer.toBytes()), '808001')
})

test('encodes ULEB int 2097152', t => {
  const writer = new BCSWriter()
  writer.writeULEB(2097152)
  t.is(base16.encode(writer.toBytes()), '80808001')
})

test('encodes ULEB int 268435456', t => {
  const writer = new BCSWriter()
  writer.writeULEB(268435456)
  t.is(base16.encode(writer.toBytes()), '8080808001')
})

test('encodes ULEB int 9487', t => {
  const writer = new BCSWriter()
  writer.writeULEB(9487)
  t.is(base16.encode(writer.toBytes()), '8f4a')
})
