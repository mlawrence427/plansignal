import pool from './pool';
import * as fs from 'fs';
import * as path from 'path';

async function init(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  try {
    await pool.query(schema);
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
