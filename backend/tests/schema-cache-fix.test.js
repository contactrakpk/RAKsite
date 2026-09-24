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

  assert.match(indexHtml, /assets\/js\/script\.js\?v=20260925cardfix/);
  assert.match(cmsHtml, /assets\/js\/config\.js\?v=20260925schemafix/);
  assert.match(configJs, /localhost:8787/);
  assert.match(configJs, /raksite\.pages\.dev|raksite-api\.onrender\.com/);
  assert.match(scriptJs, /product\.image_url \|\| product\.image \|\| product\.featured_image \|\| 'assets\/images\/placeholder\.jpg'/);
  assert.match(scriptJs, /product\.price \|\| product\.base_price \|\| \(product\.product_variations && product\.product_variations\[0\]\?\.price\) \|\| 0/);
  assert.match(scriptJs, /runSupabaseSimpleQuery|localeCompare\(String\(a\.id \|\| ''\)\)/);
  assert.match(scriptJs, /forceHideLoader|AbortController|timed out/);
  assert.match(scriptJs, /return \[\];/);
});
