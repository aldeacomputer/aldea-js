import test from 'ava'
import {
  Point,
  calcPoint,
  pointFromBytes,
  pointToBytes,
  sign,
  verify,
} from '../../dist/support/ed25519.js'
import { randomBytes } from '../../dist/support/util.js'
import { PrivKey } from '../../dist/privkey.js'

test.before(t => {
  t.context.privBuf = randomBytes(32)
  t.context.point = calcPoint(t.context.privBuf)
  t.context.pubBuf = t.context.point.toRawBytes()
  t.context.sig = sign(Buffer.from('test'), t.context.privBuf)
})

test('calcPoint() returns a Point', t => {
  const point = calcPoint(t.context.privBuf)
  t.true(point instanceof Point)
  t.is(typeof point.x, 'bigint')
  t.is(typeof point.y, 'bigint')
})

test('calcPoint() throws if not 32 bytes', t => {
  t.throws(() => calcPoint(new Uint8Array(5)))
  t.throws(() => calcPoint(new Uint8Array(35)))
  t.throws(() => calcPoint())
  t.throws(() => calcPoint({}))
  t.throws(() => calcPoint('abc'))
})

test('pointFromBytes() returns a Point', t => {
  const point = pointFromBytes(t.context.pubBuf)
  t.true(point instanceof Point)
  t.deepEqual(point.toAffine(), t.context.point.toAffine())
})

test('pointFromBytes() throws if not 32 bytes', t => {
  t.throws(() => pointFromBytes(new Uint8Array(5)))
  t.throws(() => pointFromBytes(new Uint8Array(35)))
  t.throws(() => pointFromBytes())
  t.throws(() => pointFromBytes({}))
  t.throws(() => pointFromBytes('abc'))
})

test('pointToBytes() returns a Uint8Array with valid Point', t => {
  const bytes = pointToBytes(t.context.point)
  t.true(bytes instanceof Uint8Array)
  t.deepEqual(bytes, t.context.pubBuf)
})

test('pointToBytes() throws with invalid Point', t => {
  t.throws(() => pointToBytes(), { message: 'The first argument to `pointToBytes()` must be a `Point`' })
  t.throws(() => pointToBytes({}))
  t.throws(() => pointToBytes(1))
  t.throws(() => pointToBytes('abc'))
})

test('sign() signs message with a private key', t => {
  const msg = Buffer.from('test')
  const sig1 = sign(msg, t.context.privBuf)
  const sig2 = sign(msg, PrivKey.fromBytes(t.context.privBuf))
  t.true(sig1 instanceof Uint8Array)
  t.true(sig2 instanceof Uint8Array)
  t.is(sig1.length, 64)
  t.is(sig2.length, 64)
  t.deepEqual(sig1, t.context.sig)
  t.deepEqual(sig2, t.context.sig)
})

test('verify() verifies a signature with a public Key', t => {
  const msg = Buffer.from('test')
  t.true(verify(t.context.sig, msg, t.context.pubBuf))
  t.true(verify(t.context.sig, msg, PrivKey.fromBytes(t.context.privBuf).toPubKey()))
})

test('verify() returns false with incorrect message', t => {
  t.false(verify(t.context.sig, Buffer.from('test2'), t.context.pubBuf))
})

test('verify() returns false with incorrect pubkey', t => {
  t.false(verify(t.context.sig, Buffer.from('test'), PrivKey.fromRandom().toPubKey()))
})
