import type { Database } from "@/core/db";
import { tags } from "@/modules/taxonomy/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
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
      AND t.path <@ (SELECT path FROM content.tags WHERE slug = ${slug})
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
    SELECT t.id, t.slug, t.name
    FROM content.tags t, root r
    WHERE t.path @> r.path
    ORDER BY nlevel(t.path) ASC
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
	let parentSlug: string | null = null;
	let leafId: number | null = null;

	for (const raw of segments) {
		const name = raw.replace(/_/g, " "); // Normaliza Display Name

		// 1. Verifica se este segmento já existe como filho do pai atual
		const existingRows = await db
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

		if (existingRows[0]) {
			// Já existe, apenas avança o ponteiro
			parentId = existingRows[0].id;
			parentPath = existingRows[0].path;
			parentSlug = existingRows[0].slug;
			leafId = existingRows[0].id;
			continue;
		}

		// 2. Não existe: Criação com Slug Inteligente
		const baseName = makeBaseSlug(name);
		let candidate = baseName;

		// Verifica se o slug "simples" já está ocupado globalmente
		const globalExists = await db
			.select({ id: tags.id })
			.from(tags)
			.where(eq(tags.slug, candidate))
			.limit(1);

		// Se já existe e temos um pai, prefixamos: 'pai_filho'
		if (globalExists.length > 0 && parentSlug) {
			candidate = `${parentSlug}_${baseName}`;
		}

		// Garante unicidade final (caso 'pai_filho' tbm exista, vira 'pai_filho_1')
		const slug = await ensureUniqueSlug(db, candidate);

		const nodePath: string = parentPath ? `${parentPath}.${slug}` : slug;

		const inserted: { id: number; slug: string }[] = await db
			.insert(tags)
			.values({
				name,
				slug,
				parentId,
				path: nodePath,
				category: "other",
			})
			.returning({ id: tags.id, slug: tags.slug });

		parentId = inserted[0].id;
		parentPath = nodePath;
		parentSlug = inserted[0].slug;
		leafId = inserted[0].id;
	}

	if (leafId === null) throw new Error(`Invalid tag path: ${path}`);
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
    WHERE t.path <@ (SELECT path FROM content.tags WHERE slug = ${rootSlug})
  `);
	type Row = { id: number };
	const rows = res as unknown as Row[];
	return rows.map((r) => r.id);
}
export type TagTreeItem = {
	id: number;
	label: string;
	value: number; // Usaremos o ID como value para facilitar a seleção
	slug: string;
	children: TagTreeItem[];
};

export async function getAllTagsAsTree(db: Database): Promise<TagTreeItem[]> {
	// 1. Busca todas as tags ordenadas por nome
	const allTags = await db.select().from(tags).orderBy(asc(tags.name));

	// 2. Mapa auxiliar para construção da árvore
	const tagMap = new Map<number, TagTreeItem>();
	const roots: TagTreeItem[] = [];

	// Inicializa os objetos (sem children preenchido ainda)
	for (const tag of allTags) {
		tagMap.set(tag.id, {
			id: tag.id,
			label: tag.name,
			value: tag.id,
			slug: tag.slug,
			children: [],
		});
	}

	// 3. Monta a hierarquia
	for (const tag of allTags) {
		const node = tagMap.get(tag.id);
		if (!node) continue;

		if (tag.parentId) {
			const parent = tagMap.get(tag.parentId);
			if (parent) {
				parent.children.push(node);
			} else {
				// Se o pai não existe (erro de integridade ou lógica), trata como raiz
				roots.push(node);
			}
		} else {
			roots.push(node);
		}
	}

	return roots;
}
