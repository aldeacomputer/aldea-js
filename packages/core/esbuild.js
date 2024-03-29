import esbuild from 'esbuild'

const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

// ESM bundle general
esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aldea.core.bundle.mjs',
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

// ESM bundle browser
esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aldea.core.bundle.browser.mjs',
  bundle: true,
  format: 'esm',
  platform: 'browser',
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
  outfile: 'dist/aldea.core.bundle.cjs',
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
  outfile: 'dist/aldea.core.bundle.min.js',
  globalName: 'AldeaCore',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'esnext',
  minify: true,
  keepNames: true,
  sourcemap: true,
})
