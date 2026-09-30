import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL required');

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: './db/migrations' });
await client.end();

console.log('Migrations complete');
