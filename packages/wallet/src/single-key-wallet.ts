import {
  Address,
  Aldea,
  CommitTxResponse,
  CreateTxCallback,
  LockType,
  Output,
  Pointer,
  PrivKey,
  Tx,
  TxBuilder,
  util
} from '@aldea/sdk-js'
import {Wallet} from "./wallet.js";
import {Abi} from "@aldea/compiler/abi";

const COIN_CLASS_PTR = Pointer.fromString("0000000000000000000000000000000000000000000000000000000000000000_0")


export interface SingleKeyWalletStorage {
  allUtxos(): Promise<Output[]>;

  addUtxos(utxo: Output): Promise<void>;

  removeUtxoByOrigin(origin: Pointer): Promise<void>;

  addAbi(pkgId: string, abi: Abi): Promise<void>;

  getAbi(pkgId: string): Promise<Abi | null>;

  addTx(tx: Tx): Promise<void>;
}

export class MemorySingleKeyWalletStorage implements SingleKeyWalletStorage {
  private utxos: Output[]
  private txHistory: Tx[]
  private abis: Map<string, Abi>

  constructor() {
    this.utxos = []
    this.txHistory = []
    this.abis = new Map<string, Abi>()
  }

  async allUtxos(): Promise<Output[]> {
    return this.utxos
  }

  async addUtxos(utxo: Output): Promise<void> {
    this.utxos.push(utxo)
  }

  async removeUtxoByOrigin(origin: Pointer): Promise<void> {
    this.utxos = this.utxos.filter(u => !u.origin.equals(origin) )
  }

  async addAbi(pkgId: string, abi: Abi): Promise<void> {
    this.abis.set(pkgId, abi)
  }

  async getAbi(pkgId: string): Promise<Abi | null> {
    return this.abis.get(pkgId) || null
  }

  async addTx(tx: Tx): Promise<void> {
    this.txHistory.push(tx)
  }
}

export class SingleKeyWallet implements Wallet {
  private storage: SingleKeyWalletStorage
  private readonly privKey: PrivKey
  private client: Aldea

  constructor(pk: PrivKey, client: Aldea, storage: SingleKeyWalletStorage) {
    this.privKey = pk
    this.client = client
    this.storage = storage
  }

  async addUtxo(output: Output): Promise<void> {
    if (output.lock.type !== LockType.ADDRESS) return

    if (!util.buffEquals(output.lock.data, this.address().hash)) return

    if (!output.abi) {
      const abi = await this.fetchAbi(output.classPtr.id)
      output.abi = abi
    }

    await this.storage.removeUtxoByOrigin(output.origin)
    await this.storage.addUtxos(output)
  }

  async fundSignAndBroadcastTx(fn: CreateTxCallback): Promise<CommitTxResponse> {
    const tx = await this.client.createTx(async (builder, ref) => {
      await fn(builder, ref)
      await this.fundTx(builder)
      await this.signTx(builder)
    })

    const result = await this.client.commitTx(tx)

    const outputs  = await Promise.all(result.outputs.map(async (or) => {
      return Output.fromJson(or)
    }))

    await this.processTx(tx, outputs)
    return result
  }

  async fundTx(partialTx: TxBuilder): Promise<TxBuilder> {
    const coins = await this.storage.allUtxos()
      .then(utxos => utxos.filter((o: Output) => o.classPtr.equals(COIN_CLASS_PTR)))
    const coin  = coins.find(c => {
      const props = c.props
      if (!props) { throw Error('error')}
      const motos = props['motos']
      return motos > 100
    })
    if (!coin) {
      throw new Error('now enough funds')
    }

    const coinIdx = partialTx.load(coin.id)
    const fundCoinIdx = partialTx.call(coinIdx, 'send', [100])
    partialTx.fund(fundCoinIdx)
    return partialTx;
  }

  async getInventory(): Promise<Array<Output>> {
    return this.storage.allUtxos()
  }

  async getNextAddress(): Promise<Address> {
    return this.privKey.toPubKey().toAddress()
  }

  async processTx(tx: Tx, outputList: Output[]): Promise<void> {
    await Promise.all(outputList.map(output => this.addUtxo(output)))
    this.storage.addTx(tx)
  }

  async signTx(partialTx: TxBuilder): Promise<TxBuilder> {
    partialTx.sign(this.privKey)
    return partialTx
  }

  async sync(): Promise<void> {
    const outputs = await this.client.getUtxosByAddress(this.address())
    for (const output of outputs) {
      await this.addUtxo(output)
    }
  }

  private address() {
    return this.privKey.toPubKey().toAddress()
  }

  private async fetchAbi(pkgId: string) {
    let abi = await this.storage.getAbi(pkgId)
    if (!abi) {
      const newAbi = await this.client.getPackageAbi(pkgId)
      await this.storage.addAbi(pkgId, newAbi)
      abi = newAbi
    }
    return abi
  }
}
