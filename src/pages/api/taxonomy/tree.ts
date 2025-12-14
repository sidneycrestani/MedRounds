import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { getAllTagsAsTree } from "@/modules/taxonomy/services";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		const tree = await getAllTagsAsTree(db);

		return new Response(JSON.stringify(tree), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				// Cache control para evitar hits desnecessários no banco, já que taxonomia muda pouco
				"Cache-Control": "public, max-age=300",
			},
		});
	} catch (error) {
		console.error("Taxonomy Tree Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
