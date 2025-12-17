import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { userPreferences } from "@/modules/preferences/schema";
import { studySessions } from "@/modules/preferences/schema";
import {
	createSession,
	findActiveSession,
	getLastPreferences,
} from "@/modules/study/services";
import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";

export const DELETE: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) return new Response(null, { status: 401 });

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		// Marca sessões ativas como abandonadas
		await db
			.update(studySessions)
			.set({ status: "abandoned", lastActivityAt: new Date() })
			.where(
				and(
					eq(studySessions.userId, user.id),
					eq(studySessions.status, "active"),
				),
			);

		return new Response(null, { status: 204 });
	} catch (error) {
		console.error("Error ending session:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
export const PATCH: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) return new Response(null, { status: 401 });

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	let body: { tagIds?: number[]; action?: string } = {};
	try {
		body = await context.request.json();
	} catch {
		// Ignora erro de parse se body estiver vazio
	}

	// MODO 1: Atualizar Preferências (Lógica existente, mantida para compatibilidade)
	if (body.tagIds && Array.isArray(body.tagIds)) {
		try {
			await db
				.insert(userPreferences)
				.values({
					userId: user.id,
					selectedTagIds: body.tagIds,
					updatedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: userPreferences.userId,
					set: {
						selectedTagIds: body.tagIds,
						updatedAt: new Date(),
					},
				});
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		} catch (error) {
			console.error(error);
			return new Response(JSON.stringify({ error: "Update failed" }), {
				status: 500,
			});
		}
	}

	// MODO 2: Avançar Sessão (NOVA LÓGICA)
	if (body.action === "advance") {
		try {
			// 1. Buscar sessão ativa
			const activeSession = await findActiveSession(db, user.id);
			if (!activeSession) {
				return new Response(JSON.stringify({ error: "No active session" }), {
					status: 404,
				});
			}

			const newIndex = activeSession.currentIndex + 1;
			const isCompleted = newIndex >= activeSession.totalQuestions;

			// 2. Atualizar Banco
			await db
				.update(studySessions)
				.set({
					currentIndex: newIndex,
					status: isCompleted ? "completed" : "active",
					lastActivityAt: new Date(),
				})
				.where(eq(studySessions.id, activeSession.id));

			return new Response(
				JSON.stringify({
					success: true,
					newIndex,
					isCompleted,
				}),
				{ status: 200 },
			);
		} catch (error) {
			console.error("Error advancing session:", error);
			return new Response(JSON.stringify({ error: "Internal Server Error" }), {
				status: 500,
			});
		}
	}

	return new Response(JSON.stringify({ error: "Invalid request" }), {
		status: 400,
	});
};
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
