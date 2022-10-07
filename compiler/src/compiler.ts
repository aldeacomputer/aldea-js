import fs from 'fs'
import { basename, dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'
import asc from 'assemblyscript/asc'
import { Command } from 'commander'
import { useCtx } from './transform.js'
import { abiToCbor, abiToJson } from './abi.js'

const baseDir = join(dirname(fileURLToPath(import.meta.url)), '..')

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

  const { error, stdout, stderr, stats } = await asc.main([
    srcPath,
    '--outFile', outPath,
    '--debug',      // delete these eventually
    '--sourceMap',  // ...
    '--textFile', outPath.replace('.wasm', '.wat'),
    '-Ospeed',
    '--runtime', 'stub',
    '--exportRuntime',
    //'--importMemory', - miguel can add this back if needed?
    '--lib', relative(process.cwd(), join(baseDir, 'lib')),
    '--transform', './'+relative(process.cwd(), join(baseDir, './dist/transform.js'))
  ])

  const ctx = useCtx()

  fs.writeFileSync(
    join(dirname(outPath), basename(outPath).replace(/\.\w+$/, '')+'.abi.cbor'),
    Buffer.from(abiToCbor(ctx.abi))
  )
  fs.writeFileSync(
    join(dirname(outPath), basename(outPath).replace(/\.\w+$/, '')+'.abi.json'),
    abiToJson(ctx.abi, 2)
  )

  if (error) {
    console.log("Compilation failed: " + error.message)
    console.log(stderr.toString())
  } else {
    console.log("Compilation success: ")
    console.log(stats.toString())
    console.log(stdout.toString())
  }
}
