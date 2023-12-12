import fs from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { build } from 'esbuild'
import { globSync } from 'glob'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'

const __dirname = dirname(fileURLToPath(import.meta.url))
const libDir = join(__dirname, 'lib')

const libPlugin = {
  name: 'aldealib',
  setup: (build) => {
    build.onResolve({ filter: /lib\/generated\.js$/ }, args => {
      return {
        path: join(args.resolveDir, args.path),
        watchFiles: globSync(join(libDir, '**/!(*.d).ts')).filter(p => !/__tests__/.test(p))
      }
    })

    build.onLoad({ filter: /lib\/generated\.js$/ }, argc => {
      const libFiles = globSync('**/!(*.d).ts', { cwd: libDir, posix: true })
        .filter(p => !/__tests__/.test(p))
        .sort()
        .reduce((obj, fileName) => {
          const filePath = join(libDir, fileName)
          obj[fileName] = fs.readFileSync(filePath, { encoding: 'utf8' }).replace(/\r\n/g, '\n')
          return obj
        }, {})

      const out = ['// GENERATED MAPPING OF ALDEA STANDARD LIB']
      out.push(`export const aldeaLib = ${JSON.stringify(libFiles)}`)
      const contents = out.join('\n')
      return { contents, loader: 'js' }
    })
  }
}

const allExternalsPlugin = {
  name: 'all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

// Single file compiler build
build({
  entryPoints: ['src/compiler.ts'],
  outfile: 'dist/compiler.sfc.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'esnext',
  minify: false,
  keepNames: true,
  sourcemap: false,
  define: {
    'globalThis.global': 'globalThis',
    'globalThis.process': 'undefined',
  },
  inject: [
    'fast-text-encoding'
  ],
  plugins: [
    polyfillNode({
      globals: {
        navigator: true,
      },
      polyfills: {
        fs: 'empty',
        module: 'empty',
        path: 'empty',
        url: 'empty',
      }
    }),
    libPlugin,
  ]
})

// Node compiler build
build({
  entryPoints: ['src/compiler.ts'],
  outfile: 'dist/compiler.node.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'esnext',
  minify: false,
  keepNames: true,
  sourcemap: false,
  plugins: [
    libPlugin,
    allExternalsPlugin,
  ]
})