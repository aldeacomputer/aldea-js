import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/vm.bundle.mjs',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'esnext',
  minify: false,
  keepNames: true,
  sourcemap: true
})
