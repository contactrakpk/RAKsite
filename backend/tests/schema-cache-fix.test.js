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

  assert.match(indexHtml, /assets\/js\/script\.js\?v=20260926sliderandfeatured/);
  assert.match(cmsHtml, /assets\/js\/config\.js\?v=20260925schemafix/);
  assert.match(configJs, /localhost:8787/);
  assert.match(configJs, /raksite\.pages\.dev|raksite-api\.onrender\.com/);
  assert.match(scriptJs, /product\.short_description \|\| product\.shortDescription \|\| product\.description \|\| product\.fullDescription/);
  assert.match(scriptJs, /product\.fullDescription \|\| product\.description \|\| ''/);
  assert.match(scriptJs, /runSupabaseSimpleQuery\('product_variations', '\*'\)|runSupabaseSimpleQuery\('product_images', '\*'\)|productVariationMap|productImageMap/);
  assert.match(scriptJs, /runSupabaseSimpleQuery\('products', '\*'/);
  assert.match(scriptJs, /forceHideLoader|AbortController|timed out/);
  assert.match(scriptJs, /return \[\];/);
});

test('featured products are persisted and rendered in category sliders', async () => {
  const cmsHtml = await read('cms.html');
  const schemaSql = await read('backend/schema.sql');
  const scriptJs = await read('assets/js/script.js');
  const stylesCss = await read('assets/css/styles.css');

  assert.match(cmsHtml, /name="is_featured"/);
  assert.match(cmsHtml, /featuredCount>=6/);
  assert.match(cmsHtml, /is_featured:product\.is_featured===true/);
  assert.match(schemaSql, /ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(scriptJs, /product\.is_featured === true/);
  assert.match(scriptJs, /\.slice\(0, 6\)/);
  assert.match(scriptJs, /className = 'trending-row category-products-slider'/);
  assert.match(scriptJs, /className = 'view-all-card'/);
  assert.match(stylesCss, /\.category-products-slider \{[\s\S]*?overflow-x: auto !important/);
});
