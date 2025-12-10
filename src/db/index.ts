// src/db/index.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export function getDb(connectionString: string) {
  if (!connectionString) {
    throw new Error("DATABASE_URL not found.");
  }

  const client = postgres(connectionString, {
    // prepare: false, <--- COMENTE ou REMOVA isso na porta 5432.
    // Na porta 5432, prepared statements funcionam e deixam a query mais rápida.

    max: 1, // Limita a 1 conexão por requisição
    idle_timeout: 0, // Fecha a conexão assim que a query termina
    connect_timeout: 5, // Falha rápido se demorar

    // Configuração de SSL permissiva para o Cloudflare aceitar o certificado do Supabase
    ssl: { rejectUnauthorized: false },
  });

  return drizzle(client, { schema });
}
