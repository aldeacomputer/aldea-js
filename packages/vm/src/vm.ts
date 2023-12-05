import {PkgData, Storage} from "./storage.js";
import {CompilerResult, PackageParser, writeDependency} from '@aldea/compiler'
import {abiFromBin, Address, BCS, OpCode, Output, Pointer, Tx, util} from "@aldea/core";
import {calculatePackageId} from "./calculate-package-id.js";
import {Buffer} from "buffer";
import {data as wasm} from './builtins/coin.wasm.js'
import {data as rawAbi} from './builtins/coin.abi.bin.js'
import {data as rawDocs} from './builtins/coin.docs.json.js'
import {data as rawSource} from './builtins/coin.source.js'
import {AddressLock} from "./locks/address-lock.js";
import {ExecutionResult} from "./execution-result.js";
import {StorageTxContext} from "./tx-context/storage-tx-context.js";
import {TxExecution} from "./tx-execution.js";
import {
  CallInstruction,
  ImportInstruction,
  LoadByOriginInstruction,
  LoadInstruction,
  NewInstruction,
  ExecInstruction, FundInstruction, LockInstruction, DeployInstruction, SignInstruction, SignToInstruction
} from "@aldea/core/instructions";
import {ExecOpts} from "./export-opts.js";

// Magic Coin Pkg ID
const COIN_PKG_ID = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
])

export type CompileFn = (entry: string[], src: Map<string, string>, deps: Map<string, string>) => Promise<CompilerResult>;

export class VM {
  private readonly storage: Storage;
  private readonly compile: CompileFn;

  constructor (storage: Storage, compile: CompileFn) {
    this.storage = storage
    this.compile = compile
    this.addPreCompiled(wasm, rawSource, rawAbi, rawDocs, COIN_PKG_ID)
  }

  async execTx(tx: Tx): Promise<ExecutionResult> {
    const context = new StorageTxContext(tx.hash, tx.signers(), this.storage, this)
    const currentExec = new TxExecution(context, ExecOpts.default())

    for (const inst of tx.instructions) {
      switch (inst.opcode) {
        case OpCode.IMPORT:
          const importIns = inst as ImportInstruction;
          currentExec.import(importIns.pkgId);
          break
        case OpCode.LOAD:
          const loadIns = inst as LoadInstruction;
          currentExec.load(loadIns.outputId);
          break
        case OpCode.LOADBYORIGIN:
          const loadByOrigin = inst as LoadByOriginInstruction;
          currentExec.loadByOrigin(loadByOrigin.origin);
          break
        case OpCode.NEW:
          const instantiate = inst as NewInstruction;
          currentExec.instantiate(instantiate.idx, instantiate.exportIdx, instantiate.argsBuf);
          break
        case OpCode.CALL:
          const call = inst as CallInstruction;
          currentExec.call(call.idx, call.methodIdx, call.argsBuf);
          break
        case OpCode.EXEC:
          const exec = inst as ExecInstruction;
          currentExec.exec(exec.idx, exec.exportIdx, exec.argsBuf);
          break
        case OpCode.FUND:
          const fund = inst as FundInstruction;
          currentExec.fund(fund.idx);
          break
        case OpCode.LOCK:
          const lock = inst as LockInstruction;
          currentExec.lockJig(lock.idx, new Address(lock.pubkeyHash));
          break
        case OpCode.DEPLOY:
          const deploy = inst as DeployInstruction;
          const [ entries, files] = BCS.pkg.decode(deploy.pkgBuf);
          await currentExec.deploy(entries, files);
          break
        case OpCode.SIGN:
          const sign = inst as SignInstruction;
          currentExec.sign(sign.sig, sign.pubkey)
          break
        case OpCode.SIGNTO:
          const signTo = inst as SignToInstruction;
          currentExec.signTo(signTo.sig, signTo.pubkey)
          break
        default:
          throw new Error(`unknown opcode: ${inst.opcode}`)
      }
    }
    const result = currentExec.finalize()
    this.storage.persistTx(tx)
    this.storage.persistExecResult(result)
    return result
  }

  // async execTxFromInputs(exTx: ExtendedTx) {
  //   const context = new ExTxExecContext(exTx, this.clock, this.pkgs, this)
  //   const currentExecution = new TxExecution(context)
  //   const result = await currentExecution.run()
  //   this.storage.persist(result)
  //   return result
  // }

  async compileSources (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    const id = calculatePackageId(entries, sources)

    const pkg = await PackageParser.create(entries, {
      getSrc: (src) => sources.get(src),
      getDep: (pkgId) => {
        const { abi } = this.storage.getPkg(pkgId).get()
        return writeDependency(abi)
      }, 
    })

    const result = await this.compile(pkg.entries, pkg.code, pkg.deps)

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

  addPreCompiled (wasmBin: Uint8Array, sourceStr: string, abiBin: Uint8Array, docs: Uint8Array, defaultId: Uint8Array | null = null): Uint8Array {
    const sources = new Map<string, string>()
    sources.set('index.ts',sourceStr.toString())
    const entries = ['index.ts'];
    const id = defaultId
      ? defaultId
      : calculatePackageId(entries, sources)
    if (this.storage.hasModule(id)) {
      return id
    }

    const abi = abiFromBin(abiBin)

    this.storage.addPackage(id, new PkgData(
      abi,
      docs,
      entries,
      id,
      new WebAssembly.Module(wasmBin),
      sources,
      wasmBin
    ))
    return id
  }

  mint (address: Address, amount: number = 1e6, locBuf?: Uint8Array): Output {
    const location = locBuf
      ? new Pointer(locBuf, 0)
      : new Pointer(util.randomBytes(32), 0);
    const bcs = new BCS({})
    const minted = new Output(
      location,
      location,
      new Pointer(COIN_PKG_ID, 0),
      new AddressLock(address).coreLock(),
      bcs.encode('u64', amount)
    )
    this.storage.addUtxo(minted)
    return minted
  }
}
