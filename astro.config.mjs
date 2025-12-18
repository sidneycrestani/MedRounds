import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap"; // Adicionaremos isso no Passo 4
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: "https://medrounds.com.br",

	output: "server",
	adapter: cloudflare(),
	integrations: [
		react(),
		tailwind(),
		sitemap(),
	],
	vite: {
		resolve: {
			alias: {
				"@": "/src",
			},
		},
	},
});
