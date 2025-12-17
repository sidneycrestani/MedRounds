import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import {
	type UserSettings,
	userPreferences,
} from "@/modules/preferences/schema";
import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";

export const GET: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) return new Response(null, { status: 401 });

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		const prefs = await db
			.select({ settings: userPreferences.settings })
			.from(userPreferences)
			.where(eq(userPreferences.userId, user.id))
			.limit(1);

		const settings = prefs[0]?.settings || {
			theme: "system",
			use_custom_key: false,
		};

		return new Response(JSON.stringify(settings), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("GET Settings Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};

export const POST: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) return new Response(null, { status: 401 });

	// TIPAGEM CORRIGIDA AQUI
	let body: Partial<UserSettings>;
	try {
		body = await context.request.json();
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}

	// Validação dos campos permitidos com base no tipo
	// Nota: O TypeScript agora sabe que body.theme existe, mas precisamos garantir que é um dos valores literais
	const rawTheme = body.theme as string;
	const validTheme = ["light", "dark", "system"].includes(rawTheme)
		? (rawTheme as UserSettings["theme"])
		: "system";

	const settingsToSave: UserSettings = {
		theme: validTheme,
		use_custom_key: Boolean(body.use_custom_key),
	};

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		// Upsert na tabela user_preferences
		await db
			.insert(userPreferences)
			.values({
				userId: user.id,
				settings: settingsToSave,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: userPreferences.userId,
				set: {
					settings: settingsToSave,
					updatedAt: new Date(),
				},
			});

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error) {
		console.error("POST Settings Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
