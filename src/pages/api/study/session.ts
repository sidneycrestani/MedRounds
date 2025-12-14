import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import {
	createSession,
	findActiveSession,
	getLastPreferences,
} from "@/modules/study/services";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		// 1. Tenta buscar sessão ativa
		const activeSession = await findActiveSession(db, user.id);

		if (activeSession) {
			return new Response(
				JSON.stringify({
					status: "active",
					sessionId: activeSession.id,
					queue: activeSession.queueState,
					progress: {
						current: activeSession.currentIndex,
						total: activeSession.totalQuestions,
					},
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		// 2. Se não tem sessão ativa, busca preferências anteriores para pré-preencher a UI
		const prefs = await getLastPreferences(db, user.id);

		return new Response(
			JSON.stringify({
				status: "idle",
				lastPreferences: {
					tagIds: prefs?.selectedTagIds ?? [],
				},
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("GET Session Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};

export const POST: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	let body: { tagIds: number[]; quantity?: number } | null = null;
	try {
		body = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
		});
	}

	const tagIds = Array.isArray(body?.tagIds) ? body?.tagIds : [];
	const quantity = typeof body?.quantity === "number" ? body.quantity : 20;

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		const sessionId = await createSession(db, {
			userId: user.id,
			tagIds,
			limit: quantity,
		});

		return new Response(JSON.stringify({ sessionId }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Create Session Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
