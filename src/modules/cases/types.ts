import { z } from "zod";

export const PublicQuestionSchema = z.object({
	id: z.number(),
	text: z.string(),
	media: z.string().url().optional(),
	order: z.number().int(),
});

export const FullCaseSchema = z.object({
	id: z.number(),
	title: z.string(),
	vignette: z.string(),
	media: z.string().url().optional(),
	questions: z.array(PublicQuestionSchema),
});
export type FullCaseDTO = z.infer<typeof FullCaseSchema>;

export const CaseListItemDTO = z.object({
	id: z.number(),
	title: z.string(),
	description: z.string().optional(),
});
export type CaseListItemDTO = z.infer<typeof CaseListItemDTO>;

export const CaseFeedbackSchema = z.object({
	isCorrect: z.boolean(),
	feedback: z.string(),
	score: z.number().min(0).max(100),
	officialAnswer: z.string(),
	keywords: z.array(z.string()).optional(),
});
export type CaseFeedbackDTO = z.infer<typeof CaseFeedbackSchema>;

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
