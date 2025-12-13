import fs from "node:fs";
import path from "node:path";
import { FileSchema } from "@/modules/content/contract";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";

// Imports da Nova Arquitetura
import { getDb } from "@/core/db";
import { caseQuestions, clinicalCases } from "@/modules/content/schema";
import { casesTags } from "@/modules/taxonomy/schema";
import { upsertTagHierarchy } from "@/modules/taxonomy/services";

// 1. Carregar variáveis
dotenv.config();

// Fallback manual para o script de seed caso o helper de env não esteja acessível via tsx
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error("❌ ERRO CRÍTICO: DATABASE_URL não encontrada no .env");
	process.exit(1);
}

// Inicializa DB
const db = getDb(DATABASE_URL);

function listJsonFilesRecursive(dir: string): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files: string[] = [];
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) files.push(...listJsonFilesRecursive(full));
		else if (e.isFile() && e.name.endsWith(".json")) files.push(full);
	}
	return files.sort();
}

function locateIssueLine(
	raw: string,
	issuePath: (string | number)[],
): number | null {
	const lines = raw.split(/\r?\n/);
	const lastKey = issuePath.filter((p) => typeof p === "string").pop() as
		| string
		| undefined;
	if (!lastKey) return null;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(`"${lastKey}"`)) return i + 1;
	}
	return null;
}

async function main() {
	const dataDir = path.join(process.cwd(), "src", "content", "database");

	if (!fs.existsSync(dataDir)) {
		console.error(`❌ Diretório ${dataDir} não encontrado.`);
		process.exit(1);
	}

	const files = listJsonFilesRecursive(dataDir);

	console.log(`📂 Processando ${files.length} arquivos...`);

	for (const file of files) {
		const filePath = path.join(dataDir, file);
		console.log(`\n📄 Lendo arquivo: ${file}`);

		try {
			const rawContent = fs.readFileSync(filePath, "utf-8");
			const json = JSON.parse(rawContent);

			const validationResult = FileSchema.safeParse(json);
			if (!validationResult.success) {
				const formatted = validationResult.error.errors.map((e) => ({
					path: e.path.join("."),
					message: e.message,
					line: locateIssueLine(rawContent, e.path) ?? undefined,
				}));
				console.error(`❌ Erro de Validação em '${file}':`);
				console.error(JSON.stringify(formatted, null, 2));
				continue;
			}

			const cases = validationResult.data;

			for (const caseData of cases) {
				// --- 1. Upsert do Caso Clínico ---

				// Garante que description não seja null
				const descriptionToSave =
					caseData.description ??
					(caseData.vignette.length > 150
						? `${caseData.vignette.substring(0, 150)}...`
						: caseData.vignette);

				const existingCase = await db
					.select()
					.from(clinicalCases)
					.where(eq(clinicalCases.title, caseData.title))
					.limit(1);

				let caseId: number;

				if (existingCase.length > 0) {
					console.log(`🔄 Atualizando: "${caseData.title}"`);
					caseId = existingCase[0].id;

					await db
						.update(clinicalCases)
						.set({
							description: descriptionToSave,
							vignette: caseData.vignette,
							mainImageUrl: caseData.mainImageUrl ?? null,
							status: caseData.status,
							difficulty: caseData.difficulty,
							lastUpdated: new Date(),
						})
						.where(eq(clinicalCases.id, caseId));

					// Limpa relações antigas para recriar
					await db
						.delete(caseQuestions)
						.where(eq(caseQuestions.caseId, caseId));
					await db.delete(casesTags).where(eq(casesTags.caseId, caseId));
				} else {
					console.log(`✨ Criando novo: "${caseData.title}"`);
					const inserted = await db
						.insert(clinicalCases)
						.values({
							title: caseData.title,
							description: descriptionToSave,
							vignette: caseData.vignette,
							mainImageUrl: caseData.mainImageUrl ?? null,
							status: caseData.status,
							difficulty: caseData.difficulty,
						})
						.returning({ id: clinicalCases.id });
					caseId = inserted[0].id;
				}

				// --- 2. Processamento de Tags (Hierarquia Anki) ---
				if (caseData.tags && caseData.tags.length > 0) {
					for (const tagPath of caseData.tags) {
						try {
							// Chama o serviço que faz o split "A::B::C" e upsert recursivo
							const leafTagId = await upsertTagHierarchy(db, tagPath);

							// Vincula o caso à tag folha
							await db
								.insert(casesTags)
								.values({ caseId, tagId: leafTagId })
								.onConflictDoNothing();

							// console.log(`   🏷️  Tag vinculada: ${tagPath} -> ID ${leafTagId}`);
						} catch (err) {
							console.error(`   ⚠️  Erro ao processar tag "${tagPath}":`, err);
						}
					}
				}

				// --- 3. Inserção de Perguntas ---
				if (caseData.questions.length > 0) {
					await db.insert(caseQuestions).values(
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
			console.error(error);
		}
	}

	console.log("\n✅ Seed finalizado com sucesso.");
	process.exit(0);
}

main();
