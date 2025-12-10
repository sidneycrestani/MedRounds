// src/db/index.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export function getDb(connectionString: string) {
  if (!connectionString) {
    throw new Error("DATABASE_URL not found.");
  }

  // Configuração Agressiva para Serverless
  const client = postgres(connectionString, {
    prepare: false, // Desabilita prepared statements (CRUCIAL para pgbouncer/6543)
    max: 1, // Apenas 1 conexão por execução do Worker
    idle_timeout: 0, // Fecha a conexão IMEDIATAMENTE após o uso (sem esperar idle)
    connect_timeout: 10, // Timeout curto para falhar rápido se der erro
    ssl: "require", // Obrigatório para Supabase
    fetch_types: false, // Desabilita cache de tipos do banco (evita queries extras na inicialização)
  });

  return drizzle(client, { schema });
}
