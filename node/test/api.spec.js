import { expect } from "chai"
import request from 'supertest'
import { buildApp } from "../src/server.js"
import {Pointer, base16, Tx, PrivKey, instructions, ed25519, Address} from "@aldea/sdk-js"
import { StubClock } from "@aldea/vm"

const {
  ImportInstruction,
  NewInstruction,
  LockInstruction,
  LoadInstruction,
  FundInstruction,
  SignInstruction,
  DeployInstruction
} = instructions

const FLOCK_PKG_ID = '49c702e830ed729df6b14d226cfdb83f149e4ed0869c75504a809ccaa0c8af13'

describe('api', () => {
  let app
  let vm
  let clock = new StubClock()

  beforeEach(() => {

    const builded = buildApp(clock)
    app = builded.app
    vm = builded.vm
  })

  const userPriv = PrivKey.fromRandom()
  const userAddr = userPriv.toPubKey().toAddress()

  async function mint () {
    const response = await request(app)
      .post('/mint')
      .send({ address: userAddr.toString(), amount: 1000 })
      .expect(200)
      .expect('Content-Type', /application\/json/)
    return base16.decode(response.body.id)
  }


  describe('GET /status', function () {
    it('works', async () => {
      const response = await request(app)
        .get('/status')
        .expect(200)
        .expect('Content-Type', /application\/json/)
      expect(response.body).to.eql({ok: true})
    })
  })


  describe('POST /tx', function () {
    it('returns correct data when the tx goes trough', async () => {
      const coinId = await mint()
      const tx = new Tx()
        .push(new ImportInstruction(base16.decode(FLOCK_PKG_ID)))
        .push(new NewInstruction(0, 0, []))
        .push(new LockInstruction(1, userAddr.hash))
        .push(new LoadInstruction(coinId))
        .push(new FundInstruction(3))

      const sig = tx.createSignature(userPriv)
      tx.push(new SignInstruction(sig, userPriv.toPubKey().toBytes()))

      const response = await request(app)
        .post('/tx')
        .send(Buffer.from(tx.toBytes()))
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/json/)
        .expect(200)

      expect(response.body).to.have.keys(['id', 'rawtx', 'packages', 'outputs', 'executed_at'])
      expect(response.body.id).to.eql(tx.id)
      expect(response.body.executed_at).to.eql(clock.now().unix())
      expect(response.body.outputs).to.have.length(2)
      expect(response.body.outputs[0].location).to.eql(new Pointer(tx.id, 0).toString())
      expect(response.body.outputs[0].origin).to.eql(new Pointer(tx.id, 0).toString())
      expect(response.body.packages).to.have.length(0)
      expect(response.body.rawtx).to.eql(tx.toHex())
    })

    it('fails when a module does not exist', async () => {
      const coinId = await mint()
      const tx = new Tx()
        .push(new ImportInstruction(base16.decode(Buffer.alloc(32).fill(0).toString('hex')))) //
        .push(new NewInstruction(0, 0, []))
        .push(new LockInstruction(1, userAddr.hash))
        .push(new LoadInstruction(coinId))
        .push(new FundInstruction(3))

      const sig = tx.createSignature(userPriv)
      tx.push(new SignInstruction(sig, userPriv.toPubKey().toBytes()))

      const response = await request(app)
        .post('/tx')
        .send(Buffer.from(tx.toBytes()))
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/json/)
        .expect(400)

      expect(response.body).to.have.keys(['code', 'message'])
      expect(response.body.code).to.eql('BAD_REQUEST')
    })
  })

  describe('GET /tx/:txid', () => {
    let txid
    beforeEach(async () => {
      const coinId = await mint()
      const tx = new Tx()
        .push(new ImportInstruction(base16.decode(FLOCK_PKG_ID)))
        .push(new NewInstruction(0, 0, []))
        .push(new LockInstruction(1, userAddr.hash))
        .push(new LoadInstruction(coinId))
        .push(new FundInstruction(3))
      const sig = tx.createSignature(userPriv)
      tx.push(new SignInstruction(sig, userPriv.toPubKey().toBytes()))
      txid = tx.id

      await request(app)
        .post('/tx')
        .send(Buffer.from(tx.toBytes()))
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/json/)
        .expect(200)
    })
    it('returns correct data', async () => {
      const response = await request(app)
        .get(`/tx/${txid}`)
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/json/)
        .expect(200)

      expect(response.body).to.have.keys(['id', 'rawtx', 'packages', 'outputs', 'executed_at'])
      expect(response.body.id).to.eql(txid)
      expect(response.body.executed_at).to.eql(clock.now().unix())
      expect(response.body.outputs).to.have.length(2)
      expect(response.body.outputs[0].location).to.eql(new Pointer(txid, 0).toString())
      expect(response.body.outputs[0].origin).to.eql(new Pointer(txid, 0).toString())
      expect(response.body.packages).to.have.length(0)
    })

    it('fails when tx does not exists', async () => {
      const response = await request(app)
        .get(`/tx/${Buffer.alloc(32).fill(0).toString('hex')}`)
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/json/)
        .expect(404)

      expect(response.body).to.have.keys(['code', 'message', 'data'])
      expect(response.body.code).to.eql('NOT_FOUND')
      expect(response.body.message).to.eql('unknown tx: 0000000000000000000000000000000000000000000000000000000000000000')
      expect(response.body.data).to.eql({ txid: '0000000000000000000000000000000000000000000000000000000000000000' })
    })
  })

  describe('GET /rawtx/:txid', () => {
    let tx
    beforeEach(async () => {
      const coinId = await mint()
      tx = new Tx()
        .push(new ImportInstruction(base16.decode(FLOCK_PKG_ID)))
        .push(new NewInstruction(0, 0, []))
        .push(new LockInstruction(1, userAddr.hash))
        .push(new LoadInstruction(coinId))
        .push(new FundInstruction(3))
      const sig = tx.createSignature(userPriv)
      tx.push(new SignInstruction(sig, userPriv.toPubKey().toBytes()))

      await request(app)
        .post('/tx')
        .send(Buffer.from(tx.toBytes()))
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/json/)
        .expect(200)
    })
    it('returns correct data', async () => {
      const response = await request(app)
        .get(`/rawtx/${tx.id}`)
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/octet-stream/)
        .expect(200)

      expect(response.body).to.eql(Buffer.from(tx.toBytes()))
    })

    it('fails when tx does not exists', async () => {
      const response = await request(app)
        .get(`/rawtx/${Buffer.alloc(32).fill(0).toString('hex')}`)
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/json/)
        .expect(404)

      expect(response.body).to.have.keys(['code', 'message', 'data'])
      expect(response.body.code).to.eql('NOT_FOUND')
      expect(response.body.message).to.eql('unknown tx: 0000000000000000000000000000000000000000000000000000000000000000')
      expect(response.body.data).to.eql({ txid: '0000000000000000000000000000000000000000000000000000000000000000' })
    })
  })


  describe('when a tx already exists', () => {
    let outputs
    beforeEach(async () => {
      const coinId = await mint()
      const tx = new Tx()
        .push(new ImportInstruction(base16.decode(FLOCK_PKG_ID)))
        .push(new NewInstruction(0, 0, []))
        .push(new LockInstruction(1, userAddr.hash))
        .push(new LoadInstruction(coinId))
        .push(new FundInstruction(3))
      const sig = tx.createSignature(userPriv)
      tx.push(new SignInstruction(sig, userPriv.toPubKey().toBytes()))

      const response = await request(app)
        .post('/tx')
        .send(Buffer.from(tx.toBytes()))
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/json/)
        .expect(200)

      outputs = response.body.outputs
    })

    describe('GET /state/:outputid', () => {
      it('returns parsed state', async () => {
        const response = await request(app)
          .get(`/state/${outputs[0].id}`)
          .expect('Content-Type', /application\/json/)
          .expect(200)

        expect(response.body).to.eql({ state: { size: 0, identifier: 'numero11' } })
      })

      it('fails when output does not exists', async () => {
        const response = await request(app)
          .get(`/state/${Buffer.alloc(32).fill(0).toString('hex')}`)
          .expect('Content-Type', /application\/json/)
          .expect(404)

        expect(response.body).to.have.keys(['code', 'message', 'data'])
        expect(response.body.code).to.eql('NOT_FOUND')
        expect(response.body.message).to.eql('state not found: 0000000000000000000000000000000000000000000000000000000000000000')
        expect(response.body.data).to.eql({ outputId: '0000000000000000000000000000000000000000000000000000000000000000' })
      })
    })

    describe('GET /output/:id', function () {
      it('returns the output', async () => {
        const response = await request(app)
          .get(`/output/${outputs[0].id}`)
          .expect('Content-Type', /application\/json/)
          .expect(200)

        expect(response.body).to.have.keys(['id', 'origin', 'location', 'class', 'lock', 'state', 'created_at'])
        expect(response.body.id).to.eql(outputs[0].id)
        expect(response.body.origin).to.eql(outputs[0].origin)
        expect(response.body.location).to.eql(outputs[0].location)
        expect(response.body.class).to.eql(outputs[0].class)
        expect(response.body.lock).to.eql(outputs[0].lock)
        expect(response.body.state).to.eql(outputs[0].state)
        expect(response.body.created_at).to.eql(clock.now().unix())
      })

      it('returns not found when does not exists', async () => {
        const response = await request(app)
          .get(`/output/${new Array(64).fill('0').join('')}`)
          .expect('Content-Type', /application\/json/)
          .expect(404)

        expect(response.body).to.have.keys(['code', 'message', 'data'])
        expect(response.body.code).to.eql('NOT_FOUND')
        expect(response.body.message).to.eql('0000000000000000000000000000000000000000000000000000000000000000 not found')
        expect(response.body.data).to.eql({ outputId: '0000000000000000000000000000000000000000000000000000000000000000' })
      })
    });

    describe('GET /utxos-by-address', () => {
      it('empty list when it does not exist', async () => {
        const response = await request(app)
          .get(`/utxos-by-address/${PrivKey.fromRandom().toPubKey().toAddress()}`)
          .expect('Content-Type', /application\/json/)
          .expect(200)

        expect(response.body).to.eql([])
      })

      it('outputs belonging to that address', async () => {
        const response = await request(app)
          .get(`/utxos-by-address/${new Address(base16.decode(outputs[0].lock.data)).toString()}`)
          .expect('Content-Type', /application\/json/)
          .expect(200)

        expect(response.body).to.have.length(1)
        expect(response.body[0].id).to.eql(outputs[0].id)
      })
    })

    describe('GET /output-by-origin/:origin', function () {
      it('returns the output by origin', async () => {
        const response = await request(app)
          .get(`/output-by-origin/${outputs[0].origin}`)
          .expect('Content-Type', /application\/json/)
          .expect(200)

        expect(response.body).to.have.keys(['id', 'origin', 'location', 'class', 'lock', 'state', 'created_at'])
        expect(response.body.id).to.eql(outputs[0].id)
        expect(response.body.origin).to.eql(outputs[0].origin)
        expect(response.body.location).to.eql(outputs[0].location)
        expect(response.body.class).to.eql(outputs[0].class)
        expect(response.body.lock).to.eql(outputs[0].lock)
        expect(response.body.state).to.eql(outputs[0].state)
        expect(response.body.created_at).to.eql(clock.now().unix())
      })

      it('returns not found when does not exists', async () => {
        let fakeTxid = new Array(64).fill('0').join('');
        const response = await request(app)
          .get(`/output-by-origin/${fakeTxid}_0`)
          .expect('Content-Type', /application\/json/)
          .expect(404)

        expect(response.body).to.have.keys(['code', 'message', 'data'])
        expect(response.body.code).to.eql('NOT_FOUND')
        expect(response.body.message).to.eql('0000000000000000000000000000000000000000000000000000000000000000_0 not found')
        expect(response.body.data).to.eql({ origin: '0000000000000000000000000000000000000000000000000000000000000000_0' })
      })
    })
  })

  describe('POST /util', () => {
    it('returns proper data', async () => {
      const response = await request(app)
        .post('/mint')
        .send({ address: userAddr.toString(), amount: 1000 })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body).to.have.keys(['id', 'origin', 'location', 'class', 'lock', 'state', 'created_at'])
      expect(response.body.class).to.eql(`${new Array(64).fill('0').join('')}_0`)
    })

    it('fails address is not an address', async () => {
      const response = await request(app)
        .post('/mint')
        .send({ address: 'notanaddress', amount: 1000 })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body).to.have.keys(['message', 'code'])
      expect(response.body.code).to.eql('BAD_REQUEST')
    })

    it('fails when amount is not present', async () => {
      const response = await request(app)
        .post('/mint')
        .send({ address: 'notanaddress' })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body).to.have.keys(['message', 'code'])
      expect(response.body.code).to.eql('BAD_REQUEST')
    })
  })

  describe('GET /package/:packageId/abi.:format', () => {
    const pkgId = FLOCK_PKG_ID
    it('when type is json returns a json', async () => {
      const response = await request(app)
        .get(`/package/${pkgId}/abi.json`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body).to.have.keys(['version', 'exports', 'objects', 'typeIds', 'imports'])
    })

    it('when type is cbor returns a cbor', async () => {
      await request(app)
        .get(`/package/${pkgId}/abi.cbor`)
        .expect(200)
        .expect('Content-Type', /application\/cbor/)
    })

    it('returns not found when does not exist', async () => {
      await request(app)
        .get(`/package/${new Array(64).fill('1').join('')}/abi.json`)
        .expect(404)
        .expect('Content-Type', /application\/json/)
    })

    it('returns not found when does not exist and format is cbor', async () => {
      await request(app)
        .get(`/package/${new Array(64).fill('1').join('')}/abi.cbor`)
        .expect(404)
        .expect('Content-Type', /application\/json/)
    })

  })

  describe('GET /package/:packageId/source', () => {
    const pkgId = FLOCK_PKG_ID
    it('returns right data', async () => {
      await request(app)
        .get(`/package/${pkgId}/source`)
        .expect(200)
        .expect('Content-Type', /application\/cbor/)

      // expect(response.body).to.have.keys(['version', 'exports', 'objects', 'typeIds', 'imports'])
    })

    it('not found when not found', async () => {
      await request(app)
        .get(`/package/${base16.encode(ed25519.randomBytes(32))}/source`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      // expect(response.body).to.have.keys(['version', 'exports', 'objects', 'typeIds', 'imports'])
    })

  })

  describe('GET /package/:packageId/docs', () => {
    let pkgId
    beforeEach(async () => {
      const coinId = await mint()
      const tx = new Tx()
      tx.push(new LoadInstruction(coinId))
      tx.push(new FundInstruction(0))
      const entry = 'entry.ts'
      const code = `
        /**
         * This class has docs
         */
        export class SomeClass extends Jig {
          /**
           * This method also has docs
           */
          m1(): u32 {
            return 42
          }
        }
      `.trim()
      tx.push(new DeployInstruction([entry], new Map([[entry, code]])))
      const sig = tx.createSignature(userPriv)
      tx.push(new SignInstruction(sig, userPriv.toPubKey().toBytes()))

      const response = await request(app)
        .post('/tx')
        .set('content-type', 'application/octet-stream')
        .send(Buffer.from(tx.toBytes()))
        .expect(200)
      pkgId = response.body.packages[0].id
    })
    it('returns right data', async () => {
      const response = await request(app)
        .get(`/package/${pkgId}/docs`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body).to.have.keys(['docs'])
      expect(response.body.docs).to.have.keys(['SomeClass', 'SomeClass$m1'])
    })

  })

  describe('GET /package/:packageId/wasm', () => {
    const pkgId = FLOCK_PKG_ID
    it('returns right data', async () => {
      await request(app)
        .get(`/package/${pkgId}/source`)
        .expect(200)
        .expect('Content-Type', /application\/cbor-seq/)

      // expect(response.body).to.have.keys(['version', 'exports', 'objects', 'typeIds', 'imports'])
    })

  })
})
