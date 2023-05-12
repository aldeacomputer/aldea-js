import esbuild from 'esbuild'

const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

// ESM bundle
esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aldea.sdk.bundle.mjs',
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

// CJS bundle
esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aldea.sdk.bundle.cjs',
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
  outfile: 'dist/aldea.sdk.bundle.min.js',
  globalName: 'AldeaSDK',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'esnext',
  minify: true,
  keepNames: true,
  sourcemap: true,
})
