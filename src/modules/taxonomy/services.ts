import { tags } from "@/db/schema";
import { isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

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
