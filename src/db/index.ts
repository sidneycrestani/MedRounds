// src/db/index.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Cache da conexão para reutilização (Singleton)
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(connectionString: string) {
  if (_db) return _db;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL not found. Verifique as variáveis de ambiente."
    );
  }

  // prepare: false é obrigatório para Supabase Transaction Mode (porta 6543)
  const client = postgres(connectionString, { prepare: false });

  _db = drizzle(client, { schema });
  return _db;
}
