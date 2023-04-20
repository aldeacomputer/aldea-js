import { HdWallet } from "../dist/hd-wallet.js"
import { LowDbStorage } from '../dist/storage/lowdb-storage.js'
import { Aldea, HDPrivKey, Output, PrivKey } from "@aldea/sdk-js"
import { Memory } from "lowdb"

const aldea = new Aldea('http://localhost:4000')
const hdPriv = HDPrivKey.fromSeed( new Uint8Array(32) )

const storage = new LowDbStorage(new Memory())
const wallet = new HdWallet(hdPriv, storage, aldea)

const kyResponse = await aldea.api.post('mint', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: await wallet.getNextAddress().then(a => a.toString()), amount: 500 })})

const output = Output.fromJson(await kyResponse.json())
await wallet.addUtxo(output)

console.log('inventory after mint')
console.log(await wallet.getInventory())

console.log('minting an nft...')
const tx = await wallet.createFundedTx(async builder => {
  const pkgIdx = builder.import('ea9225bcf8572c3a9fa75d186b62ab976d017d96b0614612f59d5fa5087b7fa3')
  const nftIdx = builder.new(pkgIdx, 'NFT', ['name', 32, 'moreName'])
  builder.lock(nftIdx, await wallet.getNextAddress())
})
await wallet.commitTx(tx)

console.log('inventory  after minting')
console.log(await wallet.getInventory())


console.log('sync new instance')
const aldea2 = new Aldea('http://localhost:4000')
const wallet2 = new HdWallet(hdPriv, storage, aldea2)
await wallet2.sync()
console.log('wallet 2 inventory')
console.log(await wallet2.getInventory().then(i => i.map(a => a.origin.toString())))
