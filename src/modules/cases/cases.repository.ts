import type { Database } from "@/core/db";
import { caseQuestions, clinicalCases } from "@/modules/content/schema";
import { userCaseState } from "@/modules/srs/schema";
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

export async function getUserCaseProgress(
	db: Database,
	userId: string,
	caseId: number,
): Promise<
	Record<
		number,
		{ isDue: boolean; nextReview: Date | null; isMastered: boolean }
	>
> {
	const qs = await db
		.select({ orderIndex: caseQuestions.orderIndex })
		.from(caseQuestions)
		.where(eq(caseQuestions.caseId, caseId));
	const questionIndices = qs.map((q) => q.orderIndex).filter((n) => n != null);

	const states =
		questionIndices.length > 0
			? await db
					.select()
					.from(userCaseState)
					.where(
						and(
							eq(userCaseState.userId, userId),
							eq(userCaseState.caseId, caseId),
							inArray(userCaseState.questionIndex, questionIndices),
						),
					)
			: [];

	const byIndex = new Map<number, (typeof states)[number]>();
	for (const s of states) byIndex.set(s.questionIndex, s);

	const now = new Date();
	const result: Record<
		number,
		{ isDue: boolean; nextReview: Date | null; isMastered: boolean }
	> = {};

	for (const idx of questionIndices) {
		const st = byIndex.get(idx);
		if (!st) {
			result[idx] = { isDue: true, nextReview: null, isMastered: false };
		} else {
			const next = st.nextReviewAt ?? null;
			const mastered = !!st.isMastered;
			const due = next ? next <= now : false;
			result[idx] = { isDue: due, nextReview: next, isMastered: mastered };
		}
	}

	return result;
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

export async function generateStudySession(
	db: Database,
	userId: string,
	tagSlugs: string[],
): Promise<{ caseId: number; activeQuestionIndices: number[] }[]> {
	// 1. Construímos o filtro de tags usando chunks sql`` para segurança e formatação correta
	const tagFilterChunk =
		tagSlugs.length > 0
			? sql`AND EXISTS (
        SELECT 1
        FROM content.cases_tags ct2
        JOIN content.tags t ON t.id = ct2.tag_id
        WHERE ct2.case_id = c.id 
        AND (${sql.join(
					tagSlugs.map(
						(slug) =>
							sql`t.path <@ (SELECT path FROM content.tags WHERE slug = ${slug})`,
					),
					sql` OR `,
				)})
      )`
			: sql``;

	// 2. Construímos a query principal usando a tag `sql`.
	// Note que passamos ${userId} diretamente aqui; o Drizzle cuidará de transformar em parâmetro ($1).
	const query = sql`
    WITH base AS (
      SELECT c.id AS case_id, q.order_index AS question_index
      FROM content.clinical_cases c
      JOIN content.case_questions q ON q.case_id = c.id
      WHERE c.status = 'published'
      ${tagFilterChunk}
    ),
    joined AS (
      SELECT b.case_id, b.question_index, s.is_mastered, s.next_review_at
      FROM base b
      LEFT JOIN app.user_case_state s
        ON s.user_id = ${userId} 
        AND s.case_id = b.case_id 
        AND s.question_index = b.question_index
    ),
    eligible AS (
      SELECT case_id, question_index
      FROM joined
      WHERE (next_review_at IS NULL AND is_mastered IS NULL)
         OR (COALESCE(is_mastered, FALSE) = FALSE AND next_review_at <= now())
    )
    SELECT e.case_id,
           ARRAY_AGG(e.question_index ORDER BY e.question_index) AS active_indices
    FROM eligible e
    GROUP BY e.case_id
    ORDER BY RANDOM()
  `;

	const res = await db.execute(query);

	type Row = { case_id: number; active_indices: number[] };
	const rows = res as unknown as Row[];

	return rows.map((r) => ({
		caseId: r.case_id,
		activeQuestionIndices: r.active_indices,
	}));
}
