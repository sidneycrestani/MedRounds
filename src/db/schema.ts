import {
	foreignKey,
	integer,
	jsonb,
	pgTable,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const clinicalCases = pgTable("clinical_cases", {
	id: uuid("id").defaultRandom().primaryKey(),
	title: text("title").notNull(),
	description: text("description"),
	vignette: text("vignette").notNull(),
	mainImageUrl: text("main_image_url"),
});

export const caseQuestions = pgTable("case_questions", {
	id: uuid("id").defaultRandom().primaryKey(),
	caseId: uuid("case_id").references(() => clinicalCases.id),
	orderIndex: integer("order_index"),
	questionText: text("question_text").notNull(),
	correctAnswerText: text("correct_answer_text").notNull(),
	mustIncludeKeywords: jsonb("must_include_keywords").$type<string[]>(),
	contextImageUrl: text("context_image_url"),
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
