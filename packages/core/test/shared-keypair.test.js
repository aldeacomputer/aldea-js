import test from 'ava'
import { KeyPair, ed25519, util } from '../dist/index.js'
import { SharedKeyPair } from '../dist/shared-keypair.js'

test.before(t => {
  t.context.alice = KeyPair.fromRandom()
  t.context.bob = KeyPair.fromRandom()

  t.context.aliceX = new SharedKeyPair(t.context.alice.privKey, t.context.bob.pubKey)
  t.context.bobX = new SharedKeyPair(t.context.bob.privKey, t.context.alice.pubKey)
})

test('same shared secret', t => {
  const data = util.randomBytes(12)
  t.deepEqual(
    t.context.aliceX.getSharedSecret(data),
    t.context.bobX.getSharedSecret(data),
  )
})

test('derive matching pubkeys from message', t => {
  const data = util.randomBytes(12)
  const alicePub = t.context.aliceX.deriveOwnPubKey(data)
  const xBobPub = t.context.aliceX.deriveTheirPubKey(data)
  const bobPub = t.context.bobX.deriveOwnPubKey(data)
  const xAlicePub = t.context.bobX.deriveTheirPubKey(data)

  t.is(alicePub.toHex(), xAlicePub.toHex())
  t.is(bobPub.toHex(), xBobPub.toHex())
})

test('signing', t => {
  const data = util.randomBytes(12)
  const msg = util.randomBytes(12)
  const alicePriv = t.context.aliceX.deriveOwnPrivKeyBytes(data)
  const sig = ed25519.sign(msg, alicePriv)
  const alicePub1 = t.context.aliceX.deriveOwnPubKey(data)
  const alicePub2 = t.context.bobX.deriveTheirPubKey(data)
  
  t.true(ed25519.verify(sig, msg, alicePub1))
  t.true(ed25519.verify(sig, msg, alicePub2))
})