import fs from 'fs'
import { basename, dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'
import { ASTBuilder } from 'assemblyscript'
import asc from 'assemblyscript/asc'
import { Command } from 'commander'
import { useCtx } from './transform.js'
import { abiToCbor, abiToJson } from './abi.js'
import { TransformCtx } from './transform/ctx.js'

const baseDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const baseOpts = [
  '--debug', // delete eventually
  '-Ospeed',
  '--runtime', 'stub',
  '--exportRuntime',
  '--enable', 'simd',
  '--importMemory',
  '--exportStart',
  '--lib', './'+relative(process.cwd(), join(baseDir, 'lib')),
  '--transform', './'+relative(process.cwd(), join(baseDir, 'dist/transform.js'))
]

export interface CompiledOutput {
  abi: Uint8Array;
  wasm: Uint8Array;
  wat?: string;
}

export interface CompilerResult {
  output: CompiledOutput;
  stats: asc.Stats;
  stdout: asc.OutputStream;
}

/**
 * Compiles AssemblyScript code using the given parameters.
 * 
 * This method is a Command action, designed to be called from Commander.
 */
export async function compileCommand(src: string, opts: any, cmd: Command): Promise<void> {
  const srcPath = relative(process.cwd(), src)
  const outPath = opts.output ?
    relative(process.cwd(), opts.output as string) :
    join(dirname(srcPath), basename(srcPath).replace(/\.\w+$/, '')+'.wasm')

  if (!fs.existsSync(srcPath)) {
    cmd.error(`file does not exist: ${src}`)
  }

  const argv = [
    srcPath,
    '--outFile', outPath,
    '--textFile', outPath.replace('.wasm', '.wat'),
    '--sourceMap', // delete eventually
  ].concat(baseOpts)

  const { error, stdout, stderr, stats } = await asc.main(argv)

  if (!error) {
    const ctx = useCtx()
    writeAbi(outPath, ctx)
    console.log('»»» TRANSFORMED «««')
    console.log('*******************')
    console.log(ASTBuilder.build(ctx.entry))
    console.log(stderr.toString())
    console.log("Compilation success: ")
    console.log(stats.toString())
    console.log(stdout.toString())
  } else {
    console.log("Compilation failed: " + error.message)
    console.log(stderr.toString())
  }
}

/**
 * Compiles the given AssemblyScript code string into a WASM binary.
 */
export async function compile(src: string | {[key: string]: string}): Promise<CompilerResult> {
  const input: {[key: string]: string} = typeof src === 'string' ? { 'input.ts': src } : src
  const output: Partial<CompiledOutput> = {}

  const argv = Object.keys(input).concat([
    '--outFile', 'wasm',
    '--textFile', 'wat',
  ]).concat(baseOpts)

  const { error, stdout, stderr, stats } = await asc.main(argv, {
    readFile(filename, basedir) {
      if (input[filename]) return input[filename]
      try {
        return fs.readFileSync(join(basedir, filename), 'utf8')
      } catch(e) {
        return null
      }
    },
    writeFile(filename, content) {
      // @ts-ignore
      output[filename] = content
    },
    listFiles(dirname, basedir) {
      return fs.readdirSync(join(basedir, dirname)).filter(dir => /\.ts$/.test(dir))
    }
  })

  if (error) {
    const compileError = new CompileError(error.message, stderr)
    compileError.stack = error.stack
    throw compileError
  } else {
    const ctx = useCtx()
    output.abi = new Uint8Array(abiToCbor(ctx.abi))
    return {
      output: output as CompiledOutput,
      stats,
      stdout,
    }
  }
}

function writeAbi(outPath: string, ctx: TransformCtx) {
  fs.writeFileSync(
    join(dirname(outPath), basename(outPath).replace(/\.\w+$/, '')+'.abi.cbor'),
    Buffer.from(abiToCbor(ctx.abi))
  )
  fs.writeFileSync(
    join(dirname(outPath), basename(outPath).replace(/\.\w+$/, '')+'.abi.json'),
    abiToJson(ctx.abi, 2)
  )
}

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
