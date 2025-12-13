import { z } from "zod";

export const PublicQuestionSchema = z.object({
	id: z.number(),
	text: z.string(),
	media: z.string().url().optional(),
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
