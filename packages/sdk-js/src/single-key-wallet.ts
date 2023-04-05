import {Output} from "./output.js";
import {PrivKey} from "./privkey.js";
import {KeyPair} from "./keypair.js";
import {Address} from "./address.js";
import {TxBuilder} from "./tx-builder.js";
import {Pointer} from "./pointer.js";

const COIN_CLASS_ID = Pointer.fromString("0000000000000000000000000000000000000000000000000000000000000000_0")

export class SingleKeyWallet {
  private privKey: PrivKey
  private inventory: Output[]
  constructor(privKeyHex: string) {
    this.privKey = PrivKey.fromHex(privKeyHex)
    this.inventory = []
  }

  async getInventory(): Promise<Array<Output>> {
    return this.inventory
  }

  // async getPackages(): Promise<Array<PackageResponse>> {
  //
  // }

  async fundTx(partialTx: TxBuilder): Promise<TxBuilder> {

    let coin = this.inventory.find(output => output.classPtr.equals(COIN_CLASS_ID))
    if (!coin) {
      throw new Error('not enough funds')
    }
    // TODO: Consider when the coin has not enough funds.
    // TODO: Consider when you need to send change.
    // TODO: Consider when you need more than 1 coin.
    let coinIdx = partialTx.load(coin.id)
    partialTx.fund(coinIdx)
    partialTx.sign(this.privKey)
    return partialTx
  }

  async getNextAddress (): Promise<Address> {
    return this.privKey.toPubKey().toAddress()
  }

  // async signTx(partialTx: TxBuilder): Promise<TxBuilder> {
  //
  // }

  // async processTx(builder: TxBuilder): Promise<TxResponse> {
  //
  // }

  // async fundSignAndBroadcastTx(partialTx: TxBuilder): Promise<TxResponse> {
  //
  // }

  // async sync(): Promise<void> {
  //
  // }
}
