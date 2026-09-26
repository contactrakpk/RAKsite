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
  assert.match(indexHtml, /assets\/css\/styles\.css\?v=20260926searchandmobilefix/);
  assert.match(await read('assets/css/styles.css'), /\.search-box \{[\s\S]*?width: 100%;[\s\S]*?max-width: 180px;[\s\S]*?height: 36px;[\s\S]*?overflow: hidden;/);
  assert.match(await read('assets/css/styles.css'), /\.search-icon \{[\s\S]*?width: 16px !important;[\s\S]*?height: 16px !important;[\s\S]*?min-width: 16px !important;[\s\S]*?max-width: 16px !important;[\s\S]*?flex-shrink: 0;/);
  assert.match(cmsHtml, /assets\/js\/config\.js\?v=20260925schemafix/);
  assert.match(cmsHtml, /error\?\.code==='PGRST204'/);
  assert.match(cmsHtml, /const \{is_featured,\.\.\.fallbackPayload\}=updatePayload/);
  assert.match(cmsHtml, /\.eq\('id',product\.id\)/);
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
  assert.match(scriptJs, /className = 'category-products-view-all'/);
  assert.match(scriptJs, /textContent = 'View All →'/);
  assert.match(stylesCss, /\.category-products-slider \{[\s\S]*?display: grid !important/);
  assert.match(stylesCss, /@media \(max-width: 768px\) \{[\s\S]*?\.category-products-slider \{[\s\S]*?display: flex !important;[\s\S]*?overflow-x: auto;[\s\S]*?scroll-snap-type: x mandatory;/);
  assert.match(stylesCss, /\.category-products-view-all \{[\s\S]*?min-width: 140px;[\s\S]*?min-height: 200px;/);
});
