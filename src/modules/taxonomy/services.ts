import { tags } from "@/modules/taxonomy/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { ensureUniqueSlug, makeBaseSlug } from "./utils";

type DB = PostgresJsDatabase;

export async function getCaseIdsByTagSlug(
	db: DB,
	slug?: string,
): Promise<number[]> {
	if (!slug) {
		const res = await db.execute(
			sql`SELECT id FROM clinical_cases WHERE status = 'published' ORDER BY title ASC`,
		);
		type IdRow = { id: number };
		const rows = res as unknown as IdRow[];
		return rows.map((r) => r.id);
	}

	const res = await db.execute(sql`
    WITH RECURSIVE tag_tree AS (
      SELECT id, slug, name, parent_id FROM tags WHERE slug = ${slug}
      UNION ALL
      SELECT t.id, t.slug, t.name, t.parent_id
      FROM tags t
      INNER JOIN tag_tree tt ON t.parent_id = tt.id
    )
    SELECT c.id
    FROM clinical_cases c
    INNER JOIN cases_tags ct ON ct.case_id = c.id
    INNER JOIN tag_tree tt ON tt.id = ct.tag_id
    WHERE c.status = 'published'
    GROUP BY c.id
    ORDER BY MIN(c.title) ASC
  `);

	type IdRow = { id: number };
	const rows = res as unknown as IdRow[];
	return rows.map((r) => r.id);
}

export async function getTagPathBySlug(
	db: DB,
	slug: string,
): Promise<{ id: number; slug: string; name: string }[]> {
	const res = await db.execute(sql`
    WITH RECURSIVE path AS (
      SELECT id, slug, name, parent_id, 0 as depth FROM tags WHERE slug = ${slug}
      UNION ALL
      SELECT t.id, t.slug, t.name, t.parent_id, p.depth + 1
      FROM tags t
      INNER JOIN path p ON p.parent_id = t.id
    )
    SELECT id, slug, name, depth FROM path ORDER BY depth DESC
  `);

	type PathRow = { id: number; slug: string; name: string };
	const rows = res as unknown as PathRow[];
	return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name }));
}

export async function getRootTags(db: DB) {
	return await db.select().from(tags).where(isNull(tags.parentId));
}

export async function upsertTagHierarchy(
	db: DB,
	path: string,
): Promise<number> {
	const segments = path
		.split("::")
		.map((s) => s.trim())
		.filter(Boolean);
	let parentId: number | null = null;
	let leafId: number | null = null;

	for (const raw of segments) {
		const name = raw.replace(/_/g, " ");
		const existingRows: (typeof tags.$inferSelect)[] = await db
			.select()
			.from(tags)
			.where(
				and(
					eq(tags.name, name),
					parentId === null
						? isNull(tags.parentId)
						: eq(tags.parentId, parentId),
				),
			)
			.limit(1);
		const existing = existingRows[0];
		if (existing) {
			parentId = existing.id;
			leafId = existing.id;
			continue;
		}

		const base = makeBaseSlug(name);
		const slug = await ensureUniqueSlug(db, base);

		const inserted: { id: number }[] = await db
			.insert(tags)
			.values({ name, slug, parentId, category: "other" })
			.returning({ id: tags.id });

		parentId = inserted[0].id;
		leafId = inserted[0].id;
	}

	if (leafId === null) throw new Error("Empty hierarchy path");
	return leafId;
}

export async function getCaseIdsByTag(
	db: DB,
	rootSlug: string,
): Promise<number[]> {
	const res = await db.execute(sql`
    WITH RECURSIVE tag_tree AS (
      SELECT id FROM tags WHERE slug = ${rootSlug}
      UNION ALL
      SELECT t.id FROM tags t
      INNER JOIN tag_tree tt ON t.parent_id = tt.id
    )
    SELECT DISTINCT c.id
    FROM clinical_cases c
    JOIN cases_tags ct ON c.id = ct.case_id
    WHERE ct.tag_id IN (SELECT id FROM tag_tree);
  `);
	type Row = { id: number };
	const rows = res as unknown as Row[];
	return rows.map((r) => r.id);
}
