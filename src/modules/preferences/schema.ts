import {
	integer,
	jsonb,
	pgEnum,
	pgSchema,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

// Reutilizamos o schema 'app' já existente em outros módulos
const app = pgSchema("app");

export const sessionStatusEnum = app.enum("session_status", [
	"active",
	"completed",
	"abandoned",
]);

export const userPreferences = app.table("user_preferences", {
	userId: text("user_id").primaryKey(), // FK lógica para tabela de auth
	selectedTagIds: jsonb("selected_tag_ids").$type<number[]>().default([]),
	settings: jsonb("settings").$type<{
		defaultSessionSize?: number;
		theme?: "light" | "dark" | "system";
	}>(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

// Definição do tipo de item da fila para consistência com o SessionManager
type QueueItem = {
	caseId: number;
	activeQuestionIndices: number[];
};

export const studySessions = app.table("study_sessions", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id").notNull(),
	status: sessionStatusEnum("status").default("active").notNull(),
	currentIndex: integer("current_index").default(0).notNull(),
	totalQuestions: integer("total_questions").notNull(),
	// Armazena o estado completo da fila gerada para esta sessão
	queueState: jsonb("queue_state").$type<QueueItem[]>().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
