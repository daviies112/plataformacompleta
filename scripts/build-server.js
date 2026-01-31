#!/usr/bin/env node
import * as esbuild from 'esbuild';

async function build() {
  try {
    console.log('🔨 Building server...');
    
    await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: 'dist/index.mjs',
      external: [
        'pg-native',
        'better-sqlite3',
        'mysql2',
        'tedious',
        'oracledb',
        'pg-query-stream',
        '@aws-sdk/*',
        'fsevents',
        'lightningcss',
        'esbuild',
        '@rollup/rollup-linux-x64-gnu',
        'vite',
        '@vitejs/plugin-react-swc',
      ],
      loader: {
        '.node': 'copy',
      },
      banner: {
        js: `
import { createRequire as _createRequire } from 'module';
import { fileURLToPath as _fileURLToPath } from 'url';
import { dirname as _dirnameFn } from 'path';
const require = _createRequire(import.meta.url);
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirnameFn(__filename);
`,
      },
      sourcemap: false,
      minify: false,
      keepNames: true,
    });
    
    console.log('✅ Server build complete: dist/index.mjs');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
