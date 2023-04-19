import { SingleKeyWallet } from "../dist/single-key-wallet.js"
import { Aldea, Output, PrivKey } from "@aldea/sdk-js"

const aldea = new Aldea('http://localhost:4000')
const pk = PrivKey.fromRandom()
const wallet = new SingleKeyWallet(pk, aldea)

const kyResponse = await aldea.api.post('mint', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: wallet.address().toString(), amount: 500 })})

const output = Output.fromJson(await kyResponse.json())
await wallet.addOutput(output)

console.log('inventory after mint')
console.log(await wallet.getInventory())

console.log('minting an nft...')
const response = await wallet.fundSignAndBroadcastTx(builder => {
  const pkgIdx = builder.import('ea9225bcf8572c3a9fa75d186b62ab976d017d96b0614612f59d5fa5087b7fa3')
  const nftIdx = builder.new(pkgIdx, 'NFT', ['name', 32, 'moreName'])
  builder.lock(nftIdx, wallet.address())
})

console.log('inventory  after minting')
console.log(await wallet.getInventory())


console.log('sync new instance')
const aldea2 = new Aldea('http://localhost:4000')
const wallet2 = new SingleKeyWallet(pk, aldea)
await wallet2.sync()
console.log('wallet 2 inventory')
console.log(await wallet2.getInventory())
