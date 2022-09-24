import fs from 'fs'
import { basename, dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'
import asc from 'assemblyscript/asc'
import { Command } from 'commander'

const baseDir = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * TODO
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
    '--debug',
    '--sourceMap',
    '--textFile', outPath.replace('.wasm', '.wat'),
    '--runtime', 'stub',
    '--exportRuntime',
    '--importMemory',
    '--lib', relative(process.cwd(), join(baseDir, 'lib')),
    '--transform', './'+relative(process.cwd(), join(baseDir, './dist/transform.js'))
  ])

  if (error) {
    console.log("Compilation failed: " + error.message)
    console.log(stderr.toString())
  } else {
    console.log("Compilation success: ")
    console.log(stats.toString())
    console.log(stdout.toString())
  }
}
