import fs from 'fs'
import { basename, dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import asc from 'assemblyscript/asc'
import { Command } from 'commander'
import Transform from './transform.js'

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
  '--lib', join(rootDir, 'lib'),
  '--transform', join(rootDir, 'dist/transform.js')
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
  const baseDir = resolve(process.cwd(), dirname(src))
  const srcFile = basename(src)
  const outFile = srcFile.replace(/\.\w+$/, '.wasm')

  if (!fs.existsSync(join(baseDir, srcFile))) {
    cmd.error(`file does not exist: ${src}`)
  }

  const argv = [
    srcFile,
    '--baseDir', baseDir,
    '--outFile', outFile,
    '--textFile', outFile.replace('.wasm', '.wat'),
    '--sourceMap', // delete eventually
  ].concat(baseOpts)

  const { error, stdout, stderr, stats } = await asc.main(argv, {
    listFiles(dirname, baseDir) {
      return fs.readdirSync(resolve(baseDir, dirname)).filter(file => {
        return extension_re_except_d.test(file)
      })
    },
    writeFile(filename, contents, baseDir) {
      if (/^abi\.(cbor|json)$/.test(filename)) {
        filename = outFile.replace(/wasm$/, filename)
      }
      fs.mkdirSync(resolve(baseDir, dirname(filename)), { recursive: true })
      fs.writeFileSync(join(baseDir, filename), contents)
    },
  })

  if (!error) {
    console.log("Compilation success: ")
    console.log(stats.toString())
    console.log(stdout.toString())
  } else {
    console.log("Compilation failed: " + error.message)
    console.log(stderr.toString())
  }
}

type CodeBundle = { [key: string]: string }

/**
 * Compiles the given AssemblyScript code string into a WASM binary.
 */
export async function compile(src: string): Promise<CompilerResult>;
export async function compile(entry: string | string[], src: CodeBundle): Promise<CompilerResult>;
export async function compile(entry: string | string[], src?: CodeBundle): Promise<CompilerResult> {
  let input: CodeBundle;
  entry = Array.isArray(entry) ? entry : [entry]
  
  if (typeof src === 'object') {
    input = src
  } else {
    input = entry.reduce<CodeBundle>((obj, src, i, all) => {
      const filename = all.length > 1 ? `input${i}.ts` : 'input.ts'
      obj[filename] = src
      return obj
    }, {})
    entry = Object.keys(input)
  }

  entry.forEach(e => {
    if (!Object.keys(input).includes(e)) {
      throw new Error(`given entry not found in source code: ${e}`)
    }
  })

  const output: Partial<CompiledOutput> = {}

  const argv = entry.concat([
    '--outFile', 'wasm',
    '--textFile', 'wat',
  ]).concat(baseOpts)

  const { error, stdout, stderr, stats } = await asc.main(argv, {
    readFile(filename, baseDir) {
      if (input[filename]) return input[filename]
      try {
        return fs.readFileSync(join(baseDir, filename), 'utf8')
      } catch(e) {
        return null
      }
    },
    writeFile(filename, content) {
      if (filename === 'abi.json') { return }
      if (filename === 'abi.cbor') { filename = 'abi' }
      // @ts-ignore
      output[filename] = content
    },
    listFiles(dirname, baseDir) {
      return fs.readdirSync(resolve(baseDir, dirname)).filter(file => {
        return extension_re_except_d.test(file)
      })
    }
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
