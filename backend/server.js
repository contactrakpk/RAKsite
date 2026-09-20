import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 8787);
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
const jwtSecret = process.env.JWT_SECRET;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
const asyncHandler = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error.message);
});

if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long');

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) || false, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

const requireAuth = (request, response, next) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return response.status(401).json({ error: 'Authentication required' });
  try {
    request.admin = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return response.status(401).json({ error: 'Invalid or expired token' });
  }
};

app.get('/health', asyncHandler(async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ ok: true, service: 'rak-commerce-api' });
  } catch {
    response.status(503).json({ ok: false, error: 'Database unavailable' });
  }
}));

app.post('/api/auth/login', rateLimit({ windowMs: 10 * 60 * 1000, limit: 10 }), asyncHandler(async (request, response) => {
  const { email, password } = request.body || {};
  if (!email || !password) return response.status(400).json({ error: 'Email and password are required' });
  const result = await pool.query('SELECT id, email, password_hash FROM admins WHERE lower(email) = lower($1)', [email]);
  const admin = result.rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) return response.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ sub: admin.id, email: admin.email }, jwtSecret, { expiresIn: '8h' });
  response.json({ token, admin: { id: admin.id, email: admin.email } });
}));

app.get('/api/content', asyncHandler(async (_request, response) => {
  const [products, images, variations, pages, videos, reviews, settings] = await Promise.all([
    pool.query("SELECT * FROM products WHERE status = 'published' ORDER BY created_at DESC"),
    pool.query('SELECT * FROM product_images ORDER BY sort_order'),
    pool.query('SELECT * FROM product_variations ORDER BY sort_order'),
    pool.query('SELECT * FROM pages ORDER BY name'),
    pool.query("SELECT * FROM videos WHERE status = 'published' ORDER BY page_slug, sort_order"),
    pool.query("SELECT * FROM reviews WHERE status = 'published' ORDER BY review_date DESC"),
    pool.query('SELECT key, value FROM settings')
  ]);
  const imageMap = images.rows.reduce((map, image) => ((map[image.product_id] ||= []).push(image.image_url), map), {});
  const variationMap = variations.rows.reduce((map, variation) => ((map[variation.product_id] ||= []).push({ name: variation.name, price: Number(variation.price) }), map), {});
  const productMap = products.rows.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    type: product.category,
    description: product.short_description,
    fullDescription: product.description,
    variations: variationMap[product.id] || [],
    price: variationMap[product.id]?.[0]?.price || 0,
    images: imageMap[product.id] || []
  }));
  const productNames = Object.fromEntries(productMap.map((product) => [product.id, product.name]));
  response.json({
    products: productMap,
    pages: Object.fromEntries(pages.rows.map((page) => [page.name || page.slug, { hero: page.hero_url || '', banner: page.banner_url || '' }])),
    videos: videos.rows.map((video) => ({ ...video, video: video.video_url, product: productNames[video.product_id] || '' })),
    reviews: reviews.rows.map((review) => ({ ...review, text: review.body, image: review.image_url || '', product: productNames[review.product_id] || '' })),
    settings: Object.fromEntries(settings.rows.map((item) => [item.key, item.value]))
  });
}));

app.post('/api/orders', asyncHandler(async (request, response) => {
  const { id, customer, items, shipping, total } = request.body || {};
  if (!customer?.name || !customer?.email || !customer?.phone || !customer?.address || !customer?.city || !Array.isArray(items) || !items.length) return response.status(400).json({ error: 'Customer email, phone, address, city, and items are required' });
  if (!/^\d{11}$/.test(String(customer.phone).trim())) return response.status(400).json({ error: 'Phone number must contain exactly 11 digits' });
  if (!/^[^\s@]+@gmail\.com$/i.test(String(customer.email).trim())) return response.status(400).json({ error: 'Email must end with @gmail.com' });
  const orderNumber = String(id || `RAK-${Date.now()}`).slice(0, 80);
  const result = await pool.query(`INSERT INTO orders(order_number, customer_name, customer_email, customer_phone, address, area, city, notes, payment_method, items, shipping, total) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING order_number, created_at`, [orderNumber, customer.name, customer.email, customer.phone, customer.address, customer.area || '', customer.city, customer.notes || '', customer.payment || 'Cash on Delivery', JSON.stringify(items), Number(shipping) || 0, Number(total) || 0]);
  response.status(201).json(result.rows[0]);
}));

app.use('/api/admin', requireAuth);
app.get('/api/admin/me', (request, response) => response.json({ admin: request.admin }));
app.patch('/api/admin/account', async (request, response) => {
  try {
    const { email, password } = request.body || {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) return response.status(400).json({ error: 'Enter a valid admin email' });
    if (typeof password !== 'string' || password.length < 8) return response.status(400).json({ error: 'Password must be at least 8 characters' });
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query('UPDATE admins SET email = $1, password_hash = $2 WHERE id = $3 RETURNING id, email', [email.trim(), passwordHash, request.admin.sub]);
    if (!result.rows[0]) return response.status(404).json({ error: 'Admin account not found' });
    response.json({ admin: result.rows[0] });
  } catch (error) {
    console.error('Admin credential update failed:', error);
    if (error.code === '23505') return response.status(409).json({ error: 'That admin email is already in use.' });
    response.status(500).json({ error: 'Could not update credentials. Check the database connection.' });
  }
});
app.get('/api/admin/products', asyncHandler(async (_request, response) => response.json((await pool.query('SELECT * FROM products ORDER BY created_at DESC')).rows)));
app.get('/api/admin/reviews', asyncHandler(async (_request, response) => response.json((await pool.query('SELECT * FROM reviews ORDER BY review_date DESC')).rows)));
app.get('/api/admin/videos', asyncHandler(async (_request, response) => response.json((await pool.query('SELECT * FROM videos ORDER BY page_slug, sort_order')).rows)));
app.get('/api/admin/orders', asyncHandler(async (_request, response) => response.json((await pool.query('SELECT * FROM orders ORDER BY created_at DESC')).rows)));
app.delete('/api/admin/products/:id', asyncHandler(async (request, response) => {
  const { id } = request.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(8787)');
    const existing = await client.query('SELECT id FROM products WHERE id = $1 LIMIT 1', [id]);
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      return response.status(404).json({ error: 'Product not found' });
    }
    await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
    await client.query('DELETE FROM product_variations WHERE product_id = $1', [id]);
    await client.query('UPDATE reviews SET product_id = NULL WHERE product_id = $1', [id]);
    await client.query('UPDATE videos SET product_id = NULL WHERE product_id = $1', [id]);
    await client.query('DELETE FROM products WHERE id = $1', [id]);
    await client.query('COMMIT');
    response.json({ ok: true, deletedId: id });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));
app.post('/api/admin/content/sync', asyncHandler(async (request, response) => {
  const data = request.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(8787)');
    const incomingProducts = Array.isArray(data.products) ? data.products : [];
    const incomingProductKeys = new Set(incomingProducts.filter((product) => product?.name && product?.category).map((product) => `${product.name}::${product.category}`));
    const existingProducts = await client.query('SELECT id, name, category FROM products');
    for (const existingProduct of existingProducts.rows) {
      const key = `${existingProduct.name}::${existingProduct.category}`;
      if (!incomingProductKeys.has(key)) {
        await client.query('DELETE FROM product_images WHERE product_id = $1', [existingProduct.id]);
        await client.query('DELETE FROM product_variations WHERE product_id = $1', [existingProduct.id]);
        await client.query('UPDATE reviews SET product_id = NULL WHERE product_id = $1', [existingProduct.id]);
        await client.query('UPDATE videos SET product_id = NULL WHERE product_id = $1', [existingProduct.id]);
        await client.query('DELETE FROM products WHERE id = $1', [existingProduct.id]);
      }
    }
    for (const product of incomingProducts) {
      const existing = await client.query('SELECT id FROM products WHERE name = $1 AND category = $2 LIMIT 1', [product.name, product.category]);
      const productResult = existing.rows[0]
        ? await client.query('UPDATE products SET short_description = $1, description = $2, updated_at = now() WHERE id = $3 RETURNING id', [product.description || '', product.fullDescription || product.description || '', existing.rows[0].id])
        : await client.query('INSERT INTO products(name, category, short_description, description) VALUES($1,$2,$3,$4) RETURNING id', [product.name, product.category, product.description || '', product.fullDescription || product.description || '']);
      const productId = productResult.rows[0].id;
      await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
      await client.query('DELETE FROM product_variations WHERE product_id = $1', [productId]);
      for (const [sortOrder, imageUrl] of (product.images || []).entries()) await client.query('INSERT INTO product_images(product_id, image_url, sort_order) VALUES($1,$2,$3)', [productId, imageUrl, sortOrder]);
      for (const [sortOrder, variation] of (product.variations || []).entries()) await client.query('INSERT INTO product_variations(product_id, name, price, sort_order) VALUES($1,$2,$3,$4)', [productId, variation.name, Number(variation.price) || 0, sortOrder]);
    }
    const incomingReviews = (Array.isArray(data.reviews) ? data.reviews : []).filter((review) => review?.title && review?.author && review?.date);
    const incomingReviewKeys = new Set(incomingReviews.map((review) => `${review.title}::${review.author}::${review.date}`));
    const existingReviews = await client.query('SELECT id, title, author, review_date FROM reviews');
    for (const existingReview of existingReviews.rows) {
      const key = `${existingReview.title}::${existingReview.author}::${existingReview.review_date.toISOString().slice(0, 10)}`;
      if (!incomingReviewKeys.has(key)) await client.query('DELETE FROM reviews WHERE id = $1', [existingReview.id]);
    }
    for (const review of incomingReviews) {
      const productResult = await client.query('SELECT id FROM products WHERE name = $1 LIMIT 1', [review.product]);
      const existing = await client.query('SELECT id FROM reviews WHERE title = $1 AND author = $2 AND review_date = $3 LIMIT 1', [review.title, review.author, review.date]);
      if (existing.rows[0]) await client.query('UPDATE reviews SET product_id = $1, body = $2, rating = $3, image_url = $4 WHERE id = $5', [productResult.rows[0]?.id || null, review.text || '', Number(review.rating) || 5, review.image || null, existing.rows[0].id]);
      else await client.query('INSERT INTO reviews(product_id, title, body, author, rating, review_date, image_url) VALUES($1,$2,$3,$4,$5,$6,$7)', [productResult.rows[0]?.id || null, review.title, review.text || '', review.author, Number(review.rating) || 5, review.date, review.image || null]);
    }
    for (const [name, page] of Object.entries(data.pages || {})) await client.query('INSERT INTO pages(slug, name, hero_url, banner_url) VALUES($1,$2,$3,$4) ON CONFLICT(slug) DO UPDATE SET hero_url = EXCLUDED.hero_url, banner_url = EXCLUDED.banner_url, updated_at = now()', [name.toLowerCase(), name, page.hero || '', page.banner || '']);
    await client.query('DELETE FROM videos');
    const videos = [
      ...(Array.isArray(data.shopVideos) ? data.shopVideos.map((video) => ({ ...video, pageSlug: 'shop' })) : []),
      ...(Array.isArray(data.categoryVideos) ? data.categoryVideos.map((video) => ({ ...video, pageSlug: String(video.category || '').toLowerCase() })) : [])
    ];
    for (const [sortOrder, video] of videos.entries()) {
      if (!video.video || !video.pageSlug || video.video.startsWith('idb://')) continue;
      const productResult = await client.query('SELECT id FROM products WHERE name = $1 LIMIT 1', [video.product]);
      await client.query('INSERT INTO videos(page_slug, title, video_url, product_id, sort_order) VALUES($1,$2,$3,$4,$5)', [video.pageSlug, video.title || `${video.pageSlug} video`, video.video, productResult.rows[0]?.id || null, sort_order]);
    }
    for (const [key, value] of [['announcement', data.announcement], ['shipping_cost', String(data.shipping ?? 180)]]) await client.query('INSERT INTO settings(key, value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value', [key, String(value ?? '')]);
    await client.query('COMMIT');
    response.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));
app.patch('/api/admin/orders/:id/status', asyncHandler(async (request, response) => {
  const allowed = ['new', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
  if (!allowed.includes(request.body?.status)) return response.status(400).json({ error: 'Invalid order status' });
  const result = await pool.query('UPDATE orders SET status = $1 WHERE order_number = $2 RETURNING *', [request.body.status, request.params.id]);
  if (!result.rows[0]) return response.status(404).json({ error: 'Order not found' });
  response.json(result.rows[0]);
}));
app.put('/api/admin/settings/:key', asyncHandler(async (request, response) => {
  const { value } = request.body || {};
  if (typeof value !== 'string') return response.status(400).json({ error: 'value must be a string' });
  const result = await pool.query('INSERT INTO settings(key, value) VALUES($1, $2) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value RETURNING *', [request.params.key, value]);
  response.json(result.rows[0]);
}));

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});

export { app };

if (isDirectRun) {
  app.listen(port, () => console.log(`RAK API listening on port ${port}`));
}
