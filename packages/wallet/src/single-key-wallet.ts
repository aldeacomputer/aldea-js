import {
  Address,
  Aldea,
  CommitTxResponse,
  LockType,
  Output,
  PrivKey,
  Tx,
  TxBuilder,
  util
} from '@aldea/sdk-js'
import {Wallet} from "./wallet.js";
import {COIN_CLASS_PTR} from "./constants.js";
import {WalletStorage} from "./storage/index.js";


export class SingleKeyWallet extends Wallet {
  private storage: WalletStorage
  private readonly privKey: PrivKey

  constructor(pk: PrivKey, storage: WalletStorage, client: Aldea) {
    super(client)
    this.privKey = pk
    this.storage = storage
  }

  async addUtxo(output: Output): Promise<void> {
    if (output.lock.type !== LockType.ADDRESS) return

    if (!util.buffEquals(output.lock.data, this.address().hash)) return

    if (!output.abi) {
      output.abi = await this.fetchAbi(output.classPtr.id)
    }

    await this.storage.addAbi(output.classPtr.id, output.abi)
    await this.storage.removeUtxoByOrigin(output.origin)
    await this.storage.saveUtxo(output, '')
  }



  async getInventory(): Promise<Array<Output>> {
    return this.storage.allUtxos()
  }

  async getNextAddress(): Promise<Address> {
    return this.privKey.toPubKey().toAddress()
  }

  async saveTxExec(tx: Tx, outputList: Output[]): Promise<void> {
    await Promise.all(outputList.map(output => this.addUtxo(output)))
    this.storage.saveTx(tx)
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
    let abi = await this.storage.abiByPkgId(pkgId)
    if (!abi) {
      const newAbi = await this.client.getPackageAbi(pkgId)
      await this.storage.addAbi(pkgId, newAbi)
      abi = newAbi
    }
    return abi
  }
}
