import type { Database } from "@/core/db";
import { eq } from "drizzle-orm";
import { tags } from "./schema";

export function makeBaseSlug(name: string): string {
	const normalized = name
		.toLowerCase()
		.replace(/[\-\s]+/g, "_")
		.replace(/[áàâãä]/g, "a")
		.replace(/[éèêë]/g, "e")
		.replace(/[íìîï]/g, "i")
		.replace(/[óòôõö]/g, "o")
		.replace(/[úùûü]/g, "u")
		.replace(/ç/g, "c")
		.replace(/[^a-z0-9_]/g, "")
		.replace(/__+/g, "_")
		.replace(/^_+|_+$/g, "");
	return normalized;
}

export async function ensureUniqueSlug(
	db: Database,
	base: string,
): Promise<string> {
	let candidate = base;
	let suffix = 1;
	const existsRows = await db
		.select()
		.from(tags)
		.where(eq(tags.slug, candidate))
		.limit(1);
	if (!existsRows[0]) return candidate;
	while (true) {
		candidate = `${base}_${suffix}`;
		const row = (
			await db.select().from(tags).where(eq(tags.slug, candidate)).limit(1)
		)[0];
		if (!row) return candidate;
		suffix++;
	}
}
