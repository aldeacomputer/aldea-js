import { expect } from "chai"
import request from 'supertest'
import { buildApp } from "../src/server.js"
import { PrivKey, TxBuilder } from "@aldea/sdk-js"
import { base16, Location } from "@aldea/sdk-js/src/index.js"

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
  describe('GET /status', function () {
    it('works', async () => {
      const response = await request(app)
        .get('/status')
        .expect(200)
        .expect('Content-Type', /application\/json/)
      expect(response.body).to.eql({ok: true})
    })
  })

  describe('POST /tx', () => {
    let tx
    beforeEach(() => {
      const fundLocation = vm.mint(userAddr, 1000)
      tx = new TxBuilder()
        .import('0e69be258ecd7d4e747f07dcfc7df8edbf4970d9a91a04626f5ba7f826c65af6')
        .new(0, 0, [])
        .lock(1, userAddr)
        .load(fundLocation.toUintArray())
        .fund(3)
        .lock(3, userAddr)
        .sign(userPriv)
        .build()
    })

    it('returns 200 and json', async () => {
      await request(app)
        .post('/tx')
        .send(Buffer.from(tx.toBytes()))
        .set('content-type', 'application/octet-stream')
        .expect(200)
        .expect('content-type', /application\/json/)
    })

    it('returns correct body', async () => {
      const res = await request(app)
        .post('/tx')
        .send(Buffer.from(tx.toBytes()))
        .set('content-type', 'application/octet-stream')

      expect(res.body.deploys).to.eql([])
      const jigLoc1 = new Location(tx.hash, 0)
      // const jigLoc2 = new Location(tx.hash, 0)
      expect(res.body.outputs).to.eql([
        {
          jig_id: base16.encode(Buffer.concat([jigLoc1.toBuffer(), Buffer.alloc(4).fill(0)])),
          jig_ref: "string",
          pkg_id: "string",
          class_id: "string",
          lock: { type: 1, data: "string" },
          state_hex: "hex",
        }
      ])
    })

  })
})
