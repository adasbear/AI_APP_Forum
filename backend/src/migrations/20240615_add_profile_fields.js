import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrate() {
  console.log('Connecting to database...', process.env.DB_NAME);
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    console.log('Adding avatar_url and bio to users table...');
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN avatar_url VARCHAR(1024) NULL,
      ADD COLUMN bio TEXT NULL;
    `);
    console.log('Migration successful.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist. Skipping.');
    } else {
      console.error('Migration failed:', error);
    }
  } finally {
    await connection.end();
  }
}

migrate();
