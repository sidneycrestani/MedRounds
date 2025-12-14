// scripts/reset-db.ts
import * as dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing");

const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
	console.log("🗑️  Destroying database schemas...");

	await db.execute(sql`
        -- Drop schemas with CASCADE to remove all tables/functions inside
        DROP SCHEMA IF EXISTS "content" CASCADE;
        DROP SCHEMA IF EXISTS "app" CASCADE;
        DROP SCHEMA IF EXISTS "drizzle" CASCADE;

        -- Drop custom types in public
        DROP TYPE IF EXISTS "public"."case_difficulty" CASCADE;
        DROP TYPE IF EXISTS "public"."case_status" CASCADE;
        DROP TYPE IF EXISTS "public"."tag_category" CASCADE;

        -- Drop extensions (migrations will re-create them)
        DROP EXTENSION IF EXISTS "ltree" CASCADE;
        DROP EXTENSION IF EXISTS "pg_trgm" CASCADE;
    `);

	console.log("✅ Database is empty.");
	process.exit(0);
}

main();