// src/db/index.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Mantemos a conexão viva fora da função (Singleton)
// Isso evita o erro de recriar conexão a cada milissegundo
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(connectionString: string) {
  // Se já existe conexão ativa, reutiliza (Performance + Estabilidade)
  if (_db) return _db;

  if (!connectionString) {
    throw new Error("DATABASE_URL not found.");
  }

  const client = postgres(connectionString, {
    prepare: false, // Diz ao Drizzle/Postgres para NÃO tentar preparar/cachear queries complexas

    // Configurações para manter a conexão saudável no Global Scope:
    idle_timeout: 20, // Mantém a conexão aberta por 20s (ajuda na navegação rápida)
    max: 10, // Permite um pequeno pool se houver cliques simultâneos
    connect_timeout: 10,
    ssl: { rejectUnauthorized: false }, // Garante que o SSL não bloqueie
  });

  _db = drizzle(client, { schema });
  return _db;
}
