import { z } from "zod";

// --- Questions ---
export const PublicQuestionSchema = z.object({
	id: z.number(),
	text: z.string(),
	media: z.string().url().optional(),
	order: z.number().int(),
	correctAnswer: z.string(),
});
export type PublicQuestionDTO = z.infer<typeof PublicQuestionSchema>;

// --- Cases ---
export const FullCaseSchema = z.object({
	id: z.number(),
	title: z.string(),
	vignette: z.string(),
	explanation: z.string().nullable().optional(),
	media: z.string().url().optional(),
	questions: z.array(PublicQuestionSchema),
});
export type FullCaseDTO = z.infer<typeof FullCaseSchema>;

// Extension for Frontend (includes navigation)
export type PublicCaseDataDTO = FullCaseDTO & {
	prevId: number | null;
	nextId: number | null;
	searchParams: string;
};

// --- Lists ---
export const CaseListItemDTO = z.object({
	id: z.number(),
	title: z.string(),
	description: z.string().optional(),
});
export type CaseListItemDTO = z.infer<typeof CaseListItemDTO>;

// --- Session / Queue ---
export const QueueItemSchema = z.object({
	caseId: z.number(),
	activeQuestionIndices: z.array(z.number()),
});
export type QueueItemDTO = z.infer<typeof QueueItemSchema>;

// --- Feedback ---
export const CaseFeedbackSchema = z.object({
	isCorrect: z.boolean(),
	feedback: z.string(),
	score: z.number().min(0).max(100),
	officialAnswer: z.string(),
	keywords: z.array(z.string()).optional(),
});
export type CaseFeedbackDTO = z.infer<typeof CaseFeedbackSchema>;

// --- Taxonomy / Search ---
export type TagNode = { slug: string } | { op: "AND" | "OR"; nodes: TagNode[] };

export const TagNodeSchema: z.ZodType<TagNode> = z.lazy(() =>
	z.union([
		z.object({ slug: z.string() }),
		z.object({
			op: z.enum(["AND", "OR"]),
			nodes: z.array(TagNodeSchema).min(1),
		}),
	]),
);

export const SearchFilterSchema = z.object({
	tags: TagNodeSchema.optional(),
	exclusion_rules: z
		.object({
			userId: z.string().min(1),
			srs: z
				.object({
					scoreThreshold: z.number().int().min(0).max(100).default(80),
					windowDays: z.number().int().positive().default(30),
				})
				.optional(),
		})
		.optional(),
});
export type SearchFilter = z.infer<typeof SearchFilterSchema>;
