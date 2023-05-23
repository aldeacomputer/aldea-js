import {
  Address,
  base16,
  HDPrivKey,
  instructions,
  LockType,
  OpCode,
  Output,
  Pointer,
  Tx,
} from '@aldea/sdk'
import {Wallet} from "./wallet.js";
import {WalletStorage} from "./storage/index.js";
import {MAX_GAP_SIZE, PATH_PREFIX} from "./constants.js";
import {AldeaClient} from "./aldea-client.js";


export class HdWallet extends Wallet {
  private hd: HDPrivKey;
  private storage: WalletStorage;
  constructor(hd: HDPrivKey, storage: WalletStorage, client: AldeaClient) {
    super(client)
    this.hd = hd
    this.storage = storage
  }

  async getInventory(): Promise<Array<Output>> {
    return this.storage.allUtxos()
  }

  async signTx(partialTx: Tx): Promise<Tx> {
    const outputIds = partialTx.instructions
      .filter(i => i.opcode === OpCode.LOAD)
      .map(i => {
        const inst = i as instructions.LoadInstruction
        return inst.outputId
      })
      .map(base16.encode)

    const originPtrs = partialTx.instructions
      .filter(i => i.opcode === OpCode.LOADBYORIGIN)
      .map(i => {
        const inst = i as instructions.LoadByOriginInstruction
        return Pointer.fromBytes(inst.origin)
      })

    const paths: string[] = []

    for (const outputId of outputIds) {
      const ownedOutput = await this.storage.utxoById(outputId)
      if (ownedOutput) {
        paths.push(ownedOutput.path)
      }
    }

    for (const ptr of originPtrs) {
      const ownedOutput = await this.storage.utxoByOrigin(ptr)
      if (ownedOutput) {
        paths.push(ownedOutput.path)
      }
    }

    return this.client.createTx({ extend: partialTx }, txb => {
      for (const path of paths) {
        const priv = this.hd.derive(path.replace('M', 'm')) as HDPrivKey
        txb.sign(priv)
      }
    })
  }

  async saveTxExec(tx: Tx, outputs: Output[]): Promise<void> {
    await this.storage.saveTx(tx)
    for (const output of outputs) {
      await this.addUtxo(output)
    }
  }

  async getNextAddress(): Promise<Address> {
    const index = await this.storage.currentIndex()
    const lastUsed = await this.storage.latestUsedIndex()

    const next = index - lastUsed > MAX_GAP_SIZE
      ? lastUsed
      : index

    const path = `M${PATH_PREFIX}${index}`; // Derive pubkey
    const hdPub = this.hd.derive(path);
    const address = hdPub.toPubKey().toAddress();
    await this.storage.saveAddress(address, path)
    await this.storage.changeCurrentIndex(_ => next + 1)
    return address
  }

  async sync(): Promise<void> {
    let lastIndexUsed = await this.storage.latestUsedIndex()
    let current = lastIndexUsed
    while (current < lastIndexUsed + MAX_GAP_SIZE) {
      const path = `M${PATH_PREFIX}${current}`;
      const address = this.hd.derive(path).toPubKey().toAddress()
      await this.storage.saveAddress(address, path)
      const utxos = await this.client.getUtxosByAddress(address)
      if (utxos.length > 0) {
        lastIndexUsed = current
        await this.storage.changeLastUsedIndex(() => current)
        await this.storage.changeCurrentIndex(() => current)
      }
      await Promise.all(utxos.map(async (utxo) => {
        await this.addUtxo(utxo)
      }))
      current++
    }
    return Promise.resolve()
  }

  async addUtxo (output: Output): Promise<void> {
    if (output.lock.type !== LockType.ADDRESS) return
    let addressOrNull = await this.storage.addressByPubKeyHash(base16.encode(output.lock.data))
    if (addressOrNull === null) { // address does not belong to wallet.
      return
    }

    if (!output.abi) {
      output.abi = await this.client.getPackageAbi(output.classPtr.id)
    }

    await this.storage.addAbi(output.classPtr.id, output.abi)
    await this.storage.removeUtxoByOrigin(output.origin)
    await this.storage.saveUtxo(output, addressOrNull.path)
  }
}
