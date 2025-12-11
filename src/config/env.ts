import { z } from "zod";

const PublicEnvSchema = z.object({
  PUBLIC_SUPABASE_URL: z.string().min(1),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const ServerEnvSchema = z
  .object({
    DATABASE_URL: z.string().min(1).optional(),
    HYPERDRIVE: z.object({ connectionString: z.string().min(1) }).optional(),
  })
  .refine((env) => !!env.DATABASE_URL || !!env.HYPERDRIVE, {
    message: "Missing DATABASE_URL or HYPERDRIVE.connectionString",
  });

export function getServerEnv(runtime?: any) {
  const base = runtime?.env ?? (import.meta as any).env ?? {};
  return ServerEnvSchema.parse(base);
}

export function getPublicClientEnv(runtime?: any) {
  const base = runtime?.env ?? (import.meta as any).env ?? {};
  const parsed = PublicEnvSchema.parse(base);
  return {
    supabaseUrl: parsed.PUBLIC_SUPABASE_URL,
    supabaseAnonKey: parsed.PUBLIC_SUPABASE_ANON_KEY,
  };
}

export type ConnectionParams = string | { connectionString: string };

export function getConnectionFromEnv(
  env: z.infer<typeof ServerEnvSchema>,
): ConnectionParams {
  if (env.HYPERDRIVE?.connectionString)
    return { connectionString: env.HYPERDRIVE.connectionString };
  if (env.DATABASE_URL) return env.DATABASE_URL;
  throw new Error("No database connection available");
}
