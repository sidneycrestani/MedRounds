import type { Database } from "@/core/db";
import { generateStudySession } from "@/modules/cases/cases.repository";
import { studySessions, userPreferences } from "@/modules/preferences/schema";
import { tags } from "@/modules/taxonomy/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export async function findActiveSession(db: Database, userId: string) {
	const sessions = await db
		.select()
		.from(studySessions)
		.where(
			and(eq(studySessions.userId, userId), eq(studySessions.status, "active")),
		)
		.orderBy(desc(studySessions.lastActivityAt))
		.limit(1);

	return sessions[0] || null;
}

export async function getLastPreferences(db: Database, userId: string) {
	const prefs = await db
		.select()
		.from(userPreferences)
		.where(eq(userPreferences.userId, userId))
		.limit(1);

	return prefs[0] || null;
}

type CreateSessionParams = {
	userId: string;
	tagIds: number[];
	limit?: number;
};

export async function createSession(
	db: Database,
	{ userId, tagIds, limit = 20 }: CreateSessionParams,
) {
	return await db.transaction(async (tx) => {
		await tx.delete(studySessions).where(eq(studySessions.userId, userId)); // Passo A: Salvar Preferências (Upsert)
		// Isso garante que na próxima vez a UI saiba o que foi selecionado por último
		await tx
			.insert(userPreferences)
			.values({
				userId,
				selectedTagIds: tagIds,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: userPreferences.userId,
				set: {
					selectedTagIds: tagIds,
					updatedAt: new Date(),
				},
			});

		// Passo B: Preparar dados para geração da fila
		// O generateStudySession espera slugs, mas recebemos IDs da UI
		let tagSlugs: string[] = [];
		if (tagIds.length > 0) {
			const tagRows = await tx
				.select({ slug: tags.slug })
				.from(tags)
				.where(inArray(tags.id, tagIds));
			tagSlugs = tagRows.map((t) => t.slug);
		}

		// Passo C: Gerar Fila (Reutilizando lógica do repositório de cases)
		const rawQueue = await generateStudySession(tx, userId, tagSlugs);

		// Passo D: Aplicar Limite e Persistir Sessão
		const finalQueue = rawQueue.slice(0, limit);

		// Se a fila estiver vazia, podemos decidir lançar erro ou criar sessão vazia.
		// Aqui optamos por criar mesmo que vazia para feedback visual no front,
		// ou você pode lançar erro se preferir.

		const [newSession] = await tx
			.insert(studySessions)
			.values({
				userId,
				status: "active",
				totalQuestions: finalQueue.length,
				currentIndex: 0,
				queueState: finalQueue,
				createdAt: new Date(),
				lastActivityAt: new Date(),
			})
			.returning({ id: studySessions.id });

		// Se existiam sessões ativas antigas, poderíamos marcá-las como abandonadas aqui,
		// mas o findActiveSession pega a mais recente, então fica implícito.

		return newSession.id;
	});
}
