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
  keepNames: true,
  plugins: [
    makeAllPackagesExternalPlugin
  ]
})

esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aldea.bundle.min.js',
  globalName: 'aldea',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es6',
  minify: true,
  keepNames: true,
  sourcemap: true,
  plugins: [
    makeAllPackagesExternalPlugin
  ]
})
