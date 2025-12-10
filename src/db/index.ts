// src/db/index.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export function getDb(connectionString: string) {
  if (!connectionString) {
    throw new Error("DATABASE_URL not found.");
  }

  const client = postgres(connectionString, {
    prepare: false, // OBRIGATÓRIO: O erro 'PostgresJsPreparedQuery' prova que precisamos disso desligado.
    max: 1, // Impede criar pool fantasma
    idle_timeout: 0, // Mata a conexão assim que termina a query
    connect_timeout: 10, // Não deixa o request pendurado se o banco demorar
    ssl: { rejectUnauthorized: false }, // Permite conexão direta do Cloudflare pro Supabase
    fetch_types: false, // Remove query extra de inicialização
  });

  return drizzle(client, { schema });
}
