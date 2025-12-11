import { drizzle } from "drizzle-orm/postgres-js";
// src/db/index.ts
import postgres from "postgres";
import * as schema from "./schema";

// Define um tipo união: pode ser string (local) ou o objeto do Hyperdrive (prod)
type ConnectionParams = string | { connectionString: string };

const clientCache = new Map<string, ReturnType<typeof drizzle>>();

export function getDb(connection: ConnectionParams) {
	// Extrai a string correta
	const url =
		typeof connection === "string" ? connection : connection.connectionString;

	if (!url) {
		throw new Error("Database connection string not found.");
	}

	const cached = clientCache.get(url);
	if (cached) {
		return cached;
	}

	const client = postgres(url, {
		prepare: false,
		max: 10,
		connect_timeout: 10,
	});

	const db = drizzle(client, { schema });
	clientCache.set(url, db);
	return db;
}
