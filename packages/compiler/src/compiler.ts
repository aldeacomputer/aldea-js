import fs from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import asc from 'assemblyscript/asc'
import { AscTransform, Transform } from './transform.js'

export { PackageParser } from './package/parser.js'
export { writeDependency } from './package/code-helpers.js'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const extension = '.ts'
const extension_re_except_d = new RegExp('^(?!.*\\.d\\' + extension + '$).*\\' + extension + '$')

const baseOpts = [
  '--debug', // delete eventually
  '-Ospeed',
  '--runtime', 'stub',
  '--enable', 'simd',
  '--importMemory',
  '--exportRuntime',
  '--exportStart',
  '--allowRestarts',
  '--lib', join(rootDir, 'lib'),
]

export interface CompiledOutput {
  abi: Uint8Array;
  docs?: string;
  wasm: Uint8Array;
  wat?: string;
}

export interface CompilerResult {
  output: CompiledOutput;
  stats: asc.Stats;
  stdout: asc.OutputStream;
}

/**
 * Compiles the given AssemblyScript code string into a WASM binary.
 */
export async function compile(src: string | Map<string, string>): Promise<CompilerResult>;
export async function compile(entry: string[], src: Map<string, string>, deps: Map<string, string>): Promise<CompilerResult>;
export async function compile(
  entry: string | string[] | Map<string, string>,
  src: Map<string, string> = new Map(),
  deps: Map<string, string> = new Map(),
): Promise<CompilerResult> {
  if (!Array.isArray(entry)) {
    if (typeof entry === 'string') {
      return compile(['main.ts'], new Map<string, string>([['main.ts',  entry]]), src)
    } else {
      return compile([...entry.keys()], entry, src)
    }
  }

  entry.forEach(e => {
    if (!src.has(e)) {
      throw new Error(`given entry not found in source code: ${e}`)
    }
  })

  const output: Partial<CompiledOutput> = {}

  const argv = entry.concat([
    '--outFile', 'wasm',
    '--textFile', 'wat',
  ]).concat(baseOpts)

  function readFile(filename: string, baseDir: string): string | null {
    if (src.has(filename)) { return src.get(filename)! }
    const m = filename.match(/^(pkg:\/\/([a-f0-9]{2})+).ts/)
    if (m && deps.has(m[1])) { return deps.get(m[1])! }
    try { return fs.readFileSync(join(baseDir, filename), 'utf8') }
    catch(e) { return null } 
  }

  function listFiles(dirname: string, baseDir: string): string[] {
    return fs.readdirSync(resolve(baseDir, dirname)).filter(file => {
      return extension_re_except_d.test(file)
    })
  }

  function writeFile(filename: string, content: string | Uint8Array): void {
    if (filename === 'abi.json') { return }
    if (filename === 'abi.bin') { filename = 'abi' }
    if (filename === 'docs.json') { filename = 'docs' }
    // @ts-ignore
    output[filename] = content
  }

  const customStdout = asc.createMemoryStream()

  // Create a dynamic transform class as merging the prototype
  // is not safe concurrently
  class DynamicTransform extends Transform implements AscTransform {
    baseDir: string = '.'
    writeFile = writeFile
    log(line: string) { customStdout.write(line + '\n') }
  }

  const transform = new DynamicTransform()
  const { error, stdout, stderr, stats } = await asc.main(argv, {
    readFile,
    listFiles,
    writeFile,
    stdout: customStdout,
    // @ts-ignore
    transforms: [transform]
  })

  if (!error) {
    return {
      output: output as CompiledOutput,
      stats,
      stdout,
    }
  } else {
    const compileError = new CompileError(error.message, stderr)
    compileError.stack = error.stack
    throw compileError
  }
}

///**
// * Compiles AssemblyScript code using the given parameters.
// * 
// * This method is a Command action, designed to be called from Commander.
// */
//export async function compileCommand(src: string, opts: any, cmd: Command): Promise<void> {
//  const baseDir = resolve(process.cwd(), dirname(src))
//  const srcFile = basename(src)
//
//  const outFile = opts.output
//    ? opts.output
//    : srcFile.replace(/\.\w+$/, '.wasm');
//
//  if (!fs.existsSync(join(baseDir, srcFile))) {
//    cmd.error(`file does not exist: ${src}`)
//  }
//
//  const argv = [
//    srcFile,
//    '--baseDir', baseDir,
//    '--outFile', outFile,
//    '--textFile', outFile.replace('.wasm', '.wat'),
//    '--sourceMap', // delete eventually
//  ].concat(baseOpts)
//
//  function listFiles(dirname: string, baseDir: string): string[] {
//    return fs.readdirSync(resolve(baseDir, dirname)).filter(file => {
//      return extension_re_except_d.test(file)
//    })
//  }
//
//  function writeFile(filename: string, contents: string | Uint8Array, baseDir: string): void {
//    if (/^(abi|docs)\.(bin|json)$/.test(filename)) {
//      filename = outFile.replace(/wasm$/, filename)
//    }
//    fs.mkdirSync(resolve(baseDir, dirname(filename)), { recursive: true })
//    fs.writeFileSync(join(baseDir, filename), contents)
//  }
//
//  const customStdout = asc.createMemoryStream()
//
//  // Create a dynamic transform class as merging the prototype
//  // is not safe concurrently
//  class DynamicTransform extends Transform implements AscTransform {
//    baseDir: string = baseDir
//    writeFile = writeFile
//    log(line: string) { customStdout.write(line + '\n') }
//  }
//
//  const transform = new DynamicTransform()
//  const { error, stdout, stderr, stats } = await asc.main(argv, {
//    listFiles,
//    writeFile,
//    stdout: customStdout,
//    // @ts-ignore
//    transforms: [transform]
//  })
//
//  if (!error) {
//    console.log("Compilation success: ")
//    console.log(stats.toString())
//    console.log(stdout.toString())
//  } else {
//    // useful to uncomment this to debug failed compilation
//    // transform.$ctx?.entries.forEach(entry => { console.log(ASTBuilder.build(entry)) })
//    console.log("Compilation failed: " + error.message)
//    console.log(stderr.toString())
//  }
//}

/**
 * Compile Error class
 */
export class CompileError extends Error {
  stderr: asc.OutputStream;

  constructor(message: string, stderr: asc.OutputStream) {
    super(message)
    this.stderr = stderr
  }
}
