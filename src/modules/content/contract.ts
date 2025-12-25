import { z } from "zod";

export const StrictQuestionSchema = z.object({
	text: z.string().min(1),
	correctAnswer: z.string().min(1),
	keywords: z.array(z.string().min(1)).default([]),
	order: z.number().int().nonnegative(),
	image: z.string().url().nullable().optional(),
});

const tagPattern =
	/^(?:[A-Za-z0-9\u00C0-\u00FF\-\(\)\.\/\,\:\s_&]+)(?:::[A-Za-z0-9\u00C0-\u00FF\-\(\)\.\/\,\:\s_&]+)*$/;

export const StrictCaseSchema = z
	.object({
		id: z.number().int().positive().nullable(),
		tempId: z.string().uuid().optional(),
		title: z.string().min(1),
		description: z.string().optional(),
		vignette: z.string().min(1),
		explanation: z.string().optional(),
		mainImageUrl: z.string().url().nullable().optional(),
		status: z.enum(["draft", "review", "published"]),
		difficulty: z.enum(["student", "general_practitioner", "specialist"]),
		tags: z
			.array(
				z
					.string()
					.regex(
						tagPattern,
						"Formato inválido. Use 'Categoria::Subcategoria' (aceita letras, números, acentos, -, (), ., /, &)",
					),
			)
			.min(1),
		questions: z.array(StrictQuestionSchema).min(1),
	})
	.superRefine((val, ctx) => {
		if (val.id === null) {
			if (!val.tempId) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "tempId é obrigatório quando id é null",
					path: ["tempId"],
				});
			}
		}
	});

export const FileSchema = z.array(StrictCaseSchema);
