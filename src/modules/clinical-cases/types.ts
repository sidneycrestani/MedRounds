import { z } from "zod";

export const QuestionDataSchema = z.object({
  vignette: z.string(),
  question: z.string(),
});

export const CaseRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  questions: QuestionDataSchema,
  answers: z.string(),
});

export const CaseDTO = z.object({
  id: z.string().uuid(),
  title: z.string(),
  vignette: z.string(),
  questionText: z.string(),
});
export type CaseDTO = z.infer<typeof CaseDTO>;

export const CaseListItemDTO = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
});
export type CaseListItemDTO = z.infer<typeof CaseListItemDTO>;
