import {
  Address,
  Aldea,
  base16,
  CommitTxResponse,
  CreateTxCallback,
  HDPrivKey,
  HDPubKey,
  InstructionRef,
  instructions,
  LockType,
  OpCode,
  Output,
  Pointer,
  Tx,
  TxBuilder
} from '@aldea/sdk-js'
import {Wallet} from "./wallet.js";
import {WalletStorage} from "./storage/index.js";
import {COIN_CLASS_PTR, MAX_GAP_SIZE, PATH_PREFIX} from "./constants.js";


export class HdWallet implements Wallet {
  constructor(private storage: WalletStorage, private aldea: Aldea, private hd: HDPrivKey) {}

  async getInventory(): Promise<Array<Output>> {
    return this.storage.allUtxos()
  }

  async fundTx(partialTx: TxBuilder): Promise<TxBuilder> {
    const outputs = await this.getInventory()
    let motosIn = 0
    let coins: InstructionRef[] = []

    while (motosIn < 100) {
      const idx = outputs.findIndex(o => o.classPtr.equals(COIN_CLASS_PTR))
      if (idx === -1) {
        throw new Error("No coins available to fund transaction")
      }
      const coin = outputs[idx]
      outputs.splice(idx, 1)
      const coinRef = partialTx.load(coin.id)
      motosIn += (coin.props as any).motos || 0
      coins.push(coinRef)
    }

    const fundCoin = coins[0]
    if (coins.length > 1) {
      let [first, ...rest] = coins
      partialTx.call(first, 'combine', [rest])
    }

    partialTx.fund(fundCoin)
    return partialTx
  }

  async signTx(partialTx: TxBuilder): Promise<TxBuilder> {
    const tx = await partialTx.build()

    const outputIds = tx.instructions
      .filter(i => i.opcode === OpCode.LOAD)
      .map(i => {
        const inst = i as instructions.LoadInstruction
        return inst.outputId
      })
      .map(base16.encode)

    const originsAsStr = tx.instructions
      .filter(i => i.opcode === OpCode.LOADBYORIGIN)
      .map(i => {
        const inst = i as instructions.LoadByOriginInstruction
        return inst.origin
      })

    const paths = []

    for (const outputId of outputIds) {
      const ownedOutput = await this.storage.utxoById(outputId)
      if (ownedOutput) {
        paths.push(ownedOutput.path)
      }
    }

    for (const originBytes of originsAsStr) {
      const ownedOutput = await this.storage.utxoByOrigin(Pointer.fromBytes(originBytes))
      if (ownedOutput) {
        paths.push(ownedOutput.path)
      }
    }

    for (const path of paths) {
      const priv = this.hd.derive(path.replace('M', 'm'))
      if (priv instanceof HDPubKey) {
        throw new Error('should be a priate key')
      }
      partialTx.sign(priv)
    }

    return partialTx
  }

  async saveTxExec(tx: Tx, outputs: Output[]): Promise<void> {
    await this.storage.saveTx(tx)
    for (const output of outputs) {
      await this.addUtxo(output)
    }
  }

  async createFundedTx(fn: CreateTxCallback): Promise<Tx> {
    return await this.aldea.createTx(async (builder, ref) => {
      await fn(builder, ref)
      await this.fundTx(builder)
      await this.signTx(builder)
    })
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
      const utxos = await this.aldea.getUtxosByAddress(address)
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
      output.abi = await this.aldea.getPackageAbi(output.classPtr.id)
    }

    await this.storage.addAbi(output.classPtr.id, output.abi)
    await this.storage.removeUtxoByOrigin(output.origin)
    await this.storage.saveUtxo(output, addressOrNull.path)
  }

  async commitTx(tx: Tx): Promise<CommitTxResponse> {
    const response = await this.aldea.commitTx(tx)
    const outputs = response.outputs.map(o =>Output.fromJson(o))
    await this.saveTxExec(tx, outputs)
    return response
  }
}
