/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly DATABASE_URL: string;
	readonly PUBLIC_SUPABASE_URL: string;
	readonly PUBLIC_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

// Tipagem para o Cloudflare Runtime
type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
	interface Locals extends Runtime {}
}

// Definição da interface do Hyperdrive
interface Env {
	HYPERDRIVE: {
		connectionString: string;
	};
}
