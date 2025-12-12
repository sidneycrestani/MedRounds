import fs from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import * as schema from "./schema";

// 1. Carregar variáveis de ambiente
dotenv.config();

if (!process.env.DATABASE_URL) {
	console.error("❌ ERRO CRÍTICO: DATABASE_URL não encontrada no .env");
	process.exit(1);
}

// Configura conexão
const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

// --- Schemas ---
const TagSchema = z.object({
	name: z.string(),
	slug: z.string(),
	category: z.enum(["specialty", "system", "pathology", "drug", "other"]),
	parentSlug: z.string().optional(),
});

const QuestionSchema = z.object({
	text: z.string(),
	correctAnswer: z.string(),
	keywords: z.array(z.string()),
	order: z.number(),
	image: z.string().nullable().optional(),
});

const CaseSchema = z.object({
	title: z.string(),
	// Adicionado description como opcional no JSON
	description: z.string().optional(),
	vignette: z.string(),
	mainImageUrl: z.string().nullable().optional(),
	status: z.enum(["draft", "review", "published"]),
	difficulty: z.enum(["student", "general_practitioner", "specialist"]),
	tags: z.array(TagSchema),
	questions: z.array(QuestionSchema),
});

const FileSchema = z.array(CaseSchema);

// Cache
const tagCache = new Map<string, number>();

async function upsertTag(tagData: z.infer<typeof TagSchema>) {
	const cached = tagCache.get(tagData.slug);
	if (cached !== undefined) return cached;

	const existing = await db.query.tags.findFirst({
		where: eq(schema.tags.slug, tagData.slug),
	});

	if (existing) {
		tagCache.set(existing.slug, existing.id);
		return existing.id;
	}

	let parentId: number | null = null;
	if (tagData.parentSlug) {
		const parent = await db.query.tags.findFirst({
			where: eq(schema.tags.slug, tagData.parentSlug),
		});
		if (parent) parentId = parent.id;
	}

	const inserted = await db
		.insert(schema.tags)
		.values({
			name: tagData.name,
			slug: tagData.slug,
			category: tagData.category,
			parentId: parentId,
		})
		.returning({ id: schema.tags.id });

	console.log(`🏷️  Tag criada: ${tagData.name}`);
	tagCache.set(tagData.slug, inserted[0].id);
	return inserted[0].id;
}

async function main() {
	const dataDir = path.join(process.cwd(), "src", "data");

	if (!fs.existsSync(dataDir)) {
		console.error(`❌ Diretório ${dataDir} não encontrado.`);
		process.exit(1);
	}

	const files = fs
		.readdirSync(dataDir)
		.filter((f) => f.endsWith(".json"))
		.sort();

	console.log(`📂 Processando ${files.length} arquivos...`);

	for (const file of files) {
		const filePath = path.join(dataDir, file);

		try {
			const rawContent = fs.readFileSync(filePath, "utf-8");
			const json = JSON.parse(rawContent);

			const validationResult = FileSchema.safeParse(json);

			if (!validationResult.success) {
				console.error(`❌ Erro de Validação (Zod) em '${file}':`);
				console.error(JSON.stringify(validationResult.error.format(), null, 2));
				continue;
			}

			const cases = validationResult.data;

			for (const caseData of cases) {
				// LÓGICA DE DESCRIÇÃO AUTOMÁTICA
				// Se não houver descrição no JSON, cria uma a partir do Vignette
				// Isso garante que nunca será NULL no banco
				const descriptionToSave =
					caseData.description ??
					(caseData.vignette.length > 150
						? `${caseData.vignette.substring(0, 150)}...`
						: caseData.vignette);

				const existingCase = await db.query.clinicalCases.findFirst({
					where: eq(schema.clinicalCases.title, caseData.title),
				});

				let caseId: number;

				if (existingCase) {
					console.log(
						`🔄 Atualizando caso: "${caseData.title}" (ID: ${existingCase.id})`,
					);
					caseId = existingCase.id;

					await db
						.update(schema.clinicalCases)
						.set({
							description: descriptionToSave, // Agora sempre tem valor
							vignette: caseData.vignette,
							mainImageUrl: caseData.mainImageUrl ?? null,
							status: caseData.status,
							difficulty: caseData.difficulty,
						})
						.where(eq(schema.clinicalCases.id, caseId));

					await db
						.delete(schema.caseQuestions)
						.where(eq(schema.caseQuestions.caseId, caseId));
					await db
						.delete(schema.casesTags)
						.where(eq(schema.casesTags.caseId, caseId));
				} else {
					console.log(`✨ Criando novo caso: "${caseData.title}"`);
					const inserted = await db
						.insert(schema.clinicalCases)
						.values({
							title: caseData.title,
							description: descriptionToSave, // Agora sempre tem valor
							vignette: caseData.vignette,
							mainImageUrl: caseData.mainImageUrl ?? null,
							status: caseData.status,
							difficulty: caseData.difficulty,
						})
						.returning({ id: schema.clinicalCases.id });
					caseId = inserted[0].id;
				}

				for (const t of caseData.tags) {
					const tagId = await upsertTag(t);
					await db
						.insert(schema.casesTags)
						.values({ caseId, tagId })
						.onConflictDoNothing();
				}

				if (caseData.questions.length > 0) {
					await db.insert(schema.caseQuestions).values(
						caseData.questions.map((q) => ({
							caseId,
							questionText: q.text,
							correctAnswerText: q.correctAnswer,
							mustIncludeKeywords: q.keywords,
							orderIndex: q.order,
							contextImageUrl: q.image ?? null,
						})),
					);
				}
			}
		} catch (error) {
			console.error(`❌ ERRO FATAL ao processar '${file}':`);
			if (error instanceof Error) {
				console.error(`Mensagem: ${error.message}`);
			} else {
				console.error(String(error));
			}
		}
	}

	console.log("\n✅ Processo finalizado.");
	process.exit(0);
}

main();
