import type { QueueItemDTO } from "@/modules/cases/types";
import {
	integer,
	jsonb,
	pgSchema,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

const app = pgSchema("app");

export const sessionStatusEnum = app.enum("session_status", [
	"active",
	"completed",
	"abandoned",
]);

// Interface para Tipagem no TypeScript
export type UserSettings = {
	theme: "light" | "dark" | "system";
	use_custom_key: boolean;
};

export const userPreferences = app.table("user_preferences", {
	userId: text("user_id").primaryKey(),
	selectedTagIds: jsonb("selected_tag_ids").$type<number[]>().default([]),
	settings: jsonb("settings")
		.$type<UserSettings>()
		.default({ theme: "system", use_custom_key: false }),
	// NOVA COLUNA: Armazena a chave encriptada de forma segura
	encryptedGeminiKey: text("encrypted_gemini_key"),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const studySessions = app.table("study_sessions", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id").notNull(),
	status: sessionStatusEnum("status").default("active").notNull(),
	currentIndex: integer("current_index").default(0).notNull(),
	totalQuestions: integer("total_questions").notNull(),
	// Armazena o estado completo da fila gerada para esta sessão
	queueState: jsonb("queue_state").$type<QueueItemDTO[]>().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
