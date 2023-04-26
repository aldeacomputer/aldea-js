import {JigState} from "../jig-state.js";
import {Address, Output} from "@aldea/sdk-js";
import {ExecutionResult} from "../execution-result.js";
import {PkgData} from "../pkg-data.js";
import {Option} from "../support/option.js";

export interface DataSave {
  persist(txExecution: ExecutionResult): void;

  addUtxo(jigState: Output): void;

  addPackage(pkgData: PkgData): void;
}

export interface HistoricalRecord {
  getHistoricalUtxo(outputId: Uint8Array): Option<Output>;

  utxosForAddress(userAddr: Address): Output[];
}
