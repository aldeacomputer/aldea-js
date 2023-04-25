import {JigState} from "../jig-state.js";
import {Address} from "@aldea/sdk-js";
import {ExecutionResult} from "../execution-result.js";
import {PkgData} from "../pkg-data.js";

export interface DataSave {
  persist(txExecution: ExecutionResult): void;

  addUtxo(jigState: JigState): void;

  addPackage(pkgData: PkgData): void;
}

export interface HistoricalRecord {
  getHistoricalUtxo(outputId: Uint8Array, onNotFound: () => JigState): JigState;

  utxosForAddress(userAddr: Address): JigState[];
}
