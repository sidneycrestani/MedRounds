import { caseQuestions, clinicalCases } from "@/db/schema";
import { getCaseIdsByTagSlug } from "@/modules/taxonomy/services";
import { asc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
	CaseListItemDTO as CaseListItemDTOSchema,
	FullCaseSchema,
} from "./types";

type DB = PostgresJsDatabase;

export async function getCaseById(db: DB, id: string) {
	const caseRows = await db
		.select()
		.from(clinicalCases)
		.where(eq(clinicalCases.id, id));
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
			.where(inArray(clinicalCases.id, ids));
	} else {
		rows = await db.select().from(clinicalCases);
	}

	return rows.map((r) =>
		CaseListItemDTOSchema.parse({
			id: r.id,
			title: r.title,
			description: r.description,
		}),
	);
}
