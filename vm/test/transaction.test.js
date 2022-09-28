import { describe } from "mocha"
import { Transaction } from "../vm/transaction.js"
import { LoadInstruction } from "../vm/index.js"
import blake3 from 'blake3-wasm'
import { expect } from "chai"
import { NewInstruction } from "../vm/index.js"
import { LockInstruction } from "../vm/index.js"
import { CallInstruction } from "../vm/index.js"
import { LiteralArg } from "../vm/literal-arg.js"
import { JigArg } from "../vm/jig-arg.js"
import { UnlockInstruction } from "../vm/index.js"
import * as ed from '@noble/ed25519'
// import { sha512 } from '@noble/hashes/sha512'
import { createHash } from 'crypto'
import { AldeaCrypto } from "../vm/aldea-crypto.js"
import { Signature } from "../vm/signature.js"

describe('Transaction#encode', () => {
  const aPrivateKey = AldeaCrypto.randomPrivateKey()
  const aPubKey = AldeaCrypto.publicKeyFromPrivateKey(aPrivateKey)
  describe('#serialize', () => {
    it('serializes a tx with one load instruction', () => {
      const tx = new Transaction()
      tx.add(new LoadInstruction('someLocation'))

      expect(tx.serialize()).to.eql('LOAD someLocation')
    })

    it('serializes a tx with a new instruction with no args', () => {
      const tx = new Transaction()
      tx.add(new NewInstruction('v1/sword.wasm', 'Sword', []))

      expect(tx.serialize()).to.eql('NEW v1/sword.wasm Sword')
    })

    it('serializes a tx with args', () => {
      const tx = new Transaction()
      tx.add(new NewInstruction('v1/sword.wasm', 'Sword', [new LiteralArg("foo"), new LiteralArg(10), new JigArg(101)]))

      expect(tx.serialize()).to.eql('NEW v1/sword.wasm Sword "foo" 10 $101')
    })

    it('serializes a tx with a lock instruction', () => {
      const tx = new Transaction()
      tx.add(new LockInstruction(0, 'somepubkey'))


      expect(tx.serialize()).to.eql('LOCK $0 "somepubkey"')
    })

    it('serializes a tx with a call instruction with no args', () => {
      const tx = new Transaction()
      tx.add(new CallInstruction(0, 'm1', []))

      expect(tx.serialize()).to.eql('CALL $0 m1')
    })

    it('serializes a tx with a call instruction with a literal string arg', () => {
      const tx = new Transaction()
      tx.add(new CallInstruction(0, 'm1', [new LiteralArg('foo')]))

      expect(tx.serialize()).to.eql('CALL $0 m1 "foo"')
    })

    it('serializes a tx with a call instruction with a literal number arg', () => {
      const tx = new Transaction()
      tx.add(new CallInstruction(0, 'm1', [new LiteralArg(1)]))

      expect(tx.serialize()).to.eql('CALL $0 m1 1')
    })

    it('serializes a tx with a call instruction with a jig arg', () => {
      const tx = new Transaction()
      tx.add(new CallInstruction(0, 'm1', [new JigArg(0)]))

      expect(tx.serialize()).to.eql('CALL $0 m1 $0')
    })

    it('serializes a tx with a call instruction with multiple args', () => {
      const tx = new Transaction()
      tx.add(new CallInstruction(0, 'm1', [new LiteralArg('foo'), new LiteralArg(100), new JigArg(0)]))

      expect(tx.serialize()).to.eql('CALL $0 m1 "foo" 100 $0')
    })

    it('serializes a correct hash for tx with an unlock instruction', () => {
      const tx = new Transaction()
      tx.add(new UnlockInstruction(0, 'somekey'))

      expect(tx.serialize()).to.eql('UNLOCK $0 "somekey"')
    })

    it('serializes multiple instructions', () => {
      const tx = new Transaction()
        .add(new NewInstruction('some-class.wasm', 'SomeClass', [new LiteralArg("foo")]))
        .add(new CallInstruction(0, 'm1', [new JigArg(1)]))
        .add(new LockInstruction(0, 'somekey'))

      expect(tx.serialize()).to.eql([
        'NEW some-class.wasm SomeClass "foo"',
        'CALL $0 m1 $1',
        'LOCK $0 "somekey"'
      ].join('\n'))
    })
  })

  describe('#hash', () => {
    it('returns the hex version of the hash of the tx', () => {
      const tx = new Transaction()
        .add(new NewInstruction('some-class.wasm', 'SomeClass', [new LiteralArg("foo")]))
        .add(new CallInstruction(0, 'm1', [new JigArg(1)]))
        .add(new LockInstruction(0, 'somekey'))

      expect(tx.hash).to.eql(blake3.hash([
        'NEW some-class.wasm SomeClass "foo"',
          'CALL $0 m1 $1',
          'LOCK $0 "somekey"'
        ].join('\n')))
    })
  })

  describe('#id', () => {
    it('returns the hex version of the hash of the tx', () => {
      const tx = new Transaction()
        .add(new NewInstruction('some-class.wasm', 'SomeClass', [new LiteralArg("foo")]))
        .add(new CallInstruction(0, 'm1', [new JigArg(1)]))
        .add(new LockInstruction(0, 'somekey'))

      expect(tx.id).to.eql(blake3.hash([
        'NEW some-class.wasm SomeClass "foo"',
        'CALL $0 m1 $1',
        'LOCK $0 "somekey"'
      ].join('\n')).toString('hex'))
    })
  })

  describe('#isCorrectlySigned', () => {
    it('a tx with no signatures returns false', () => {
      const tx = new Transaction()
      expect(tx.isCorrectlySigned()).to.eql(false)
    })

    it('a tx with one extra correct signature returns false', () => {
      const tx = new Transaction()
        .add(new LoadInstruction('someLocation'))

      const rawSig = AldeaCrypto.sign(Buffer.from(tx.serialize()), aPrivateKey) // unneded signature
      const sig = new Signature(aPubKey, rawSig)
      tx.addSignature(sig)

      expect(tx.isCorrectlySigned()).to.eql(false)
    })

    it('a tx with wrong signature returns false', () => {
      const tx = new Transaction()
        .add(new LoadInstruction('someLocation'))
        .add(new UnlockInstruction(0, aPubKey))
      const rawSig = AldeaCrypto.sign(Buffer.from('wrong data'), aPrivateKey)
      const sig = new Signature(aPubKey, rawSig)
      tx.addSignature(sig)
      expect(tx.isCorrectlySigned()).to.eql(false)
    })

    it('a signature made with a wrong key returns false', () => {
      const tx = new Transaction()
        .add(new LoadInstruction('someLocation'))
      const rawSig = AldeaCrypto.sign(Buffer.from('wrong data'), AldeaCrypto.randomPrivateKey())
      const sig = new Signature(aPubKey, rawSig)
      tx.addSignature(sig)
      expect(tx.isCorrectlySigned()).to.eql(false)
    })

    it('a when a used signature is missing returns false', () => {
      const tx = new Transaction()
        .add(new LoadInstruction('someLocation'))
        .add(new UnlockInstruction(0, Buffer.from('anotherpubkey')))
      const rawSig = AldeaCrypto.sign(Buffer.from(tx.serialize()), aPrivateKey)
      const sig = new Signature(aPubKey, rawSig)
      tx.addSignature(sig)
      expect(tx.isCorrectlySigned()).to.eql(false)
    })

    it('when there is extra keys returns false', () => {
      const tx = new Transaction()
        .add(new LoadInstruction('someLocation'))
        .add(new UnlockInstruction(0, aPubKey))
      const rawSig = AldeaCrypto.sign(Buffer.from(tx.serialize()), aPrivateKey)
      const sig = new Signature(aPubKey, rawSig)
      tx.addSignature(sig)

      const anotherPrivKey = AldeaCrypto.randomPrivateKey()
      const rawSig2 = AldeaCrypto.sign(Buffer.from(tx.serialize()), anotherPrivKey)
      const sig2 = new Signature(AldeaCrypto.publicKeyFromPrivateKey(anotherPrivKey), rawSig2)
      tx.addSignature(sig2)
      expect(tx.isCorrectlySigned()).to.eql(false)
    })

    it('when the right keys are there and the correct signatures are provided returns true', () => {
      const tx = new Transaction()
        .add(new LoadInstruction('someLocation'))
        .add(new UnlockInstruction(0, aPubKey))
      const rawSig = AldeaCrypto.sign(Buffer.from(tx.serialize()), aPrivateKey)
      const sig = new Signature(aPubKey, rawSig)
      tx.addSignature(sig)

      expect(tx.isCorrectlySigned()).to.eql(true)
    })


    it('when the public keys are different instances works as expected', () => {
      const tx = new Transaction()
        .add(new LoadInstruction('someLocation'))
        .add(new UnlockInstruction(0, Buffer.from(aPubKey)))
      const rawSig = AldeaCrypto.sign(Buffer.from(tx.serialize()), aPrivateKey)
      const sig = new Signature(aPubKey, rawSig)
      tx.addSignature(sig)

      expect(tx.isCorrectlySigned()).to.eql(true)
    })
  })

  describe('ed25519', function () {
    it.skip('can create a public key, a private key and and a signature', () => {
      ed.utils.sha512Sync = (...m) => {
        const hash = createHash('sha512')
        hash.update(ed.utils.concatBytes(...m))
        return hash.digest()
      };

      for (let i = 0; i < 500; i++) {
        const privateKey = ed.utils.randomPrivateKey();
        const message = Uint8Array.from([0xab, 0xbc, 0xcd, 0xde]);
        const publicKey = ed.sync.getPublicKey(privateKey);
        const signature = ed.sync.sign(message, privateKey);
        ed.sync.verify(signature, message, publicKey);
      }
    })
  })
})
