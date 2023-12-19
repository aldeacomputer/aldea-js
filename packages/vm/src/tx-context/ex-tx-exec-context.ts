// import {base16, Instruction, Pointer, Tx} from "@aldea/core";
// import {ExtendedTx} from "./extended-tx.js";
// import {Clock} from "../clock.js";
// import {PkgRepository} from "../state-interfaces.js";
// import {ExecContext} from "./exec-context.js";
// import {JigState} from "../jig-state.js";
// import {PkgData} from "../storage.js";
// import {VM} from "../vm.js";
// import {WasmContainer} from "../wasm-container.js";
//
//
// const cmpBuff = (buff1: Uint8Array, buff2: Uint8Array): number => {
//   for (let i = 0; i < buff1.length; i++) {
//     if (buff1[i] > buff2[i]) {
//       return 1
//     }
//     if (buff1[i] < buff2[i]) {
//       return -1
//     }
//   }
//
//   if (buff1.length < buff2.length) {
//     return 1
//   } else
//   if (buff1.length > buff2.length) {
//     return 1
//   } else {
//     return 0
//   }
// }
//
import {ExecContext} from "./exec-context.js";
import {PkgData} from "../storage.js";
import {abiFromBin, base16, Output, Pointer, PubKey} from "@aldea/core";
import {WasmContainer} from "../wasm-container.js";
import {ExtendedTx} from "./extended-tx.js";
import {CompileFn} from "../vm.js";
import {ExecutionError} from "../errors.js";
import {calculatePackageId} from "../calculate-package-id.js";
import {Buffer} from "buffer";
import {Option} from "../support/option.js";

export class ExTxExecContext implements ExecContext {
  exTx: ExtendedTx
  private compileFn: CompileFn;
  private containers: WasmContainer[];

  constructor (exTx: ExtendedTx, containers: WasmContainer[], compileFn: CompileFn) {
    this.exTx = exTx
    this.containers = containers
    this.compileFn = compileFn
  }

  async compile (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    const id = calculatePackageId(entries, sources)

    const result = await this.compileFn(entries, sources, new Map())

    return new PkgData(
      abiFromBin(result.output.abi),
      Buffer.from(result.output.docs || ''),
      entries,
      id,
      new WebAssembly.Module(result.output.wasm),
      sources,
      result.output.wasm
    )
  }

  inputByOrigin (origin: Pointer): Output {
    const output = this.exTx.inputs.find(i => i.origin.equals(origin));
    if (!output) {
      throw new ExecutionError(`input not provided. Origin:${origin.toString()}`)
    }
    return output
  }

  outputById (hash: Uint8Array): Output {
    let id = base16.encode(hash)
    const output = this.exTx.inputs.find(i =>  i.id === id);
    if (!output) {
      throw new ExecutionError(`input not provided. id: ${id}`)
    }
    return output
  }

  signers (): PubKey[] {
    return this.exTx.tx.signers();
  }

  txHash (): Uint8Array {
    return this.exTx.tx.hash;
  }

  wasmFromPkgId (pkgId: string): WasmContainer {
    return Option.fromNullable(this.containers.find(c => c.id === pkgId)).expect(
      new ExecutionError(`Missing package: ${pkgId}`)
    )
  }
//   private exTx: ExtendedTx
//   private clock: Clock;
//   private pkgs: PkgRepository
//   private vm: VM
//
//   constructor(exTx: ExtendedTx, clock: Clock, pkgRepo: PkgRepository, vm: VM) {
//     this.exTx = exTx
//     this.clock = clock
//     this.pkgs = pkgRepo
//     this.vm = vm
//   }
//
//   compile(entries: string[], sources: Map<string, string>): Promise<PkgData> {
//     return this.vm.compileSources(entries, sources);
//   }
//
//   async forEachInstruction(fn: (i: Instruction) => Promise<void>): Promise<void> {
//     for (const inst of this.tx.instructions) {
//       await fn(inst)
//     }
//   }
//
//   now(): moment.Moment {
//     return this.clock.now();
//   }
//
//   stateByOrigin(origin: Pointer): JigState {
//     const jigState = this.exTx.inputs.find(state => state.origin.equals(origin))
//     if (!jigState) {
//       throw new Error(`state for origin ${origin.toString()} was not provided`)
//     }
//     return jigState;
//   }
//
//   stateByOutputId(id: Uint8Array): JigState {
//     const jigState = this.exTx.inputs.find(state => cmpBuff(state.id(), id) === 0 );
//     if (!jigState) {
//       throw new Error(`state for output id "${base16.encode(id)}" was not provided`)
//     }
//     return jigState;
//   }
//
//   get tx(): Tx {
//     return this.exTx.tx;
//   }
//
//   txHash(): Uint8Array {
//     return this.exTx.tx.hash;
//   }
//
//   wasmFromPkgId(pkgId: Uint8Array): WasmContainer {
//     return this.pkgs.wasmForPackageId(pkgId);
//   }
}
