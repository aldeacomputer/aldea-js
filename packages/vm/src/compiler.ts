import {CompilerResult} from "@aldea/compiler";
import {PkgData} from "./storage.js";
import {calculatePackageId} from "./calculate-package-id.js";
import {abiFromCbor} from "@aldea/compiler/abi";


export type CodeBundle = { [key: string]: string }
export type CompileFn = (entry: string[], src: CodeBundle) => Promise<CompilerResult>;

export class Compiler {
  private compile: CompileFn;

  constructor(compile: CompileFn) {
    this.compile = compile
  }

  async compileSources (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    const id = calculatePackageId(entries, sources)

    const obj: {[key: string]: string} = {}
    for (const [key, value] of sources.entries()) {
      obj[key] = value
    }

    const result = await this.compile(entries, obj)

    return new PkgData(
      abiFromCbor(result.output.abi.buffer),
      Buffer.from(result.output.docs || ''),
      entries,
      id,
      new WebAssembly.Module(result.output.wasm),
      sources,
      result.output.wasm
    )
  }
}
