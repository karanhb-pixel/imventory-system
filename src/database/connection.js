import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import 'dotenv/config';

// Initialize Neon database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/imventory_db';

// Create the Neon client
const sql = neon(connectionString);

// Create the Drizzle client with the schema
export const db = drizzle(sql, { schema });

// Export the schema for use in the app
export { schema };

// Health check function
export async function checkConnection() {
  try {
    await sql`SELECT 1`;
    return { connected: true, message: 'Database connected successfully' };
  } catch (error) {
    return { connected: false, message: `Database connection failed: ${error.message}` };
  }
}

// Export SQL for direct queries if needed
export { sql };