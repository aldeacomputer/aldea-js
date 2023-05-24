import test from 'ava'
import getPort from '@ava/get-port'
import { Aldea, HDPrivKey, LockType, Output } from '@aldea/sdk'
import { Memory } from 'lowdb'
import { LowDbStorage, HdWallet } from '../dist/index.js'
import { startMocknet } from './support/mocknet.js'

test.before(async t => {
  const port = await getPort()
  await startMocknet(port)
  t.context.aldea = new Aldea(`http://localhost:${port}`)
})

test.beforeEach(t => {
  const storage = new LowDbStorage(new Memory())
  const wallet = new HdWallet(HDPrivKey.fromRandom(), storage, t.context.aldea)
  t.context.wallet = wallet
})

test('getNextAddress() returns different addresses', async t => {
  const addr1 = await t.context.wallet.getNextAddress()
  const addr2 = await t.context.wallet.getNextAddress()
  t.notDeepEqual(addr1, addr2)
})

test('funds a tx with single utxo no change', async t => {
  const addr = await t.context.wallet.getNextAddress()
  const mint = await t.context.aldea.api.post('mint', { json: { address: addr.toString(), amount: 100 }}).json()
  const output = Output.fromJson(mint)
  await t.context.wallet.addUtxo(output)

  const addr2 = await t.context.wallet.getNextAddress()
  const tx = await t.context.wallet.createFundedTx(txb => {
    const pkgRef = txb.import('446f2f5ebbcbd8eb081d207a67c1c9f1ba3d15867c12a92b96e7520382883846')
    const nftRef = txb.new(pkgRef, 'NFT', ['name', 32, 'moreName'])
    txb.lock(nftRef, addr2)
  })

  const res = await t.context.wallet.commitTx(tx)

  t.is(res.id.length, 64)
  t.is(res.outputs.length, 2)
  t.true(res.outputs[0].class.startsWith('446f2f5ebbcbd8eb081d207a67c1c9f1ba3d15867c12a92b96e7520382883846'))
  t.true(res.outputs[1].class.startsWith('0000000000000000000000000000000000000000000000000000000000000000'))
  t.is(res.outputs[1].lock.type, LockType.FROZEN)

  const inventory = await t.context.wallet.getInventory()
  t.is(inventory.length, 1)
  t.true(inventory.some(i => i.id === res.outputs[0].id))
})

test('funds a tx with single utxo with change', async t => {
  const addr = await t.context.wallet.getNextAddress()
  const mint = await t.context.aldea.api.post('mint', { json: { address: addr.toString(), amount: 1000 }}).json()
  const output = Output.fromJson(mint)
  await t.context.wallet.addUtxo(output)

  const addr2 = await t.context.wallet.getNextAddress()
  const tx = await t.context.wallet.createFundedTx(txb => {
    const pkgRef = txb.import('446f2f5ebbcbd8eb081d207a67c1c9f1ba3d15867c12a92b96e7520382883846')
    const nftRef = txb.new(pkgRef, 'NFT', ['name', 32, 'moreName'])
    txb.lock(nftRef, addr2)
  })

  const res = await t.context.wallet.commitTx(tx)

  t.is(res.id.length, 64)
  t.is(res.outputs.length, 3)
  t.true(res.outputs[0].class.startsWith('446f2f5ebbcbd8eb081d207a67c1c9f1ba3d15867c12a92b96e7520382883846'))
  t.true(res.outputs[1].class.startsWith('0000000000000000000000000000000000000000000000000000000000000000'))
  t.true(res.outputs[2].class.startsWith('0000000000000000000000000000000000000000000000000000000000000000'))
  t.is(res.outputs[1].lock.type, LockType.FROZEN)
  t.is(res.outputs[2].lock.type, LockType.ADDRESS)

  const inventory = await t.context.wallet.getInventory()
  t.is(inventory.length, 2)
  t.true(inventory.some(i => i.id === res.outputs[0].id))
  t.true(inventory.some(i => i.id === res.outputs[2].id))
})

test('funds a tx with multiple utxos no change', async t => {
  let addr
  for (let i = 0; i < 4; i++) {
    addr = await t.context.wallet.getNextAddress()
    const mint = await t.context.aldea.api.post('mint', { json: { address: addr.toString(), amount: 25 }}).json()
    const output = Output.fromJson(mint)
    await t.context.wallet.addUtxo(output)
  }

  const addr2 = await t.context.wallet.getNextAddress()
  const tx = await t.context.wallet.createFundedTx(txb => {
    const pkgRef = txb.import('446f2f5ebbcbd8eb081d207a67c1c9f1ba3d15867c12a92b96e7520382883846')
    const nftRef = txb.new(pkgRef, 'NFT', ['name', 32, 'moreName'])
    txb.lock(nftRef, addr2)
  })

  const res = await t.context.wallet.commitTx(tx)

  t.is(res.id.length, 64)
  t.is(res.outputs.length, 5)
  t.true(res.outputs[0].class.startsWith('446f2f5ebbcbd8eb081d207a67c1c9f1ba3d15867c12a92b96e7520382883846'))
  for (let i = 1; i <= 4; i ++) {
    t.true(res.outputs[i].class.startsWith('0000000000000000000000000000000000000000000000000000000000000000'))
    t.is(res.outputs[i].lock.type, LockType.FROZEN)
  }

  const inventory = await t.context.wallet.getInventory()
  t.is(inventory.length, 1)
  t.true(inventory.some(i => i.id === res.outputs[0].id))
})

test('funds a tx with multiple utxos with change', async t => {
  let addr
  for (let i = 0; i < 4; i++) {
    addr = await t.context.wallet.getNextAddress()
    const mint = await t.context.aldea.api.post('mint', { json: { address: addr.toString(), amount: 30 }}).json()
    const output = Output.fromJson(mint)
    await t.context.wallet.addUtxo(output)
  }

  const addr2 = await t.context.wallet.getNextAddress()
  const tx = await t.context.wallet.createFundedTx(txb => {
    const pkgRef = txb.import('446f2f5ebbcbd8eb081d207a67c1c9f1ba3d15867c12a92b96e7520382883846')
    const nftRef = txb.new(pkgRef, 'NFT', ['name', 32, 'moreName'])
    txb.lock(nftRef, addr2)
  })

  const res = await t.context.wallet.commitTx(tx)

  t.is(res.id.length, 64)
  t.is(res.outputs.length, 6)
  t.true(res.outputs[0].class.startsWith('446f2f5ebbcbd8eb081d207a67c1c9f1ba3d15867c12a92b96e7520382883846'))
  for (let i = 1; i <= 4; i ++) {
    t.true(res.outputs[i].class.startsWith('0000000000000000000000000000000000000000000000000000000000000000'))
    t.is(res.outputs[i].lock.type, LockType.FROZEN)
  }
  t.true(res.outputs[5].class.startsWith('0000000000000000000000000000000000000000000000000000000000000000'))
  t.is(res.outputs[5].lock.type, LockType.ADDRESS)

  const inventory = await t.context.wallet.getInventory()
  t.is(inventory.length, 2)
  t.true(inventory.some(i => i.id === res.outputs[0].id))
  t.true(inventory.some(i => i.id === res.outputs[5].id))
})
