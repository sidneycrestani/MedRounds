import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { getAvailableQuestionsCount } from "@/modules/cases/cases.repository";
import { tags } from "@/modules/taxonomy/schema";
import type { APIRoute } from "astro";
import { inArray } from "drizzle-orm";

export const POST: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) return new Response(null, { status: 401 });

	const body = await context.request.json();
	const tagIds = body.tagIds as number[];

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		// Converter IDs em Slugs
		let tagSlugs: string[] = [];
		if (tagIds.length > 0) {
			const tagRows = await db
				.select({ slug: tags.slug })
				.from(tags)
				.where(inArray(tags.id, tagIds));
			tagSlugs = tagRows.map((t) => t.slug);
		}

		const count = await getAvailableQuestionsCount(db, user.id, tagSlugs);

		return new Response(JSON.stringify({ count }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error(error);
		return new Response(JSON.stringify({ error: "Server Error" }), {
			status: 500,
		});
	}
};
