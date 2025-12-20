// src/pages/sitemap-index.xml.ts
import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { clinicalCases } from "@/modules/content/schema";
import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";

export const GET: APIRoute = async (context) => {
	const site = context.site?.toString() ?? "https://medrounds.com.br";

	// 1. Setup DB (Reutilizando sua infraestrutura core)
	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	// 2. Definir rotas estáticas críticas
	const staticPages = [
		{ path: "", priority: 1.0, changefreq: "daily" },
		{ path: "review", priority: 0.8, changefreq: "daily" },
		{ path: "study/new", priority: 0.8, changefreq: "monthly" },
	];

	// 3. Buscar rotas dinâmicas (Casos Publicados)
	const cases = await db
		.select({
			id: clinicalCases.id,
			lastUpdated: clinicalCases.lastUpdated,
		})
		.from(clinicalCases)
		.where(eq(clinicalCases.status, "published"));

	// 4. Gerar XML
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
	.map(
		(page) => `  <url>
    <loc>${new URL(page.path, site).href}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
	)
	.join("\n")}
${cases
	.map(
		(c) => `  <url>
    <loc>${new URL(`case/${c.id}`, site).href}</loc>
    <lastmod>${c.lastUpdated.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
	)
	.join("\n")}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			"Content-Type": "application/xml",
			// Cache no Cloudflare por 1 hora para não bater no DB a cada request de bot
			"Cache-Control": "public, max-age=3600, s-maxage=3600",
		},
	});
};
