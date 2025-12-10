// src/db/index.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// REMOVA a variável global de cache (_db)
// let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(connectionString: string) {
  if (!connectionString) {
    throw new Error("DATABASE_URL not found.");
  }

  const client = postgres(connectionString, {
    prepare: false, // CRÍTICO: Mantém desabilitado para Transaction Mode
    ssl: { rejectUnauthorized: false }, // AJUSTE: Evita erros de handshake SSL comuns no Edge
    connect_timeout: 10, // AJUSTE: Fail-fast se não conectar rápido
    idle_timeout: 0, // AJUSTE: Evita manter conexões mortas no pool do worker
  });

  return drizzle(client, { schema });
}
