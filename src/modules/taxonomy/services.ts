import type { Database } from "@/core/db";
import { tags } from "@/modules/taxonomy/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { ensureUniqueSlug, makeBaseSlug } from "./utils";

export async function getCaseIdsByTagSlug(
	db: Database,
	slug?: string,
): Promise<number[]> {
	if (!slug) {
		const res = await db.execute(
			sql`SELECT id FROM content.clinical_cases WHERE status = 'published' ORDER BY title ASC`,
		);
		type IdRow = { id: number };
		const rows = res as unknown as IdRow[];
		return rows.map((r) => r.id);
	}

	const res = await db.execute(sql`
    SELECT DISTINCT c.id
    FROM content.clinical_cases c
    JOIN content.cases_tags ct ON ct.case_id = c.id
    JOIN content.tags t ON t.id = ct.tag_id
    WHERE c.status = 'published'
      AND (
        t.path = (SELECT path FROM content.tags WHERE slug = ${slug})
        OR t.path LIKE (SELECT path FROM content.tags WHERE slug = ${slug}) || '.%'
      )
    ORDER BY c.title ASC
  `);

	type IdRow = { id: number };
	const rows = res as unknown as IdRow[];
	return rows.map((r) => r.id);
}

export async function getTagPathBySlug(
	db: Database,
	slug: string,
): Promise<{ id: number; slug: string; name: string }[]> {
	const res = await db.execute(sql`
    WITH root AS (
      SELECT id, path FROM content.tags WHERE slug = ${slug}
    )
    SELECT t.id, t.slug, t.name, 0 AS depth
    FROM content.tags t, root r
    WHERE t.path = r.path OR t.path LIKE r.path || '.%'
    ORDER BY length(t.path) - length(replace(t.path, '.', '')) DESC
  `);

	type PathRow = { id: number; slug: string; name: string };
	const rows = res as unknown as PathRow[];
	return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name }));
}

export async function getRootTags(db: Database) {
	return await db.select().from(tags).where(isNull(tags.parentId));
}

export async function upsertTagHierarchy(
	db: Database,
	path: string,
): Promise<number> {
	const segments = path
		.split("::")
		.map((s) => s.trim())
		.filter(Boolean);
	let parentId: number | null = null;
	let parentPath: string | null = null;
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
			parentPath = existing.path ?? parentPath;
			leafId = existing.id;
			continue;
		}

		const base = makeBaseSlug(name);
		const slug = await ensureUniqueSlug(db, base);
		const nodePath: string = parentPath ? `${parentPath}.${slug}` : slug;

		const inserted: { id: number }[] = await db
			.insert(tags)
			.values({ name, slug, parentId, path: nodePath, category: "other" })
			.returning({ id: tags.id });

		parentId = inserted[0].id;
		parentPath = nodePath;
		leafId = inserted[0].id;
	}

	if (leafId === null) throw new Error("Empty hierarchy path");
	return leafId;
}

export async function getCaseIdsByTag(
	db: Database,
	rootSlug: string,
): Promise<number[]> {
	const res = await db.execute(sql`
    SELECT DISTINCT c.id
    FROM content.clinical_cases c
    JOIN content.cases_tags ct ON c.id = ct.case_id
    JOIN content.tags t ON t.id = ct.tag_id
    WHERE t.path = (SELECT path FROM content.tags WHERE slug = ${rootSlug})
       OR t.path LIKE (SELECT path FROM content.tags WHERE slug = ${rootSlug}) || '.%'
  `);
	type Row = { id: number };
	const rows = res as unknown as Row[];
	return rows.map((r) => r.id);
}
