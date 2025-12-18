import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { userCaseHistory } from "@/modules/srs/schema";
import type { APIRoute } from "astro";
import { and, desc, eq } from "drizzle-orm";

export const PATCH: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) return new Response(null, { status: 401 });

	const body = await context.request.json();
	const { caseId, questionIndex, notes } = body;

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		// Busca o ID da última tentativa para este caso/questão
		const historyEntry = await db
			.select({ id: userCaseHistory.id })
			.from(userCaseHistory)
			.where(
				and(
					eq(userCaseHistory.userId, user.id),
					eq(userCaseHistory.caseId, caseId),
					eq(userCaseHistory.questionIndex, questionIndex),
				),
			)
			.orderBy(desc(userCaseHistory.attemptedAt))
			.limit(1);

		if (historyEntry.length > 0) {
			await db
				.update(userCaseHistory)
				.set({ userNotes: notes })
				.where(eq(userCaseHistory.id, historyEntry[0].id));
		}

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error) {
		console.error("Notes Update Error:", error);
		return new Response(JSON.stringify({ error: "Server Error" }), {
			status: 500,
		});
	}
};
