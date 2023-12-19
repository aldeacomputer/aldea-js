import {PkgData, Storage} from "./storage.js";
import {CompilerResult, PackageParser, writeDependency} from '@aldea/compiler'
import {abiFromBin, Address, base16, BCS, OpCode, Output, Pointer, Tx, util} from "@aldea/core";
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
  DeployInstruction,
  ExecInstruction,
  FundInstruction,
  ImportInstruction,
  LoadByOriginInstruction,
  LoadInstruction,
  LockInstruction,
  NewInstruction,
  SignInstruction,
  SignToInstruction
} from "@aldea/core/instructions";
import {ExecOpts} from "./export-opts.js";
import {COIN_PKG_ID} from "./well-known-abi-nodes.js";
import {ExecutionError} from "./errors.js";


/**
 * Type for compiling functions. This type follows
 * the type of the basic compile function for @aldea/compiler
 */
export type CompileFn = (entry: string[], src: Map<string, string>, deps: Map<string, string>) => Promise<CompilerResult>;


/**
 * A class representing an Aldea virtual machine (VM).
 *
 * The VM takes and saves data to the `Storage`.
 */
export class VM {
  private readonly storage: Storage;
  private readonly compile: CompileFn;

  /**
   * Creates a new instance of the constructor.
   *
   * @param {Storage} storage - The storage object for retrieving storing data.
   * @param {CompileFn} compile - The compile function to manaage deploys.
   */
  constructor (storage: Storage, compile: CompileFn) {
    this.storage = storage
    this.compile = compile
    this.addPreCompiled(wasm, rawSource, rawAbi, rawDocs, COIN_PKG_ID)
  }

  /**
   * Executes an Aldea transaction. If the execution is correct it saves the result into the
   * storage.
   *
   * @param {Tx} tx - Aldea transaction to execute.
   * @return {Promise<ExecutionResult>} - The result of the execution.
   * @throws {ExecutionError} - When an unknown opcode is encountered.
   */
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
          throw new ExecutionError(`unknown opcode: ${inst.opcode}`)
      }
    }
    const result = currentExec.finalize()
    await this.storage.persistTx(tx)
    await this.storage.persistExecResult(result)
    return result
  }

  /**
   * Compiles the given sources and returns package data. At this point the single line imports are resolved.
   *
   * @param entries - An array of entry points for the package.
   * @param sources - A map of source code files, where the key is the file name and the value is the source code.
   *
   * @returns A Promise that resolves to a PkgData object containing all the data of the package.
   */
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

  /**
   * Adds a pre-compiled module to the storage. This is useful to generate controlled environments or test
   * very specific use cases, but it's not something that a real production node can do.
   *
   * @param {Uint8Array} wasmBin - The binary representation of the WebAssembly module.
   * @param {string} sourceStr - The source code of the module in string format.
   * @param {Uint8Array} abiBin - The binary representation of the module's ABI (Application Binary Interface).
   * @param {Uint8Array} docs - The documentation of the module in binary format.
   * @param {Uint8Array|null} [defaultId=null] - The default package ID. If not provided, it will be calculated based on the entries and sources.
   *
   * @returns {Uint8Array} - The package ID of the added module.
   */
  addPreCompiled (wasmBin: Uint8Array, sourceStr: string, abiBin: Uint8Array, docs: Uint8Array, defaultId: Uint8Array | null = null): Uint8Array {
    const sources = new Map<string, string>()
    sources.set('index.ts',sourceStr.toString())
    const entries = ['index.ts'];
    const hash = defaultId
      ? defaultId
      : calculatePackageId(entries, sources)
    const id = base16.encode(hash)
    if (this.storage.getPkg(id).isPresent()) {
      return hash
    }

    const abi = abiFromBin(abiBin)

    this.storage.addPackage(hash, new PkgData(
      abi,
      docs,
      entries,
      hash,
      new WebAssembly.Module(wasmBin),
      sources,
      wasmBin
    ))
    return hash
  }

  /**
   * Mint 1 coin with the given amount and locked to the given address. This method
   * goes outside consensus and is meant to be used in development environments.
   *
   * @param {Address} address - The address to mint the output for.
   * @param {number} [amount=1e6] - The amount of the output. Defaults to 1e6.
   * @param {Uint8Array} [locBuf] - Optional location buffer to use. If not provided, a random location buffer will be generated.
   *
   * @return {Output} The minted output.
   */
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
