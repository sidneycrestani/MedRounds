import {
	foreignKey,
	integer,
	jsonb,
	pgTable,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

// Estrutura unificada da "Questão" (Cenário + Pergunta)
export interface QuestionData {
	vignette: string; // O caso clínico completo
	question: string; // A pergunta específica feita ao aluno
}

export const clinicalCases = pgTable("clinical_cases", {
	id: uuid("id").defaultRandom().primaryKey(),
	title: text("title").notNull(),
	description: text("description"), // Resumo para a home page

	// Coluna 'questions': Contém Vignette + Pergunta
	questions: jsonb("questions").$type<QuestionData>().notNull(),

	// Coluna 'answers': O gabarito oficial (Texto puro ou Markdown)
	answers: text("answers").notNull(),
});

export const tags = pgTable(
	"tags",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		slug: text("slug").notNull(),
		name: text("name").notNull(),
		parentId: uuid("parent_id"),
	},
	(table) => {
		return {
			slugUnique: uniqueIndex("tags_slug_unique").on(table.slug),
			parentFk: foreignKey({
				columns: [table.parentId],
				foreignColumns: [table.id],
				name: "tags_parent_fk",
			}).onDelete("set null"),
		};
	},
);

export const casesTags = pgTable(
	"cases_tags",
	{
		caseId: uuid("case_id")
			.references(() => clinicalCases.id, { onDelete: "cascade" })
			.notNull(),
		tagId: uuid("tag_id")
			.references(() => tags.id, { onDelete: "cascade" })
			.notNull(),
	},
	(table) => {
		return {
			uq: uniqueIndex("cases_tags_case_tag_unique").on(
				table.caseId,
				table.tagId,
			),
		};
	},
);

export const userProgress = pgTable("user_progress", {
	userId: text("user_id"),
	caseId: uuid("case_id"),
	score: integer("score"),
});
