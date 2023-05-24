import { SingleKeyWallet } from "../dist/index.js"
import { Aldea, Output, PrivKey } from "@aldea/sdk"
import { Memory } from "lowdb"
import { LowDbStorage } from "../dist/index.js"

const aldea = new Aldea('http://localhost:4000')
const pk = PrivKey.fromRandom()

const storage = new LowDbStorage(new Memory())
const wallet = new SingleKeyWallet(pk, storage, aldea)

const kyResponse = await aldea.api.post('mint', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: await wallet.getNextAddress().then(a => a.toString()), amount: 500 })
})

const output = Output.fromJson(await kyResponse.json())
await wallet.addUtxo(output)

console.log('inventory before mint')
console.log(await wallet.getInventory())

console.log('minting an nft...')
const tx = await wallet.createFundedTx(builder => {
  const pkgIdx = builder.import('446f2f5ebbcbd8eb081d207a67c1c9f1ba3d15867c12a92b96e7520382883846')
  const nftIdx = builder.new(pkgIdx, 'NFT', ['name', 32, 'moreName'])
  builder.lock(nftIdx, wallet.address())
})
await wallet.commitTx(tx)

console.log('inventory  after minting')
console.log(await wallet.getInventory())


// console.log('sync new instance')
// const aldea2 = new Aldea('http://localhost:4000')
// const wallet2 = new SingleKeyWallet(pk, storage, aldea2)
// await wallet2.sync()
// console.log('wallet 2 inventory')
// console.log(await wallet2.getInventory())
