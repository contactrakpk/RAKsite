CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  hero_url TEXT,
  banner_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, sort_order)
);

CREATE TABLE IF NOT EXISTS product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_variation_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variation_id UUID REFERENCES product_variations(id) ON DELETE CASCADE,
  variation_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, variation_name, sort_order)
);

ALTER TABLE product_variation_images
  ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES product_variations(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  poster_url TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'))
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS videos_public_read ON videos;
CREATE POLICY videos_public_read ON videos FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS videos_admin_write ON videos;
CREATE POLICY videos_admin_write ON videos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_date DATE NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pages_public_read ON pages;
CREATE POLICY pages_public_read ON pages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS pages_admin_write ON pages;
CREATE POLICY pages_admin_write ON pages FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reviews_public_read ON reviews;
CREATE POLICY reviews_public_read ON reviews FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS reviews_admin_write ON reviews;
CREATE POLICY reviews_admin_write ON reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settings_public_read ON settings;
CREATE POLICY settings_public_read ON settings FOR SELECT TO anon, authenticated USING (key IN ('announcement', 'shipping_cost'));
DROP POLICY IF EXISTS settings_admin_write ON settings;
CREATE POLICY settings_admin_write ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  area TEXT,
  city TEXT NOT NULL,
  notes TEXT,
  payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
  items JSONB NOT NULL,
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'dispatched', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_public_insert ON orders;
CREATE POLICY orders_public_insert ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS orders_authenticated_select ON orders;
CREATE POLICY orders_authenticated_select ON orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS orders_authenticated_delete ON orders;
CREATE POLICY orders_authenticated_delete ON orders FOR DELETE TO authenticated USING (true);

INSERT INTO settings(key, value) VALUES ('announcement', ''), ('shipping_cost', '180')
ON CONFLICT (key) DO NOTHING;
