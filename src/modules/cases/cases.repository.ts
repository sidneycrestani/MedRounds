import type { Database } from "@/core/db";
import { caseQuestions, clinicalCases } from "@/modules/content/schema";
import { getCaseIdsByTag } from "@/modules/taxonomy/services";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
	CaseListItemDTO as CaseListItemDTOSchema,
	FullCaseSchema,
	SearchFilterSchema,
} from "./types";
import type { TagNode } from "./types";

export async function getCaseById(db: Database, id: number) {
	const caseRows = await db
		.select()
		.from(clinicalCases)
		.where(
			and(eq(clinicalCases.id, id), eq(clinicalCases.status, "published")),
		);
	const c = caseRows[0];
	if (!c) return null;

	const qs = await db
		.select()
		.from(caseQuestions)
		.where(eq(caseQuestions.caseId, id))
		.orderBy(asc(caseQuestions.orderIndex));

	const parsed = FullCaseSchema.parse({
		id: c.id,
		title: c.title,
		vignette: c.vignette,
		media: c.mainImageUrl ?? undefined,
		questions: qs.map((q) => ({
			id: q.id,
			text: q.questionText,
			media: q.contextImageUrl ?? undefined,
			order: q.orderIndex,
		})),
	});
	return parsed;
}

export async function getCasesByTag(db: Database, slug?: string) {
	let rows: (typeof clinicalCases.$inferSelect)[] = [];
	if (slug) {
		const ids = await getCaseIdsByTag(db, slug);
		if (ids.length === 0) return [];
		rows = await db
			.select()
			.from(clinicalCases)
			.where(
				and(
					inArray(clinicalCases.id, ids),
					eq(clinicalCases.status, "published"),
				),
			);
	} else {
		rows = await db
			.select()
			.from(clinicalCases)
			.where(eq(clinicalCases.status, "published"));
	}

	return rows.map((r) =>
		CaseListItemDTOSchema.parse({
			id: r.id,
			title: r.title,
			description: r.description,
		}),
	);
}

export async function getNextBestCaseForUser(
	db: Database,
	userId: string,
	tagSlug?: string,
) {
	const res = await db.execute(sql`
        SELECT select_next_case(${userId}, ${tagSlug ?? null}) AS case_id
    `);
	type Row = { case_id: number | null };
	const rows = res as unknown as Row[];
	return rows[0]?.case_id ?? null;
}

function isSlugNode(expr: TagNode): expr is { slug: string } {
	return (expr as { slug?: string }).slug !== undefined;
}

function isOpNode(
	expr: TagNode,
): expr is { op: "AND" | "OR"; nodes: TagNode[] } {
	const e = expr as { op?: "AND" | "OR"; nodes?: unknown };
	return e.op !== undefined && Array.isArray(e.nodes);
}

function buildTagExists(expr?: TagNode): string {
	if (!expr) return "TRUE";
	if (isSlugNode(expr)) {
		return `EXISTS (
	            SELECT 1 FROM content.cases_tags ct
	            JOIN content.tags t ON t.id = ct.tag_id
	            WHERE ct.case_id = c.id AND t.path <@ (SELECT path FROM content.tags WHERE slug = ${sql.param(expr.slug)})
	        )`;
	}
	if (isOpNode(expr) && expr.op === "AND") {
		return expr.nodes.map((n: TagNode) => buildTagExists(n)).join(" AND ");
	}
	if (isOpNode(expr) && expr.op === "OR") {
		return `(${expr.nodes.map((n: TagNode) => buildTagExists(n)).join(" OR ")})`;
	}
	return "TRUE";
}

export async function searchCases(
	db: Database,
	filter: unknown,
): Promise<{ id: number; title: string; description: string | null }[]> {
	const parsed = SearchFilterSchema.parse(filter);
	const base = `SELECT c.id, c.title, c.description
        FROM content.clinical_cases c
        WHERE c.status = 'published'`;
	const tagCond = buildTagExists(parsed.tags);
	const parts: string[] = [base, "AND", tagCond];
	if (parsed.exclusion_rules?.srs) {
		const s = parsed.exclusion_rules.srs;
		const uid = parsed.exclusion_rules.userId;
		parts.push(
			"AND NOT EXISTS (",
			`SELECT 1 FROM app.user_case_history h WHERE h.case_id = c.id AND h.user_id = ${sql.param(uid)} AND h.score > ${sql.param(s.scoreThreshold)} AND h.attempted_at > now() - interval '${s.windowDays} days'`,
			")",
		);
	}
	const query = parts.join(" ");
	const res = await db.execute(sql.raw(query));
	type Row = { id: number; title: string; description: string | null };
	const rows = res as unknown as Row[];
	return rows;
}
