import { z } from "zod";

export const PublicQuestionSchema = z.object({
	id: z.string(),
	text: z.string(),
	media: z.string().url().optional(),
});

export const FullCaseSchema = z.object({
	id: z.string(),
	title: z.string(),
	vignette: z.string(),
	media: z.string().url().optional(),
	questions: z.array(PublicQuestionSchema),
});
export type FullCaseDTO = z.infer<typeof FullCaseSchema>;

export const CaseListItemDTO = z.object({
	id: z.string().uuid(),
	title: z.string(),
	description: z.string().optional(),
});
export type CaseListItemDTO = z.infer<typeof CaseListItemDTO>;
