import {Address, Output, Pointer, Tx} from "@aldea/sdk-js";
import {Abi} from "@aldea/compiler/abi";

export interface OwnedAddress {
  address: Address
  path: string
}

export interface OwnedOutput {
  output: Output
  path: string
}

export interface WalletStorage {
  allUtxos(): Promise<Array<Output>>

  currentIndex(): Promise<number>,

  changeCurrentIndex(f: (newIndex: number) => number): Promise<number>

  latestUsedIndex(): Promise<number>

  changeLastUsedIndex(f: (newIndex: number) => number): Promise<number>


  saveAddress(address: Address, path: string): Promise<void>;

  saveUtxo(output: Output, path: string): Promise<void>

  utxoById(outputId: string): Promise<OwnedOutput | null>;

  utxoByOrigin(origin: Pointer): Promise<OwnedOutput | null>;

  removeUtxoByOrigin(origin: Pointer): Promise<void>

  removeUtxoByOutputId(id: string): Promise<void>

  saveTx(tx: Tx): Promise<void>

  addressByPubKeyHash(pubKeHashStr: string): Promise<OwnedAddress | null>

  addAbi(pkgId: string, abi: Abi): Promise<void>;

  abiByPkgId(pkgId: string): Promise<Abi | null>
}
