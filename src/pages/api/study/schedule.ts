import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { userCaseState } from "@/modules/srs/schema";
import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";

// Constants aligned with SRS philosophy (Short term = ~1.5 weeks, Long term = ~1.5 months)
const INTERVALS = {
	SHORT_TERM_DAYS: 10,
	LONG_TERM_DAYS: 45,
};

export const POST: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	let body: {
		caseId: number;
		questionIndex: number;
		action: "short_term" | "long_term" | "dismiss";
	};

	try {
		body = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
		});
	}

	const { caseId, questionIndex, action } = body;

	if (!caseId || typeof questionIndex !== "number" || !action) {
		return new Response(JSON.stringify({ error: "Missing fields" }), {
			status: 400,
		});
	}

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	// Definition of dates
	const now = new Date();
	let nextReview: Date | null = null;
	let isMastered = false;
	let daysAdded = 0;

	switch (action) {
		case "short_term":
			daysAdded = INTERVALS.SHORT_TERM_DAYS;
			nextReview = new Date(now.getTime() + daysAdded * 24 * 60 * 60 * 1000);
			isMastered = false;
			break;
		case "long_term":
			daysAdded = INTERVALS.LONG_TERM_DAYS;
			nextReview = new Date(now.getTime() + daysAdded * 24 * 60 * 60 * 1000);
			isMastered = false;
			break;
		case "dismiss":
			// Mark as mastered (removed from queue)
			nextReview = null;
			isMastered = true;
			daysAdded = 0;
			break;
		default:
			return new Response(JSON.stringify({ error: "Invalid action" }), {
				status: 400,
			});
	}

	try {
		await db
			.update(userCaseState)
			.set({
				nextReviewAt: nextReview,
				isMastered: isMastered,
				learningStatus: isMastered ? "mastered" : "learning",
			})
			.where(
				and(
					eq(userCaseState.userId, user.id),
					eq(userCaseState.caseId, caseId),
					eq(userCaseState.questionIndex, questionIndex),
				),
			);

		return new Response(
			JSON.stringify({
				success: true,
				scheduledFor: nextReview ? nextReview.toISOString() : null,
				days: daysAdded,
				action,
			}),
			{ status: 200 },
		);
	} catch (error) {
		console.error("Schedule Update Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
