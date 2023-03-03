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
import { Pointer } from "@aldea/sdk-js"
import { CompileError } from "@aldea/compiler"
import morgan from 'morgan'

const buildApp = (clock) => {
  const { vm, storage } = buildVm(clock)

  const serializeJigState = (jigState) => {
    const lock = jigState.serializedLock
    return {
      id: base16.encode(jigState.id()),
      origin: jigState.origin.toString(),
      location: jigState.currentLocation.toString(),
      class: jigState.classId().toString(),
      lock: {
        type: lock.type,
        data: lock.data ? base16.encode(lock.data) : ''
      },
      state: base16.encode(jigState.stateBuf),
      created_at: jigState.createdAt
    }
  }

  const serializeExecResult = (txExec) => {
    return {
      id: txExec.tx.id,
      rawtx: txExec.tx.toHex(),
      packages: txExec.deploys.map((pkg) => {
        const pkgId = base16.encode(pkg.hash)
        const data = storage.getModule(pkg.hash, () => {

          throw new HttpNotFound(`Unknown package: ${pkgId}`, { pkg_id: pkgId })
        })
        return {
          id: pkgId,
          files: Array.from(data.sources.entries()).map(([key, value]) => { return { name: key, content: value } }),
          entries: data.entries
        }
      }),
      outputs: txExec.outputs.map(o => serializeJigState(o)),
      executed_at: txExec.executedAt
    }
  }

  const app = express()

  app.use(morgan('tiny'))
  app.use(express.json())
  app.use(express.raw())
  app.use(cors())

  app.get('/status', (req, res) => {
    res.send({ok: true})
  })

  app.post('/tx', asyncHandler(async (req, res) => {
    const tx = Tx.fromBytes(new Uint8Array(req.body))
    const txResult = await vm.execTx(tx)
    res.send(serializeExecResult(txResult))
  }))

  app.get('/tx/:txid', (req, res) => {
    const txid = req.params.txid
    const exec = storage.getTransaction(txid)
    if (!exec) {
      throw new HttpNotFound(`unknown tx: ${txid}`, { txid })
    }
    res.status(200).send(serializeExecResult(exec))
  })

  app.get('/rawtx/:txid', (req, res) => {
    const txid = req.params.txid
    const exec = storage.getTransaction(txid)
    if (!exec) {
      throw new HttpNotFound(`unknown tx: ${txid}`, { txid })
    }
    res.set('content-type', 'application/octet-stream')
    res.status(200).send(Buffer.from(exec.tx.toBytes()))
  })

  app.get('/state/:outputId', (req, res) => {
    const outputId = req.params.outputId
    const state = storage.getHistoricalUtxo(
      base16.decode(outputId),
      () => { throw new HttpNotFound(`state not found: ${outputId}`, { outputId })}
    )
    const wasm = vm.wasmForPackageId(state.packageId)
    res.send({
      state: state.objectState(wasm)
    })
  })

  app.get('/output/:outputId', (req, res) => {
    const outputId = req.params.outputId
    const jigState = storage.getHistoricalUtxo(
      base16.decode(outputId),
      () => { throw new HttpNotFound(`${outputId} not found`, { outputId })}
    )
    res.status(200).send(serializeJigState(jigState))
  })

  app.get('/output-by-origin/:origin', (req, res) => {
    const origin = req.params.origin
    const jigState = storage.getJigStateByOrigin(
      Pointer.fromString(origin),
      () => { throw new HttpNotFound(`${origin} not found`, { origin })})
    res.status(200).send(serializeJigState(jigState))
  })

  app.get('/utxos-by-address/:address', (req, res) => {
    const addressStr = req.params.address
    const address = Address.fromString(addressStr)
    res.send(
      storage.utxosForAddress(address).map(u => serializeJigState(u))
    )
  })

  app.post('/mint', asyncHandler(async (req, res) => {
    const { address, amount } = req.body
    const state = vm.mint(Address.fromString(address), amount)
    res.status(200).json(serializeJigState(state))
  }))

  app.get('/package/:packageId/abi.:format', (req, res) => {
    const {packageId, format} = req.params

    const data = storage.getModule(base16.decode(packageId), (pkgId) => {
      throw new HttpNotFound(`package with id ${pkgId} not found`, { package_id: packageId })
    })
    if (!data) {

    }
    if (format === 'json' || !format) {
      res.set('content-type', 'application/json')
      res.status(200).send(abiToJson(data.abi))
    } else if (format === 'cbor') {
      res.set('content-type', 'application/cbor')
      res.status(200).send(abiToCbor(data.abi))
    } else {
      throw new Error(`unknown format: ${format}`)
    }
  })

  app.get('/package/:packageId/source', (req, res) => {
    const {packageId} = req.params
    const data = storage.getModule(base16.decode(packageId), () => {
      throw new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId })
    })
    const cborData = CBOR.encode(new Sequence([data.entries, data.sources]));
    res.set('content-type', 'application/cbor-seq')
    res.send(Buffer.from(cborData))
  })

  app.get('/package/:packageId/wasm', (req, res) => {
    const {packageId} = req.params
    const data = storage.getModule(base16.decode(packageId), () => {
      throw new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId })
    })
    res.set('content-type', 'application/wasm')
    res.send(Buffer.from(data.wasmBin))
  })

  app.get('/package/:packageId/docs', (req, res) => {
    const {packageId} = req.params
    const data = storage.getModule(base16.decode(packageId), () => {
      throw new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId })
    })
    res.set('content-type', 'application/json')
    res.send(JSON.parse(Buffer.from(data.docs).toString()))
  })

  app.use((err, req, res, _next) => {
    if (err instanceof HttpNotFound) {
      res.status(statuses.NOT_FOUND)
      res.send({
        message: err.message,
        code: 'NOT_FOUND',
        data: err.data
      })
    } else if (err instanceof CompileError) {
      res.status(statuses.BAD_REQUEST)
      res.send({
        message: 'there was an error compiling a package',
        code: 'COMPILE_ERROR',
        data: {
          message: err.stderr.toString()
        }
      })
    } else {
      console.log(err)
      res.status(statuses.BAD_REQUEST)
      res.send({
        message: err.message,
        code: 'BAD_REQUEST'
      })
    }
  })
  return { app, vm, storage }
}


export { buildApp }
