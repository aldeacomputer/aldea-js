import { test, expect } from '@playwright/test'
import fs from 'fs'
import { resolve } from 'path'
import { Address, OpCode, Pointer, PubKey, Tx, base16 } from '../../dist/index.js'

const pagePath = resolve('test/browser/page.html')
const pageUrl = `file://${pagePath}`

test('builds, serialized and parses a kitchen sink tx', async ({ page }) => {
  await page.goto(pageUrl);
  const $aldea = await page.evaluateHandle('window.aldeaJS')

  const mocks = {
    'http://localhost/package/a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701/abi.json':   fs.readFileSync('test/mocks/txb.pkg.json').toString(),
    'http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.json':   fs.readFileSync('test/mocks/pkg.coin.json').toString(),
    'http://localhost/output/df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d':             fs.readFileSync('test/mocks/txb.coin.json').toString(),
    'http://localhost/output-by-origin/675d72e2d567cbe2cb9ef3230cbc4c85e42bcd56ba537f6b65a51b9c6c855281_1': fs.readFileSync('test/mocks/txb.jig.json').toString(),
  }

  // Setup mocked Aldea client in browser [handle]
  const $env = await $aldea.evaluateHandle(({ Aldea, Address, KeyPair }, mocks) => {
    const aldea = new Aldea('http://localhost')
    const hooks = Object.entries(mocks).map(([url, body]) => {
      return req => {
        if (req.method === 'GET' && req.url === url) {
          return new window.Response(body, { status: 200 })
        }
      }
    })
    aldea.api = aldea.api.extend({ hooks: { beforeRequest: hooks } })

    const keys = KeyPair.fromRandom()
    const addr = Address.fromPubKey(keys.pubKey)

    const pkg = new Map([
      ['index.ts', 'export function helloWorld(msg: string): string { return `Hello ${msg}!` }']
    ])

    return { aldea, addr, keys, pkg }
  }, mocks)

  // Build a kitchen sink tx, serialise and parse in browser, recieve in test env as hex
  const txHex = await $aldea.evaluate(async ({ Tx }, { aldea, addr, keys, pkg }) => {
    const tx1 = await aldea.createTx((tx, ref) => {
      tx.import('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')
      tx.load('df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d')
      tx.loadByOrigin('675d72e2d567cbe2cb9ef3230cbc4c85e42bcd56ba537f6b65a51b9c6c855281_1')

      tx.new(ref(0), 'Badge', ['foo'])
      tx.call(ref(1), 'send', [700, addr.hash])
      tx.call(ref(2), 'rename', ['bar'])
      tx.exec(ref(0), 'Badge.helloWorld', ['mum'])
      tx.exec(ref(0), 'helloWorld', ['dad'])

      tx.fund(ref(1))
      tx.lock(ref(2), addr)
      tx.lock(ref(3), addr)
      
      tx.deploy(pkg)
      
      tx.sign(keys.privKey)
      tx.signTo(keys.privKey)
    })

    // Do a full serialize-parse cycle in browser and pass to test env as hex string
    return Tx.fromHex(tx1.toHex()).toHex()
  }, $env)

  // Extract address from browser env
  const addrStr = await $env.evaluate(({ addr }) => addr.toString())
  const addr = Address.fromString(addrStr)

  // Extract pubkey from browser env
  const pubkeyHex = await $env.evaluate(({ keys }) => keys.pubKey.toHex())
  const pubKey = PubKey.fromHex(pubkeyHex)

  // Extract pkg from browser env
  const pkgEntries = await $env.evaluate(({ pkg }) => Array.from(pkg.entries()))
  const pkg = new Map(pkgEntries)

  expect(typeof txHex).toBe('string')
  const tx = Tx.fromHex(txHex)

  expect(tx.instructions.length).toBe(14)
  expect(tx.instructions[0].opcode).toBe(OpCode.IMPORT)
  expect(tx.instructions[0].pkgId).toEqual(base16.decode('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701'))

  expect(tx.instructions[1].opcode).toBe(OpCode.LOAD)
  expect(tx.instructions[1].outputId).toEqual(base16.decode('df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d'))

  expect(tx.instructions[2].opcode).toBe(OpCode.LOADBYORIGIN)
  expect(tx.instructions[2].origin).toEqual(Pointer.fromString('675d72e2d567cbe2cb9ef3230cbc4c85e42bcd56ba537f6b65a51b9c6c855281_1').toBytes())

  expect(tx.instructions[3].opcode).toBe(OpCode.NEW)
  expect(tx.instructions[3].idx).toBe(0)
  expect(tx.instructions[3].exportIdx).toBe(0)
  expect(tx.instructions[3].args).toEqual(['foo'])

  expect(tx.instructions[4].opcode).toBe(OpCode.CALL)
  expect(tx.instructions[4].idx).toBe(1)
  expect(tx.instructions[4].methodIdx).toBe(1)
  expect(tx.instructions[4].args).toEqual([700, addr.hash])

  expect(tx.instructions[5].opcode).toBe(OpCode.CALL)
  expect(tx.instructions[5].idx).toBe(2)
  expect(tx.instructions[5].methodIdx).toBe(1)
  expect(tx.instructions[5].args).toEqual(['bar'])

  expect(tx.instructions[6].opcode).toBe(OpCode.EXEC)
  expect(tx.instructions[6].idx).toBe(0)
  expect(tx.instructions[6].exportIdx).toBe(0)
  expect(tx.instructions[6].methodIdx).toBe(2)
  expect(tx.instructions[6].args).toEqual(['mum'])

  expect(tx.instructions[7].opcode).toBe(OpCode.EXECFUNC)
  expect(tx.instructions[7].idx).toBe(0)
  expect(tx.instructions[7].exportIdx).toBe(1)
  expect(tx.instructions[7].args).toEqual(['dad'])

  expect(tx.instructions[8].opcode).toBe(OpCode.FUND)
  expect(tx.instructions[8].idx).toBe(1)

  expect(tx.instructions[9].opcode).toBe(OpCode.LOCK)
  expect(tx.instructions[9].idx).toBe(2)
  expect(tx.instructions[9].pubkeyHash).toEqual(addr.hash)

  expect(tx.instructions[10].opcode).toBe(OpCode.LOCK)
  expect(tx.instructions[10].idx).toBe(3)
  expect(tx.instructions[10].pubkeyHash).toEqual(addr.hash)

  expect(tx.instructions[11].opcode).toBe(OpCode.DEPLOY)
  expect(tx.instructions[11].entry).toEqual(['index.ts'])
  expect(tx.instructions[11].code).toEqual(pkg)

  expect(tx.instructions[12].opcode).toBe(OpCode.SIGN)
  expect(tx.instructions[12].sig.length).toBe(64)
  expect(tx.instructions[12].pubkey).toEqual(pubKey.toBytes())

  expect(tx.instructions[13].opcode).toBe(OpCode.SIGNTO)
  expect(tx.instructions[13].sig.length).toBe(64)
  expect(tx.instructions[13].pubkey).toEqual(pubKey.toBytes())
})
