# RAK live CMS setup

## What is ready

- Static storefront and single-file CMS frontend.
- `backend/server.js`: Node/Express API with Helmet, CORS allow-list, rate limiting, JWT admin authentication, and parameterized PostgreSQL queries.
- `backend/schema.sql`: database tables for admins, pages, products, four product images, variations/prices, videos, reviews, and settings.
- `orders` database table and order intake/admin endpoints for customer checkout orders.
- `backend/.env.example`: secrets/configuration template.

## Important security rule

Do not deploy `cms.html` as a public admin page without connecting it to the authenticated API. Do not put `DATABASE_URL`, `JWT_SECRET`, password hashes, or cloud storage keys in frontend files. Generate all secrets in the hosting provider dashboard.

## Recommended live stack

1. Frontend: Cloudflare Pages or Netlify.
2. API: Render, Railway, or Fly.io.
3. Database: Neon or Supabase PostgreSQL.
4. Images/videos: Cloudinary, UploadThing, or S3-compatible storage.
5. DNS/HTTPS: Cloudflare with HTTPS forced on.

## Database steps

1. Create a PostgreSQL database on Neon or Supabase.
2. Open its SQL editor and run `backend/schema.sql`.
3. Create an admin password hash locally:

```bash
node -e "import('bcryptjs').then(({default:b})=>b.hash(process.argv[1],12).then(console.log))" "CHOOSE-A-LONG-PASSWORD"
```

4. Insert the admin account in the database using the generated hash:

```sql
INSERT INTO admins(email, password_hash)
VALUES ('your-admin-email@example.com', 'PASTE_BCRYPT_HASH_HERE');
```

## API deployment steps

1. Deploy the `backend` folder as a Node service.
2. Set environment variables from `backend/.env.example` in the host dashboard.
3. Set `CORS_ORIGIN` to the exact production frontend URL, for example `https://www.yourdomain.com`.
4. Set `NODE_ENV=production` and a random `JWT_SECRET` of at least 32 characters.
5. Confirm `https://api.yourdomain.com/health` returns `{ "ok": true }`.

## Frontend deployment steps

1. Upload the root static files to Cloudflare Pages/Netlify.
2. Use the production API URL in the CMS and storefront fetch configuration.
3. Change the CMS login flow to call `POST /api/auth/login`.
4. Send `Authorization: Bearer <token>` for every `/api/admin/*` request.
5. Load storefront content from `GET /api/content` instead of localStorage.
6. Store uploaded media in Cloudinary/S3 and save only returned URLs in PostgreSQL.
7. Send checkout orders to `POST /api/orders`; show them in the authenticated CMS using `GET /api/admin/orders`.
8. Use `PATCH /api/admin/orders/:id/status` for order workflow status updates.

## Order fields

Checkout requires full name, phone, email, house/street address, city, and cart items. Area and delivery notes are also stored when provided. Each order stores the selected product variation, quantity, item price, shipping, total, payment method, and creation time.

## How you access the CMS

Use a private URL such as `https://www.yourdomain.com/cms.html`, then require the admin login before showing the CMS dashboard. Better still, serve the CMS behind a separate admin subdomain such as `https://admin.yourdomain.com` and protect it with authentication plus Cloudflare Access.

## Required before launch

- Set the production API URL once in `assets/js/config.js`:

```js
window.RAK_API_URL = 'https://your-api.onrender.com';
```

- The storefront now loads published content from `GET /api/content` and sends checkout orders to `POST /api/orders`.
- The CMS now authenticates against the API, reads backend orders, syncs catalog/reviews/pages/settings through the authenticated content sync endpoint, and updates completed orders through the status endpoint.
- Product/review/page content is database-backed. Uploaded images and videos still need production storage URLs. Use a Supabase Storage bucket or Cloudinary and save public/signed URLs instead of browser data URLs or IndexedDB references.
- Enable database backups and media backups.
- Test product deletion, variation prices, review deletion, video linking, order completion, credential changes, and shipping updates on staging.
- Force HTTPS and use a strong unique admin password.

## Exact launch order

1. Create a Neon or Supabase PostgreSQL database.
2. Run `backend/schema.sql` in the database SQL editor.
3. Insert the admin email and bcrypt password hash into `admins`.
4. Deploy `backend` to Render as a Web Service with `npm install` and `npm start`.
5. Add `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, and the final frontend URL as `CORS_ORIGIN` in Render.
6. Confirm the API `health` URL returns `ok: true`.
7. Replace the localhost value in `assets/js/config.js` with the deployed API URL.
8. Deploy the repository root to Cloudflare Pages or Netlify.
9. Update `CORS_ORIGIN` with the exact live frontend URL and redeploy the API.
10. Log in at `/cms.html`, add one product, and save it to verify database sync.
11. Place a real COD test order and confirm it appears in CMS Orders.
12. Update the test order status and verify it remains after refreshing CMS.

## Media launch rule

Use paths to files already deployed with the frontend or permanent public URLs from Cloudinary/Supabase Storage. Browser data URLs and `idb://` video references are device-local and must not be used for live media. A storage provider is required for reliable CMS uploads across devices.

## Live order check

An order is live only when all three checks pass: the checkout request returns success, the order exists in PostgreSQL, and it is visible after a fresh CMS login. If the API is unavailable, checkout now shows an error and keeps the cart instead of claiming the order was received.
