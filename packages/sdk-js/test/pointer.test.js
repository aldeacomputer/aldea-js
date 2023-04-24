import test from 'ava'
import { Pointer, base16, util } from '../dist/index.js'

test.before(t => {
  t.context.origin = util.randomBytes(32)
  t.context.idx = 42
  t.context.ptr = new Pointer(t.context.origin, t.context.idx)
})

test('Pointer.fromString() parses string and returns an Pointer', t => {
  const ptr = Pointer.fromString(base16.encode(t.context.origin) + '_42')
  t.true(ptr.equals(t.context.ptr))
})

test('Pointer.fromString() throws with invalid string', t => {
  t.throws(() => Pointer.fromString(undefined))
  t.throws(() => Pointer.fromString({}))
  t.throws(() => Pointer.fromString(123))
  t.throws(() => Pointer.fromString('totally not a pointer'))
})

test('Pointer#equals() returns false when comparing a different Pointer', t => {
  const ptr = new Pointer(util.randomBytes(32), 1)
  t.false(t.context.ptr.equals(ptr))
})

test('Pointer#equals() returns true when comparing a matching Pointer', t => {
  const ptr = new Pointer(t.context.origin, t.context.idx)
  t.true(t.context.ptr.equals(ptr))
})

test('Pointer#toBytes() returns a Uint8Array', t => {
  const bytes = t.context.ptr.toBytes()

  t.true(bytes instanceof Uint8Array)
  t.is(bytes.byteLength, 34)
})

test('Pointer#toString() returns a pointer string', t => {
  const ptr = t.context.ptr.toString()
  t.true(typeof ptr === 'string')
  t.is(ptr.length, 67)
  t.regex(ptr, /^[a-f0-9]{64}_\d+$/i)
})
