// src/db/index.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// REMOVA a variável global de cache (_db)
// let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(connectionString: string) {
  // REMOVA a checagem de cache
  // if (_db) return _db;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL not found. Verifique as variáveis de ambiente."
    );
  }

  // Crie o client A CADA requisição.
  // O Supabase Transaction Pooler (porta 6543) foi feito para lidar com isso.
  const client = postgres(connectionString, {
    prepare: false, // CRÍTICO: Desabilita prepared statements
    ssl: "require", // Boa prática para garantir a conexão SSL correta
  });

  // Retorna uma nova instância do Drizzle
  return drizzle(client, { schema });
}
