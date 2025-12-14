import { clinicalCases } from "@/modules/content/schema";
import {
	boolean,
	doublePrecision,
	index,
	integer,
	pgSchema,
	primaryKey,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

const app = pgSchema("app");

export const userCaseHistory = app.table(
	"user_case_history",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").notNull(),
		caseId: integer("case_id")
			.references(() => clinicalCases.id, { onDelete: "cascade" })
			.notNull(),
		questionIndex: integer("question_index").notNull(),
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

export const userCaseState = app.table(
	"user_case_state",
	{
		userId: text("user_id").notNull(),
		caseId: integer("case_id")
			.references(() => clinicalCases.id, { onDelete: "cascade" })
			.notNull(),
		questionIndex: integer("question_index").notNull(),
		nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
		easeFactor: doublePrecision("ease_factor"),
		learningStatus: text("learning_status"),
		isMastered: boolean("is_mastered").notNull().default(false),
		lastScore: integer("last_score"),
		consecutiveCorrect: integer("consecutive_correct"),
	},
	(table) => ({
		pk: primaryKey({
			columns: [table.userId, table.caseId, table.questionIndex],
		}),
		uq: uniqueIndex("user_case_state_user_case_unique").on(
			table.userId,
			table.caseId,
			table.questionIndex,
		),
		nextReviewIdx: index("user_case_state_next_review_idx").on(
			table.userId,
			table.nextReviewAt,
		),
	}),
);
