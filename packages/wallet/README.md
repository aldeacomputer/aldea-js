# Wallet How-To

These are the basics on how to use the wallet.

## Step 1: Choose your storage

We have 2 types of storage at the moment: LowDB and memory. Low db allows you to use several supports:

```tsx
import { Memory } from "lowdb"
import { JSONFile, TextFile } from "lowdb/node"
import { LowDbStorage, LowDbData } from "@aldea/wallet-lib"

// lowdb + memory
const storage = new LowDbStorage(new Memory<LowDbData>())
// lowdb + jsonfile
const storage = new LowDbStorage(new JSONFile<LowDbData>('path/to/my/json/file.json'))
// lowdb + textfile
const storage = new LowDbStorage(new JSONFile<LowDbData>('path/to/my/file.txt'))
```

And memory (transient storage):

```tsx
import { LowDbStorage, MemoryStorage } from "@aldea/wallet-lib"

const storage = new MemoryStorage()
```

## Step 2: Create a wallet instance

Again, 2 options: Single key wallet and HDWallet

```tsx
import { SingleKeyWallet, HdWallet } from "@aldea/wallet-lib"
import { Aldea, HDPrivKey, PrivKey } from "@aldea/sdk-js"

const pk = PrivKey.fromRandom()
const aldea = new Aldea()
const wallet1 = new SingleKeyWallet(pk, aldea, storage)
const wallet2 = new HdWallet(storage, aldea, hdPriv)
```

## Step 3: Mint some coins

```tsx
const kyResponse = await aldea.api.post('mint', { 
  headers: { 
    'Content-Type': 'application/json' 
  }, 
  body: JSON.stringify({ 
    address: await wallet.getNextAddress().then(a => a.toString()), 
    amount: 500 
  })
})

const output = Output.fromJson(await kyResponse.json())
await wallet.addUtxo(output)
```

## Step 4: Do some txs

There is a wraper around `aldea.createTx` that signs, fund and broadcast

```tsx
const response = await wallet.fundSignAndBroadcastTx(async builder => {
  const pkgIdx = builder.import('ea9225bcf8572c3a9fa75d186b62ab976d017d96b0614612f59d5fa5087b7fa3')
  const nftIdx = builder.new(pkgIdx, 'NFT', ['name', 32, 'moreName'])
  builder.lock(nftIdx, await wallet.getNextAddress())
})
```

Another option is doing this by hand:

```tsx
const tx = aldea.createTx(async builder => {
  const pkgIdx = builder.import('ea9225bcf8572c3a9fa75d186b62ab976d017d96b0614612f59d5fa5087b7fa3')
  const nftIdx = builder.new(pkgIdx, 'NFT', ['name', 32, 'moreName'])
  builder.lock(nftIdx, await wallet.getNextAddress())
  await wallet.fundTx(builder)
  await wallet.signTx(builder)
})

const commitResponse = await aldea.commitTX(tx)
await wallet.processTx(tx, commitResponse.output.map(Output.fromJson))
```

## Step 5: Viewing Your Balance

```tsx
const utxos = wallet.getInventory()
const coins = utxos.filter(u => u.classPtr.id === new Array(32).fill(0).join(''))
```
