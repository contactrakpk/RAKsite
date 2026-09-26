import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET ||= 'local-test-secret-at-least-32-characters-long';
const { app, calculateOrderQuote, pool } = await import('../server.js');

const productId = 'c3d1b68e-6c6f-48b9-a0e6-b60f95cc35c0';
const products = [{
  id: productId,
  name: 'Training Shoes',
  category: 'Sports',
  images: ['shoes.webp'],
  variations: [
    { name: 'Small', price: '7.25' },
    { name: 'Large', price: '9.99' }
  ]
}];

test('order quote uses catalog prices and configured shipping, not client prices', () => {
  const quote = calculateOrderQuote([
    { productId, variation: 'Large', quantity: 2, price: 0.01 }
  ], products, 180);

  assert.equal(quote.items[0].price, 9.99);
  assert.equal(quote.items[0].quantity, 2);
  assert.equal(quote.shipping, 180);
  assert.equal(quote.total, 199.98);
  assert.deepEqual(quote.items[0].images, ['shoes.webp']);
});

test('order quote rejects invalid quantities and unavailable products', () => {
  assert.throws(() => calculateOrderQuote([{ productId, quantity: 1.5 }], products, 180), { statusCode: 400 });
  assert.throws(() => calculateOrderQuote([{ productId, quantity: 51 }], products, 180), { statusCode: 400 });
  assert.throws(() => calculateOrderQuote([{ productId: 'missing', quantity: 1 }], products, 180), { statusCode: 400 });
});

test('order API persists catalog prices instead of forged client totals', async () => {
  const originalQuery = pool.query;
  pool.query = async (query, params = []) => {
    if (query.includes('FROM products WHERE id')) return { rows: [{ id: productId, name: 'Training Shoes', category: 'Sports', status: 'published' }] };
    if (query.includes('FROM product_variations WHERE')) return { rows: [{ product_id: productId, name: 'Large', price: '9.99' }] };
    if (query.includes('FROM product_images WHERE')) return { rows: [{ product_id: productId, image_url: 'shoes.webp' }] };
    if (query.includes('FROM settings WHERE')) return { rows: [{ value: '180' }] };
    if (query.includes('INSERT INTO orders')) {
      return { rows: [{ order_number: params[0], created_at: '2026-09-26T12:00:00.000Z', items: JSON.parse(params[9]), shipping: params[10], total: params[11] }] };
    }
    throw new Error(`Unexpected order query: ${query}`);
  };
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: 'Test Customer', email: 'customer@gmail.com', phone: '12345678901', address: '1 Main Street', city: 'Karachi' },
        items: [{ productId, variation: 'Large', quantity: 2, price: 0.01 }],
        shipping: 0,
        total: 0.02
      })
    });
    const savedOrder = await response.json();
    assert.equal(response.status, 201);
    assert.equal(savedOrder.items[0].price, 9.99);
    assert.equal(savedOrder.shipping, 180);
    assert.equal(savedOrder.total, 199.98);
  } finally {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('health responds without requiring a database connection', async () => {
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, service: 'RAK API' });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('public content route returns normalized product catalog data', async () => {
  const originalQuery = pool.query;
  const databaseRows = new Map([
    ['FROM products', [{ id: productId, name: 'Training Shoes', category: 'Sports', short_description: 'Lightweight', description: 'Running shoes', status: 'published', is_featured: true }]],
    ['FROM product_images', [{ product_id: productId, image_url: 'shoes.webp', sort_order: 0 }]],
    ['FROM product_variations', [{ product_id: productId, name: 'Large', price: '9.99', sort_order: 0 }]],
    ['FROM product_variation_images', [{ product_id: productId, variation_name: 'Large', image_url: 'large-shoes.webp', sort_order: 0 }]],
    ['FROM pages', []],
    ['FROM videos', []],
    ['FROM reviews', []],
    ['FROM settings', []]
  ]);
  pool.query = async (query) => {
    const match = [...databaseRows].find(([fragment]) => query.includes(fragment));
    if (!match) throw new Error(`Unexpected catalog query: ${query}`);
    return { rows: match[1] };
  };
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/content`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.products[0].id, productId);
    assert.equal(payload.products[0].status, 'published');
    assert.equal(payload.products[0].price, 9.99);
    assert.deepEqual(payload.products[0].images, ['shoes.webp']);
    assert.deepEqual(payload.products[0].variations[0].images, ['large-shoes.webp']);
  } finally {
    pool.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('CORS allows the production frontend and local development origins', async () => {
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${server.address().port}/health`;
    const productionResponse = await fetch(url, { headers: { Origin: 'https://raksite.pages.dev' } });
    const localResponse = await fetch(url, { headers: { Origin: 'http://localhost:8080' } });
    const untrustedResponse = await fetch(url, { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(productionResponse.headers.get('access-control-allow-origin'), 'https://raksite.pages.dev');
    assert.equal(localResponse.headers.get('access-control-allow-origin'), 'http://localhost:8080');
    assert.equal(untrustedResponse.headers.get('access-control-allow-origin'), null);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});