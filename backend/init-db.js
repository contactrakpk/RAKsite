import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Add it to backend/.env before running this script.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function applySchema() {
  const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');
  await pool.query(schemaSql);
  console.log('Schema applied successfully.');
}

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@rak.com';
  const passwordHash = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('Admin@12345', 10);

  await pool.query(
    `INSERT INTO admins (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;`,
    [email, passwordHash]
  );

  console.log(`Admin account ready: ${email}`);
}

async function main() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connection successful.');
    await applySchema();
    await ensureAdmin();
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Database setup failed.');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
