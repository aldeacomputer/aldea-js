import esbuild from 'esbuild'

// ESM bundle general
esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aldea-c.fat.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  minify: false,
  keepNames: true
})
