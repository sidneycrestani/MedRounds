import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { tags } from "./schema";

type DB = PostgresJsDatabase;

export function makeBaseSlug(name: string): string {
	const normalized = name
		.toLowerCase()
		.replace(/[_\s]+/g, "-")
		.replace(/[áàâãä]/g, "a")
		.replace(/[éèêë]/g, "e")
		.replace(/[íìîï]/g, "i")
		.replace(/[óòôõö]/g, "o")
		.replace(/[úùûü]/g, "u")
		.replace(/ç/g, "c")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/--+/g, "-")
		.replace(/^-+|-+$/g, "");
	return normalized;
}

export async function ensureUniqueSlug(db: DB, base: string): Promise<string> {
	let candidate = base;
	let suffix = 1;
	const existsRows = await db
		.select()
		.from(tags)
		.where(eq(tags.slug, candidate))
		.limit(1);
	if (!existsRows[0]) return candidate;
	while (true) {
		candidate = `${base}-${suffix}`;
		const row = (
			await db.select().from(tags).where(eq(tags.slug, candidate)).limit(1)
		)[0];
		if (!row) return candidate;
		suffix++;
	}
}
