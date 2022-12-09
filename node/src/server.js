import express from 'express'
import cors from 'cors'
import statuses from 'http-status'

import { buildVm } from "./build-vm.js"
import { HttpNotFound } from "./errors.js"
import { Tx } from '@aldea/sdk-js'
import asyncHandler from 'express-async-handler'
import { Address, base16 } from "@aldea/sdk-js"
import { abiToCbor, abiToJson } from "@aldea/compiler/abi"
import { CBOR, Sequence } from "cbor-redux"


const serializeJigState = (jigState) => {
  const lock = jigState.serializedLock
  return {
    jig_id: base16.encode(jigState.id.toBuffer()),
    jig_ref: base16.encode(jigState.digest()),
    pkg_id: base16.encode(jigState.packageId),
    class_id: base16.encode(jigState.classId()),
    lock: {
      type: lock.type,
      data: lock.data ? base16.encode(lock.data) : null
    },
    state_hex: base16.encode(jigState.stateBuf)
  }
}

const serializeTxExec = (txExec) => {
  return {
    rawTx: txExec.tx.toBytes(),
    txid: txExec.tx.id,
    deploys: txExec.deployments.map((packageId) => {
      const data = storage.getModule(packageId)
      return {
        files: data.sources.entries().map(([key, value]) => { return { name: key, content: value } }),
        entries: data.entries,
        package_id: Buffer.from(packageId).toString('hex')
      }
    }),
    outputs: txExec.outputs.map(o => serializeJigState(o))
  }
}

const buildApp = () => {
  const { vm, storage } = buildVm()

  const app = express()

  app.use(express.json())
  app.use(express.raw())
  app.use(cors())

  app.get('/status', (req, res) => {
    res.send({ok: true})
  })

  app.post('/tx', asyncHandler(async (req, res) => {
    const tx = Tx.fromBytes(new Uint8Array(req.body))
    const txResult = await vm.execTx(tx)
    res.send(serializeTxExec(txResult))
  }))

  app.get('/tx/:txid', (req, res) => {
    const txid = req.params.txid
    const exec = storage.getTransaction(txid)
    if (!exec) {
      throw new HttpNotFound(`unknown tx: ${txid}`)
    }
    res.status(200).send(serializeTxExec(exec))
  })

  app.get('/rawtx/:txid', (req, res) => {
    const txid = req.params.txid
    const exec = storage.getTransaction(txid)
    if (!exec) {
      throw new HttpNotFound(`unknown tx: ${txid}`)
    }
    res.set('content-type', 'application/octet-stream')
    res.status(200).send(Buffer.from(exec.tx.toBytes()))
  })

  app.get('/state/:location', (req, res) => {
    const location = req.params.location
    const state = storage.getJigStateByReference(base16.decode(location), () => { throw new HttpNotFound(`state not found: ${location}`, { location })})
    const wasm = vm.createWasmInstance(state.packageId)
    res.send({
      state: state.objectState(wasm)
    })
  })

  app.get('/output/:jigRef', (req, res) => {
    const location = req.params.jigRef
    const jigState = storage.getJigStateByOrigin(base16.decode(location), () => { throw new HttpNotFound(`${location} not found`, {location})})
    res.status(200).send(serializeJigState(jigState))
  })

  app.post('/mint', asyncHandler(async (req, res) => {
    const { address, amount } = req.body
    const state = vm.mint(Address.fromString(address), amount)
    res.status(200).json(serializeJigState(state))
  }))

  app.get('/package/:packageId/abi.:format', (req, res) => {
    const {packageId, format} = req.params
    const data = storage.getModule(base16.decode(packageId))
    if (!data) {
      throw new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId })
    }
    if (format === 'json' || !format) {
      res.set('application-type', 'application/json')
      res.status(200).send(abiToJson(data.abi))
    } else if (format === 'cbor') {
      res.set('application-type', 'application/cbor')
      res.status(200).send(abiToCbor(data.abi))
    } else {
      throw new Error(`unknown format: ${format}`)
    }
  })

  app.get('/package/:packageId/source', (req, res) => {
    const {packageId} = req.params
    const data = storage.getModule(base16.decode(packageId))
    if (!data) {
      throw new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId })
    }
    const cborData = CBOR.encode(new Sequence([data.entries, data.sources]));
    res.set('content-type', 'application/cbor-seq')
    res.send(Buffer.from(cborData))
  })

  app.get('/package/:packageId/wasm', (req, res) => {
    const {packageId} = req.params
    const data = storage.getModule(base16.decode(packageId))
    if (!data) {
      throw new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId })
    }
    res.set('content-type', 'application/wasm')
    res.send(Buffer.from(data.wasmBin))
  })

  app.use((err, req, res, _next) => {
    if (err instanceof HttpNotFound) {
      res.status(statuses.NOT_FOUND)
      res.send({
        message: err.message,
        code: 'NOT_FOUND',
        data: err.data
      })
    } else {
      res.status(statuses.BAD_REQUEST)
      res.send({
        message: err.message,
        code: 'unknown error'
      })
    }
  })
  return { app, vm, storage }
}


export { buildApp }
