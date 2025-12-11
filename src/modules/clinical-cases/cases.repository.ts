import { clinicalCases } from "@/db/schema";
import { getCaseIdsByTagSlug } from "@/modules/taxonomy/services";
import { eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
	CaseDTO as CaseDTOSchema,
	CaseListItemDTO as CaseListItemDTOSchema,
	QuestionDataSchema,
} from "./types";

type DB = PostgresJsDatabase;

export async function getCaseById(db: DB, id: string) {
	const rows = await db
		.select()
		.from(clinicalCases)
		.where(eq(clinicalCases.id, id));
	const raw = rows[0];
	if (!raw) return null;

	const q = QuestionDataSchema.parse(raw.questions);
	const parsed = CaseDTOSchema.parse({
		id: raw.id,
		title: raw.title,
		vignette: q.vignette,
		questionText: q.question,
	});

	return parsed;
}

export async function getCasesByTag(db: DB, slug?: string) {
	let rows: any[] = [];
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
