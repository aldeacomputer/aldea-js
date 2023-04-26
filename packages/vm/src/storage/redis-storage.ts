// import {JigState} from '../jig-state.js';
// import {Address, base16, Pointer} from "@aldea/sdk-js";
// import {ExecutionResult} from "../execution-result.js";
// import {LockType, WasmInstance} from "../wasm-instance.js";
// import {Option} from "../support/option.js";
// import {PkgRepository, StateProvider} from "../state-interfaces.js";
// import {PkgData} from "../pkg-data.js";
// import {DataSave, HistoricalRecord} from "./interfaces.js";
// import {Storage} from "./memory-storage.js";
//
// export class RedisStorage implements Storage {
//   constructor() {
//
//   }
//   persist(txExecution: ExecutionResult): void {
//   }
//   addPackage(pkgData: PkgData): void {
//   }
//
//   addUtxo(jigState: JigState): void {
//   }
//
//   getHistoricalUtxo(outputId: Uint8Array, onNotFound: () => JigState): JigState {
//     return undefined;
//   }
//
//   getRawPackage(id: Uint8Array): Option<PkgData> {
//     return undefined;
//   }
//
//   stateByOrigin(origin: Pointer): Option<JigState> {
//     return undefined;
//   }
//
//   stateByOutputId(id: Uint8Array): Option<JigState> {
//     return undefined;
//   }
//
//   utxosForAddress(userAddr: Address): JigState[] {
//     return [];
//   }
//
//   wasmForPackageId(moduleId: Uint8Array): WasmInstance {
//     return undefined;
//   }
//
// }
