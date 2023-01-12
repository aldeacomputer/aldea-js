import { expect } from "chai"
import request from 'supertest'
import { buildApp } from "../src/server.js"
import { Pointer, base16, Tx, PrivKey, instructions } from "@aldea/sdk-js"

const {
  ImportInstruction,
  NewInstruction,
  LockInstruction,
  LoadInstruction,
  FundInstruction,
  SignInstruction
} = instructions

describe('api', () => {
  let app
  let vm

  beforeEach(() => {
    const builded = buildApp()
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
        .push(new ImportInstruction(base16.decode('1c5b14e355d72b5bad40959442e7b5764147c7be72c01069770bb2afd23f1eda')))
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

      expect(response.body).to.have.keys(['id', 'rawtx', 'packages', 'outputs'])
      expect(response.body.id).to.eql(tx.id)
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
        .push(new ImportInstruction(base16.decode('1c5b14e355d72b5bad40959442e7b5764147c7be72c01069770bb2afd23f1eda')))
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
      expect(response.body.message).to.eql('unknown tx: 0000000000000000000000000000000000000000000000000000000000000000')
      expect(response.body.data).to.eql({ txid: '0000000000000000000000000000000000000000000000000000000000000000' })
    })
  })

  describe('GET /rawtx/:txid', () => {
    let tx
    beforeEach(async () => {
      const coinId = await mint()
      tx = new Tx()
        .push(new ImportInstruction(base16.decode('1c5b14e355d72b5bad40959442e7b5764147c7be72c01069770bb2afd23f1eda')))
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


  describe('GET /state/:outputid', () => {
    let outputs
    beforeEach(async () => {
      const coinId = await mint()
      const tx = new Tx()
        .push(new ImportInstruction(base16.decode('1c5b14e355d72b5bad40959442e7b5764147c7be72c01069770bb2afd23f1eda')))
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

    it('returns parsed state', async () => {
      const response = await request(app)
        .get(`/state/${outputs[0].id}`)
        .expect('Content-Type', /application\/json/)
        .expect(200)

      expect(response.body).to.eql({ state: { size: 0 } })
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


  // describe('POST /tx', () => {
  //   let tx
  //   beforeEach(() => {
  //     const fundLocation = vm.mint(userAddr, 1000)
  //     tx = new TxBuilder()
  //       .import('0e69be258ecd7d4e747f07dcfc7df8edbf4970d9a91a04626f5ba7f826c65af6')
  //       .new(0, 0, [])
  //       .lock(1, userAddr)
  //       .load(fundLocation.toUintArray())
  //       .fund(3)
  //       .lock(3, userAddr)
  //       .sign(userPriv)
  //       .build()
  //   })
  //
  //   it('returns 200 and json', async () => {
  //     await request(app)
  //       .post('/tx')
  //       .send(Buffer.from(tx.toBytes()))
  //       .set('content-type', 'application/octet-stream')
  //       .expect(200)
  //       .expect('content-type', /application\/json/)
  //   })
  //
  //   it('returns correct body', async () => {
  //     const res = await request(app)
  //       .post('/tx')
  //       .send(Buffer.from(tx.toBytes()))
  //       .set('content-type', 'application/octet-stream')
  //
  //     expect(res.body.deploys).to.eql([])
  //     const jigLoc1 = new Location(tx.hash, 0)
  //     // const jigLoc2 = new Location(tx.hash, 0)
  //     expect(res.body.outputs).to.eql([
  //       {
  //         jig_id: base16.encode(Buffer.concat([jigLoc1.toBuffer(), Buffer.alloc(4).fill(0)])),
  //         jig_ref: "string",
  //         pkg_id: "string",
  //         class_id: "string",
  //         lock: { type: 1, data: "string" },
  //         state_hex: "hex",
  //       }
  //     ])
  //   })
  //
  // })
})
