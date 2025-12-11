// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Define um tipo união: pode ser string (local) ou o objeto do Hyperdrive (prod)
type ConnectionParams = string | { connectionString: string };

export function getDb(connection: ConnectionParams) {
	// Extrai a string correta
	const url =
		typeof connection === "string" ? connection : connection.connectionString;

	if (!url) {
		throw new Error("Database connection string not found.");
	}

	// Configuração otimizada para Hyperdrive + Postgres.js
	const client = postgres(url, {
		prepare: false, // Drizzle + Hyperdrive funciona melhor sem cache de statements
		max: 10, // O Hyperdrive aguenta conexões, então podemos relaxar o limite aqui
		connect_timeout: 10,
	});

	return drizzle(client, { schema });
}
