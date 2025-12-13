import schema from "@/core/schema";
import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Database = PostgresJsDatabase<typeof schema>;

type ConnectionParams = string | { connectionString: string };

export function getDb(connection: ConnectionParams) {
	const url =
		typeof connection === "string" ? connection : connection.connectionString;

	if (!url) {
		throw new Error("Database connection string not found.");
	}

	const client = postgres(url, {
		prepare: false,
		max: 10,
		connect_timeout: 10,
	});

	return drizzle(client, { schema });
}
