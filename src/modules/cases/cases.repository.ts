import { caseQuestions, clinicalCases } from "@/db/schema";
import { getCaseIdsByTagSlug } from "@/modules/taxonomy/services";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
	CaseListItemDTO as CaseListItemDTOSchema,
	FullCaseSchema,
} from "./types";

type DB = PostgresJsDatabase;

export async function getCaseById(db: DB, id: number) {
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
		})),
	});
	return parsed;
}

export async function getCasesByTag(db: DB, slug?: string) {
	let rows: (typeof clinicalCases.$inferSelect)[] = [];
	if (slug) {
		const ids = await getCaseIdsByTagSlug(db, slug);
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
	db: DB,
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
