#!/usr/bin/env node
/**
 * build-browser.js — bundle the ESM library + its deps into a single browser file.
 *
 * Prereq:  npm install        (must resolve compact-delta + litepack — see README)
 *          npm install -D esbuild
 *
 * Run:     node build-browser.js
 *
 * Output:  dist/stable-webrtc.browser.js       (IIFE, sets window.StableWebRTC)
 *          dist/stable-webrtc.browser.min.js    (minified)
 *
 * Why a bundler (and not a concat script): the library and compact-delta are
 * ESM, and litepack is UMD/CJS — native browser ESM can't default-import a CJS
 * module, so the deps must be bundled. esbuild resolves all of that.
 */
import * as esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'dist');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// A tiny generated entry: import the engine and expose it as a browser global.
const entry = {
  contents:
    "import StableWebRTC from './src/engine.js';\n" +
    "if (typeof window !== 'undefined') window.StableWebRTC = StableWebRTC;\n" +
    "export default StableWebRTC;\n",
  resolveDir: ROOT,
  loader: 'js',
};

const common = {
  stdin: entry,
  bundle: true,
  format: 'iife',
  globalName: 'StableWebRTCModule', // namespace; the entry also sets window.StableWebRTC
  platform: 'browser',
  target: ['es2020'],
  // The Node-only zlib path is guarded by `typeof require !== 'undefined'`,
  // so it never runs in the browser. Mark it external so esbuild leaves it be
  // instead of failing to resolve a Node builtin.
  external: ['zlib'],
  legalComments: 'none',
};

await esbuild.build({
  ...common,
  outfile: path.join(OUT, 'stable-webrtc.browser.js'),
});
await esbuild.build({
  ...common,
  minify: true,
  outfile: path.join(OUT, 'stable-webrtc.browser.min.js'),
});

for (const f of ['stable-webrtc.browser.js', 'stable-webrtc.browser.min.js']) {
  const p = path.join(OUT, f);
  const kb = (fs.statSync(p).size / 1024).toFixed(1);
  const ok = fs.readFileSync(p, 'utf8').includes('window.StableWebRTC');
  console.log(`${ok ? '✓' : '✗'} ${path.relative(ROOT, p)}  (${kb} kB)`);
  if (!ok) process.exitCode = 1;
}
