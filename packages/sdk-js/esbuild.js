import esbuild from 'esbuild'

const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aldea.bundle.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node16',
  minify: false,
  keepNames: true,
  sourcemap: true,
  plugins: [
    makeAllPackagesExternalPlugin
  ]
})

esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aldea.bundle.min.js',
  globalName: 'aldeaJS',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  minify: true,
  keepNames: true,
  sourcemap: true,
  target: 'esnext',
})

esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aldea.browser.cjs',
  globalName: 'aldeaJS',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  minify: false,
  keepNames: true,
  sourcemap: true,
  target: 'esnext',
})
