
import { Pool } from 'pg';

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false, // Required for many cloud providers
    },
  });
} else {
  // Use a single global instance for development to avoid too many connections
  if (!(global as any)._pgPool) {
    (global as any)._pgPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });
  }
  pool = (global as any)._pgPool;
}

export default pool;
