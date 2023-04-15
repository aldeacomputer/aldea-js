import test from 'ava'
import { shimCrypto } from './test-helpers.js'

import { HDPrivKey, ed25519, blake3 } from '../dist/index.js'

await shimCrypto()

test('this is a test', t => {
  const rootSec = HDPrivKey.fromRandom()
  const rootPub = rootSec.toHDPubKey()
  
  console.log('root')
  console.log(rootSec.toString())
  console.log('--', rootPub.toString())

  console.log('dervied 1')
  const s1 = rootSec.derive('m/1/2/3')
  const p1 = rootPub.derive('M/1/2/3')
  console.log(s1.toString())
  console.log('--', s1.toHDPubKey().toString())
  console.log('--', p1.toString())

  console.log('dervied 2')
  const s2 = s1.derive('m/100/200/300')
  const p2a = s1.derive('M/100/200/300')
  const p2b = p1.derive('M/100/200/300')
  console.log(s2.toString())
  console.log('--', s2.toHDPubKey().toString())
  console.log('--', p2a.toString())
  console.log('--', p2b.toString())

  console.log('SIGNING')
  const msg = blake3.hash('testing', 32)
  const sig = ed25519.sign(msg, s1)
  console.log('verify?', ed25519.verify(sig, msg, p1.toPubKey()))

  t.pass()
})

test.todo('HDPrivKey.fromRandom() generates a new random HDPrivKey')
test.todo('HDPrivKey.fromSeed() returns an HDPrivKey with valid seed')
test.todo('HDPrivKey.fromSeed() throws with invalid seed')
test.todo('HDPrivKey.fromBytes() returns a HDPrivKey with valid bytes')
test.todo('HDPrivKey.fromBytes() throws with incorrect bytes length')
test.todo('HDPrivKey.fromBytes() throws with invalid bytes')
test.todo('HDPrivKey.fromHex() returns a HDPrivKey with valid hex')
test.todo('HDPrivKey.fromHex() throws with invalid hex')
test.todo('HDPrivKey.fromString() returns a HDPrivKey with valid string')
test.todo('HDPrivKey.fromString() throws with invalid string')
test.todo('HDPrivKey#derive() returns a derived HDPrivKey with valid path')
test.todo('HDPrivKey#derive() returns a derived HDPubKey with valid path')
test.todo('HDPrivKey#derive() returns matching HDPubKeys')
test.todo('HDPrivKey#derive() throws with an invalid path')
test.todo('HDPrivKey#deriveChild() returns a derived HDPrivKey with valid index')
test.todo('HDPrivKey#deriveChild() throws with an invalid index')
test.todo('HDPrivKey#toBytes() returns a Uint8Array')
test.todo('HDPrivKey#toHex() returns a string')
test.todo('HDPrivKey#toString() returns a bech32m string')
test.todo('HDPrivKey#toHDPubKey() returns a HDPubKey')
test.todo('HDPrivKey#toPubKey() returns a PubKey')

// # TODO - also add tests for signing/verifying (prob in ed25519 tests)
