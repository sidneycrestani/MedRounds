import {
	doublePrecision,
	foreignKey,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const caseStatusEnum = pgEnum("case_status", [
	"draft",
	"review",
	"published",
]);

export const caseDifficultyEnum = pgEnum("case_difficulty", [
	"student",
	"general_practitioner",
	"specialist",
]);

export const tagCategoryEnum = pgEnum("tag_category", [
	"specialty",
	"system",
	"pathology",
	"drug",
	"other",
]);

export const clinicalCases = pgTable("clinical_cases", {
	id: serial("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description"),
	vignette: text("vignette").notNull(),
	mainImageUrl: text("main_image_url"),
	status: caseStatusEnum("status").notNull().default("draft"),
	difficulty: caseDifficultyEnum("difficulty"),
	createdBy: uuid("created_by"),
	lastUpdated: timestamp("last_updated", { withTimezone: true })
		.notNull()
		.defaultNow(),
	version: integer("version").notNull().default(1),
});

export const caseQuestions = pgTable("case_questions", {
	id: serial("id").primaryKey(),
	caseId: integer("case_id").references(() => clinicalCases.id),
	orderIndex: integer("order_index"),
	questionText: text("question_text").notNull(),
	correctAnswerText: text("correct_answer_text").notNull(),
	mustIncludeKeywords: jsonb("must_include_keywords").$type<string[]>(),
	contextImageUrl: text("context_image_url"),
});

export const tags = pgTable(
	"tags",
	{
		id: serial("id").primaryKey(),
		slug: text("slug").notNull(),
		name: text("name").notNull(),
		parentId: integer("parent_id"),
		category: tagCategoryEnum("category").notNull(),
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
		caseId: integer("case_id")
			.references(() => clinicalCases.id, { onDelete: "cascade" })
			.notNull(),
		tagId: integer("tag_id")
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

export const userCaseHistory = pgTable(
	"user_case_history",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").notNull(),
		caseId: integer("case_id")
			.references(() => clinicalCases.id, { onDelete: "cascade" })
			.notNull(),
		score: integer("score"),
		attemptedAt: timestamp("attempted_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		recentIdx: index("user_case_history_recent_idx").on(
			table.userId,
			table.caseId,
			table.attemptedAt,
		),
	}),
);

export const userCaseState = pgTable(
	"user_case_state",
	{
		userId: text("user_id").notNull(),
		caseId: integer("case_id")
			.references(() => clinicalCases.id, { onDelete: "cascade" })
			.notNull(),
		nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
		easeFactor: doublePrecision("ease_factor"),
		learningStatus: text("learning_status"),
	},
	(table) => ({
		uq: uniqueIndex("user_case_state_user_case_unique").on(
			table.userId,
			table.caseId,
		),
		nextReviewIdx: index("user_case_state_next_review_idx").on(
			table.userId,
			table.nextReviewAt,
		),
	}),
);
