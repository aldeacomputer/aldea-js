import test from 'ava'
import crypto from 'crypto'
import { Pointer } from '../dist/pointer.js'
import { base16 } from '../dist/support/base.js'

test.before(t => {
  t.context.id = crypto.randomBytes(32)
  t.context.idx = 42
  t.context.ptr = new Pointer(t.context.id, t.context.idx)
})

test('Pointer.fromString() parses string and returns an Pointer', t => {
  const ptr = Pointer.fromString(base16.encode(t.context.id) + '_42')
  t.true(ptr.equals(t.context.ptr))
})

test('Pointer.fromString() throws with invalid string', t => {
  t.throws(() => Pointer.fromString())
  t.throws(() => Pointer.fromString({}))
  t.throws(() => Pointer.fromString(123))
  t.throws(() => Pointer.fromString('totally not a pointer'))
})

test('Pointer#equals() returns false when comparing a different Pointer', t => {
  const ptr = new Pointer(crypto.randomBytes(32), 1)
  t.false(t.context.ptr.equals(ptr))
})

test('Pointer#equals() returns true when comparing a matching Pointer', t => {
  const ptr = new Pointer(t.context.id, t.context.idx)
  t.true(t.context.ptr.equals(ptr))
})

test('Pointer#toBytes() returns a Uint8Array', t => {
  const bytes = t.context.ptr.toBytes()

  t.true(bytes instanceof Uint8Array)
  t.is(bytes.byteLength, 36)
})

test('Pointer#toString() returns a pointer string', t => {
  const ptr = t.context.ptr.toString()
  t.true(typeof ptr === 'string')
  t.is(ptr.length, 67)
  t.regex(ptr, /^[a-f0-9]{64}_\d+$/i)
})
