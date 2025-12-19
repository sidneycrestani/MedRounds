import {
	integer,
	jsonb,
	pgEnum,
	pgSchema,
	serial,
	text,
	timestamp,
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

const content = pgSchema("content");

export const clinicalCases = content.table("clinical_cases", {
	id: integer("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description"),
	vignette: text("vignette").notNull(),
	explanation: text("explanation"),
	mainImageUrl: text("main_image_url"),
	status: caseStatusEnum("status").notNull().default("draft"),
	difficulty: caseDifficultyEnum("difficulty"),
	createdBy: uuid("created_by"),
	lastUpdated: timestamp("last_updated", { withTimezone: true })
		.notNull()
		.defaultNow(),
	version: integer("version").notNull().default(1),
	contentHash: text("content_hash"),
});

export const caseQuestions = content.table("case_questions", {
	id: serial("id").primaryKey(),
	caseId: integer("case_id").references(() => clinicalCases.id),
	orderIndex: integer("order_index"),
	questionText: text("question_text").notNull(),
	correctAnswerText: text("correct_answer_text").notNull(),
	mustIncludeKeywords: jsonb("must_include_keywords").$type<string[]>(),
	contextImageUrl: text("context_image_url"),
});
