import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'api-doctor-cli': 'src/cli/api-doctor-cli.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  splitting: false,
  treeshake: true,
  minify: false,
  outDir: 'dist',
  // Suppress named+default export warning: this package intentionally exports
  // both `why` (named) and `why` (default) for maximum consumer flexibility.
  loader: {
    '.html': 'text',
  },
  esbuildOptions(options) {
    options.logOverride = { 'commonjs-variable-in-esm': 'silent' };
  },
  // Ensure .cjs extension for CJS output (for packageExports compatibility)
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
