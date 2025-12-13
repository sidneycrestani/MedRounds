import { clinicalCases } from "@/modules/content/schema";
import {
	boolean,
	doublePrecision,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

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
		isMastered: boolean("is_mastered").notNull().default(false),
		lastScore: integer("last_score"),
		consecutiveCorrect: integer("consecutive_correct"),
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
