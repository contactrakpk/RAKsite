import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root = new URL('../..', import.meta.url);

const read = async (relativePath) => fs.readFile(new URL(relativePath, root), 'utf8');

test('schema-safe ordering, cache busting, and loader recovery are configured', async () => {
  const indexHtml = await read('index.html');
  const cmsHtml = await read('cms.html');
  const configJs = await read('assets/js/config.js');
  const scriptJs = await read('assets/js/script.js');

  assert.match(indexHtml, /assets\/js\/script\.js\?v=20260925simplequery/);
  assert.match(cmsHtml, /assets\/js\/config\.js\?v=20260925schemafix/);
  assert.match(configJs, /localhost:8787/);
  assert.match(configJs, /raksite\.pages\.dev|raksite-api\.onrender\.com/);
  assert.match(scriptJs, /runSupabaseSimpleQuery|sort\(\(a, b\) => \(Number\(b\.id\) \|\| 0\) - \(Number\(a\.id\) \|\| 0\)\)/);
  assert.match(scriptJs, /forceHideLoader|AbortController|timed out/);
  assert.match(scriptJs, /return \[\];/);
});
