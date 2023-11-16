import { expect } from 'chai'
import request from 'supertest'
import { BCS, Pointer, Tx, PrivKey, instructions, Address, base16, ed25519, util } from '@aldea/core'
import { buildApp } from '../dist/server.js'

const {
  ImportInstruction,
  NewInstruction,
  LockInstruction,
  LoadInstruction,
  FundInstruction,
  SignInstruction,
  DeployInstruction
} = instructions

const NFT_PKG_ID = '446f2f5ebbcbd8eb081d207a67c1c9f1ba3d15867c12a92b96e7520382883846'

describe('api', () => {
  let app
  let storage

  beforeEach(async () => {
    const built = await buildApp()
    app = built.app
    storage = built.storage
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
      expect(response.body).to.eql({ ok: true })
    })
  })

  describe('POST /tx', function () {
    it('returns correct data when the tx goes trough', async () => {
      const nftPkg = storage.getPkg(NFT_PKG_ID).get()
      const bcs = new BCS(nftPkg.abi)
      const coinId = await mint()
      const tx = new Tx()
        .push(new ImportInstruction(base16.decode(NFT_PKG_ID)))
        .push(new NewInstruction(0, 0, bcs.encode('NFT_constructor', ['someNft', 0, 'file://nft.png'])))
        .push(new LockInstruction(1, userAddr.hash))
        .push(new LoadInstruction(coinId))
        .push(new FundInstruction(3))
        .push(new SignInstruction(new Uint8Array(), userPriv.toPubKey().toBytes()))

      tx.instructions[5].sig = ed25519.sign(tx.sighash(), userPriv)

      const response = await request(app)
        .post('/tx')
        .send(Buffer.from(tx.toBytes()))
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/json/)
        .expect(200)

      expect(response.body).to.have.keys(['id', 'rawtx', 'packages', 'outputs'])
      expect(response.body.id).to.eql(tx.id)
      expect(response.body.outputs).to.have.length(2)
      expect(response.body.outputs[0].location).to.eql(new Pointer(tx.id, 0).toString())
      expect(response.body.outputs[0].origin).to.eql(new Pointer(tx.id, 0).toString())
      expect(response.body.packages).to.have.length(0)
      expect(response.body.rawtx).to.eql(tx.toHex())
    })

    it('fails when a module does not exist', async () => {
      const nftPkg = storage.getPkg(NFT_PKG_ID).get()
      const bcs = new BCS(nftPkg.abi)
      const coinId = await mint()
      const tx = new Tx()
        .push(new ImportInstruction(base16.decode(Buffer.alloc(32).fill(42).toString('hex')))) //
        .push(new NewInstruction(0, 0, bcs.encode('NFT_constructor', ['someNft', 0, 'file://nft.png'])))
        .push(new LockInstruction(1, userAddr.hash))
        .push(new LoadInstruction(coinId))
        .push(new FundInstruction(3))
        .push(new SignInstruction(new Uint8Array(), userPriv.toPubKey().toBytes()))

      tx.instructions[5].sig = ed25519.sign(tx.sighash(), userPriv)

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
      const nftPkg = storage.getPkg(NFT_PKG_ID).get()
      const bcs = new BCS(nftPkg.abi)
      const coinId = await mint()
      const tx = new Tx()
        .push(new ImportInstruction(base16.decode(NFT_PKG_ID)))
        .push(new NewInstruction(0, 0, bcs.encode('NFT_constructor', ['someNft', 0, 'file://nft.png'])))
        .push(new LockInstruction(1, userAddr.hash))
        .push(new LoadInstruction(coinId))
        .push(new FundInstruction(3))
        .push(new SignInstruction(new Uint8Array(), userPriv.toPubKey().toBytes()))

      tx.instructions[5].sig = ed25519.sign(tx.sighash(), userPriv)
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

      expect(response.body).to.have.keys(['id', 'rawtx', 'packages', 'outputs'])
      expect(response.body.id).to.eql(txid)
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
      expect(response.body.message).to.eql('Exec result not found for tx id: 0000000000000000000000000000000000000000000000000000000000000000')
      expect(response.body.data).to.eql({ txid: '0000000000000000000000000000000000000000000000000000000000000000' })
    })
  })

  describe('GET /rawtx/:txid', () => {
    let tx
    beforeEach(async () => {
      const nftPkg = storage.getPkg(NFT_PKG_ID).get()
      const bcs = new BCS(nftPkg.abi)
      const coinId = await mint()
      tx = new Tx()
        .push(new ImportInstruction(base16.decode(NFT_PKG_ID)))
        .push(new NewInstruction(0, 0, bcs.encode('NFT_constructor', ['someNft', 0, 'file://nft.png'])))
        .push(new LockInstruction(1, userAddr.hash))
        .push(new LoadInstruction(coinId))
        .push(new FundInstruction(3))
        .push(new SignInstruction(new Uint8Array(), userPriv.toPubKey().toBytes()))

      tx.instructions[5].sig = ed25519.sign(tx.sighash(), userPriv)

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
      expect(response.body.message).to.eql('Tx not found for id: 0000000000000000000000000000000000000000000000000000000000000000')
      expect(response.body.data).to.eql({ txid: '0000000000000000000000000000000000000000000000000000000000000000' })
    })
  })

  describe('when a tx already exists', () => {
    let outputs
    beforeEach(async () => {
      const nftPkg = storage.getPkg(NFT_PKG_ID).get()
      const bcs = new BCS(nftPkg.abi)
      const coinId = await mint()
      const tx = new Tx()
        .push(new ImportInstruction(base16.decode(NFT_PKG_ID)))
        .push(new NewInstruction(0, 0, bcs.encode('NFT_constructor', ['someNft', 0, 'file://nft.png'])))
        .push(new LockInstruction(1, userAddr.hash))
        .push(new LoadInstruction(coinId))
        .push(new FundInstruction(3))
        .push(new SignInstruction(new Uint8Array(), userPriv.toPubKey().toBytes()))

      tx.instructions[5].sig = ed25519.sign(tx.sighash(), userPriv)

      const response = await request(app)
        .post('/tx')
        .send(Buffer.from(tx.toBytes()))
        .set('content-type', 'application/octet-stream')
        .expect('Content-Type', /application\/json/)
        .expect(200)

      outputs = response.body.outputs
    })

    // describe('GET /state/:outputid', () => {
    //   it('returns parsed state', async () => {
    //     const response = await request(app)
    //       .get(`/state/${outputs[0].id}`)
    //       .expect('Content-Type', /application\/json/)
    //       .expect(200)
    //
    //     expect(response.body).to.eql({ state: { name: 'someNft', rarity: 0, image: 'file://nft.png' } })
    //   })
    //
    //   it('fails when output does not exists', async () => {
    //     const response = await request(app)
    //       .get(`/state/${Buffer.alloc(32).fill(0).toString('hex')}`)
    //       .expect('Content-Type', /application\/json/)
    //       .expect(404)
    //
    //     expect(response.body).to.have.keys(['code', 'message', 'data'])
    //     expect(response.body.code).to.eql('NOT_FOUND')
    //     expect(response.body.message).to.eql('state not found: 0000000000000000000000000000000000000000000000000000000000000000')
    //     expect(response.body.data).to.eql({ outputId: '0000000000000000000000000000000000000000000000000000000000000000' })
    //   })
    // })

    describe('GET /output/:id', function () {
      it('returns the output', async () => {
        const response = await request(app)
          .get(`/output/${outputs[0].id}`)
          .expect('Content-Type', /application\/json/)
          .expect(200)

        expect(response.body).to.have.keys(['id', 'origin', 'location', 'class', 'lock', 'state'])
        expect(response.body.id).to.eql(outputs[0].id)
        expect(response.body.origin).to.eql(outputs[0].origin)
        expect(response.body.location).to.eql(outputs[0].location)
        expect(response.body.class).to.eql(outputs[0].class)
        expect(response.body.lock).to.eql(outputs[0].lock)
        expect(response.body.state).to.eql(outputs[0].state)
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
    })

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

        expect(response.body).to.have.keys(['id', 'origin', 'location', 'class', 'lock', 'state'])
        expect(response.body.id).to.eql(outputs[0].id)
        expect(response.body.origin).to.eql(outputs[0].origin)
        expect(response.body.location).to.eql(outputs[0].location)
        expect(response.body.class).to.eql(outputs[0].class)
        expect(response.body.lock).to.eql(outputs[0].lock)
        expect(response.body.state).to.eql(outputs[0].state)
      })

      it('returns not found when does not exists', async () => {
        const fakeTxid = new Array(64).fill('0').join('')
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

      expect(response.body).to.have.keys(['id', 'origin', 'location', 'class', 'lock', 'state'])
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
    const pkgId = NFT_PKG_ID
    it('when type is json returns a json', async () => {
      const response = await request(app)
        .get(`/package/${pkgId}/abi.json`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body).to.have.keys(['version', 'exports', 'imports', 'defs', 'typeIds'])
    })

    it('when type is bin returns a bin', async () => {
      await request(app)
        .get(`/package/${pkgId}/abi.bin`)
        .expect(200)
        .expect('Content-Type', /application\/octet-stream/)
    })

    it('returns not found when does not exist', async () => {
      await request(app)
        .get(`/package/${new Array(64).fill('1').join('')}/abi.json`)
        .expect(404)
        .expect('Content-Type', /application\/json/)
    })

    it('returns not found when does not exist and format is bin', async () => {
      await request(app)
        .get(`/package/${new Array(64).fill('1').join('')}/abi.bin`)
        .expect(404)
        .expect('Content-Type', /application\/json/)
    })
  })

  describe('GET /package/:packageId/source', () => {
    const pkgId = NFT_PKG_ID
    it('returns right data', async () => {
      await request(app)
        .get(`/package/${pkgId}/source`)
        .expect(200)
        .expect('Content-Type', /application\/octet-stream/)

      // expect(response.body).to.have.keys(['version', 'exports', 'objects', 'typeIds', 'imports'])
    })

    it('not found when not found', async () => {
      await request(app)
        .get(`/package/${base16.encode(util.randomBytes(32))}/source`)
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
      tx.push(new DeployInstruction(BCS.pkg.encode([[entry], new Map([[entry, code]])])))
      tx.push(new SignInstruction(new Uint8Array(), userPriv.toPubKey().toBytes()))
      tx.instructions[3].sig = ed25519.sign(tx.sighash(), userPriv)

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
      expect(response.body.docs).to.have.keys(['SomeClass', 'SomeClass_m1'])
    })
  })

  describe('GET /package/:packageId/wasm', () => {
    const pkgId = NFT_PKG_ID
    it('returns right data', async () => {
      await request(app)
        .get(`/package/${pkgId}/source`)
        .expect(200)
        .expect('Content-Type', /application\/octet-stream/)

      // expect(response.body).to.have.keys(['version', 'exports', 'objects', 'typeIds', 'imports'])
    })
  })
})
