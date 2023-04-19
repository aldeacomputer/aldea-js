import esbuild from 'esbuild'

const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

// ESM bundle
await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/wallet-lib.bundle.mjs',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'esnext',
  minify: false,
  keepNames: true,
  sourcemap: true,
  plugins: [
    makeAllPackagesExternalPlugin
  ]
})
