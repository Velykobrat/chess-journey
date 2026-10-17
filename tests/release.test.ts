import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const read = (file:string) => fs.readFileSync(new URL('../'+file,import.meta.url));
test('release version and lock root agree; the known source-map-js advisory is patched',()=>{
  const pkg=JSON.parse(read('package.json').toString()),lock=JSON.parse(read('package-lock.json').toString());
  assert.equal(pkg.version,'1.0.0');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
  assert.deepEqual(lock.packages[''].dependencies,pkg.dependencies);assert.deepEqual(lock.packages[''].devDependencies,pkg.devDependencies);
  assert.equal(lock.packages['node_modules/source-map-js'].version,'1.2.2');assert.equal(pkg.license,'MIT');
});
test('HTML has product metadata and a real 1200x630 PNG social preview and chess favicon',()=>{
  const html=read('index.html').toString();assert.match(html,/<html lang="en">/);assert.match(html,/<title>Chess Journey — Play Chess Against Stockfish<\/title>/);
  assert.match(html,/<meta name="description" content="[^"\n]{40,}"/);assert.match(html,/rel="canonical" href="https:\/\/chess-journey.vercel.app\/"/);
  for(const property of ['og:title','og:description','og:site_name','og:type','og:url','og:image','og:image:alt'])assert(html.includes(`property="${property}"`));
  const png=read('public/social-preview.png');assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
  assert.match(read('public/favicon.svg').toString(),/<title>Chess Journey<\/title>/);assert.doesNotMatch(read('public/favicon.svg').toString(),/#863bff/);
});
test('Stockfish WASM provenance and bundled GPL text/source notices are present',()=>{
  assert.equal(createHash('sha256').update(read('public/stockfish/stockfish-19-lite-single.wasm')).digest('hex'),'57ac2d72312aba346760e3f173f687a8c211208e97a87268436f7f0e10bb5387');
  assert.match(read('public/stockfish/stockfish-19-lite-single.js').toString(),/License: GPLv3/);
  assert.match(read('public/stockfish/Copying.txt').toString(),/GNU GENERAL PUBLIC LICENSE/);
  assert.match(read('public/stockfish/SOURCE.md').toString(),/archive\/refs\/tags\/v19\.0\.0\.tar\.gz/);
  assert.match(read('THIRD_PARTY_NOTICES.md').toString(),/does not relicense Stockfish/);
});
