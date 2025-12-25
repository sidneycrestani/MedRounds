import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { FileSchema } from "@/modules/content/contract";
import * as dotenv from "dotenv";
import { eq, inArray } from "drizzle-orm";

// Imports da Arquitetura
import { getDb } from "@/core/db";
import { caseQuestions, clinicalCases } from "@/modules/content/schema";
import { casesTags } from "@/modules/taxonomy/schema";
import { upsertTagHierarchy } from "@/modules/taxonomy/services";

// 1. Carregar variáveis
dotenv.config();

// Fallback manual para o script de seed
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error("❌ ERRO CRÍTICO: DATABASE_URL não encontrada no .env");
	process.exit(1);
}

// Inicializa DB
const db = getDb(DATABASE_URL);

type Registry = { lastId: number; mappings: Record<string, number> };
function readRegistry(): Registry | null {
	const file = path.join(process.cwd(), "id_registry.lock.json");
	if (!fs.existsSync(file)) return null;
	try {
		const raw = fs.readFileSync(file, "utf-8");
		const obj = JSON.parse(raw);
		if (
			typeof obj.lastId === "number" &&
			obj.mappings &&
			typeof obj.mappings === "object"
		) {
			return obj as Registry;
		}
		return null;
	} catch {
		return null;
	}
}

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
interface TaxonomyNode {
	[key: string]: TaxonomyNode | unknown;
}
function flattenMasterTaxonomy(obj: TaxonomyNode, parentPath = ""): string[] {
	let paths: string[] = [];
	for (const key of Object.keys(obj)) {
		const currentPath = parentPath ? `${parentPath}::${key}` : key;
		paths.push(currentPath);

		const value = obj[key];
		// Se tem filhos (objeto não vazio e não array), recursão
		if (value && typeof value === "object" && !Array.isArray(value)) {
			paths = [
				...paths,
				...flattenMasterTaxonomy(value as TaxonomyNode, currentPath),
			];
		}
	}
	return paths;
}

async function main() {
	const dataDir = path.join(process.cwd(), "src", "content", "database");

	if (!fs.existsSync(dataDir)) {
		console.error(`❌ Diretório ${dataDir} não encontrado.`);
		process.exit(1);
	}

	console.log("🛡️  Validando Taxonomia (Allowlist)...");
	const masterPath = path.join(
		process.cwd(),
		"src",
		"modules",
		"taxonomy",
		"master.json",
	);

	if (!fs.existsSync(masterPath)) {
		console.error("❌ master.json não encontrado.");
		process.exit(1);
	}

	const masterRaw = fs.readFileSync(masterPath, "utf-8");
	let allowedTagsSet: Set<string>;

	try {
		const masterObj = JSON.parse(masterRaw);
		const flattened = flattenMasterTaxonomy(masterObj);
		allowedTagsSet = new Set(flattened);
	} catch (e) {
		console.error("❌ Erro ao processar master.json:", e);
		process.exit(1);
	}

	const files = listJsonFilesRecursive(dataDir);
	let taxonomyError = false;

	// Validação preliminar de taxonomia
	for (const file of files) {
		const rawContent = fs.readFileSync(file, "utf-8");
		const json = JSON.parse(rawContent);
		const parsed = FileSchema.safeParse(json);

		if (parsed.success) {
			for (const kase of parsed.data) {
				if (kase.tags) {
					for (const t of kase.tags) {
						if (!allowedTagsSet.has(t)) {
							console.error(`⛔ TAG PROIBIDA: "${t}"`);
							console.error(`   Arquivo: ${path.basename(file)}`);
							console.error(
								"   Solução: Adicione ao master.json ou corrija o caso.",
							);
							taxonomyError = true;
						}
					}
				}
			}
		}
	}

	if (taxonomyError) {
		console.error("\n🚫 Abortando seed por violação de taxonomia.");
		process.exit(1);
	}
	console.log("✅ Taxonomia validada.");

	// --- 2. Otimização: Cache de Hashes ---
	console.log("⚡ Pré-carregando hashes do banco de dados...");
	const existingRows = await db
		.select({
			id: clinicalCases.id,
			contentHash: clinicalCases.contentHash,
		})
		.from(clinicalCases);

	// Mapa O(1) para buscar hash por ID: Map<CaseID, HashString>
	const dbHashMap = new Map<number, string | null>();
	for (const row of existingRows) {
		dbHashMap.set(row.id, row.contentHash);
	}
	console.log(`📊 ${existingRows.length} casos já existentes no banco.`);

	// --- 3. Processamento dos Arquivos ---
	console.log(`📂 Processando ${files.length} arquivos JSON...`);

	const stats = { inserted: 0, updated: 0, skipped: 0, deleted: 0 };
	const registry = readRegistry();

	// Conjunto para rastrear todos os IDs encontrados nos arquivos JSON
	// Usado posteriormente para deletar casos obsoletos do banco
	const processedIds = new Set<number>();

	for (const file of files) {
		const filePath = file;
		// console.log(`\n📄 Lendo: ${path.basename(file)}`);

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
				console.error(`❌ Erro de Validação em '${path.basename(file)}':`);
				console.error(JSON.stringify(formatted, null, 2));
				continue;
			}

			const cases = validationResult.data;

			for (const caseData of cases) {
				// --- 3.1. Preparação de Dados do Caso ---

				// Fallback para descrição
				const descriptionToSave =
					caseData.description ??
					(caseData.vignette.length > 150
						? `${caseData.vignette.substring(0, 150)}...`
						: caseData.vignette);

				const effectiveId =
					caseData.id ??
					(caseData.tempId && registry
						? registry.mappings[caseData.tempId]
						: undefined);

				if (typeof effectiveId !== "number") {
					console.error(
						`❌ Caso sem ID oficial atribuído: ${file} (tempId: ${caseData.tempId ?? ""})`,
					);
					continue;
				}

				// Marca ID como processado
				processedIds.add(effectiveId);

				// Gera hash determinístico
				const contentHash = crypto
					.createHash("sha1")
					.update(
						JSON.stringify({
							id: effectiveId,
							title: caseData.title,
							description: descriptionToSave,
							vignette: caseData.vignette,
							explanation: caseData.explanation ?? null,
							mainImageUrl: caseData.mainImageUrl ?? null,
							status: caseData.status,
							difficulty: caseData.difficulty,
							tags: [...(caseData.tags ?? [])].sort(),
							// Otimização: Inclui keywords ordenadas no hash
							questions: caseData.questions.map((q) => ({
								text: q.text,
								correctAnswer: q.correctAnswer,
								order: q.order,
								image: q.image ?? null,
								keywords: [...(q.keywords ?? [])].sort(),
							})),
						}),
					)
					.digest("hex");

				// --- 3.2. Verificação Otimizada (Local) ---
				const storedHash = dbHashMap.get(effectiveId);
				const exists = dbHashMap.has(effectiveId);
				const needsUpdate = exists && storedHash !== contentHash;

				if (exists && !needsUpdate) {
					stats.skipped++;
					process.stdout.write("."); // Feedback visual minimalista
					continue;
				}

				// --- 3.3. Persistência ---
				if (needsUpdate) {
					// UPDATE
					await db
						.update(clinicalCases)
						.set({
							title: caseData.title,
							description: descriptionToSave,
							vignette: caseData.vignette,
							explanation: caseData.explanation ?? null,
							mainImageUrl: caseData.mainImageUrl ?? null,
							status: caseData.status,
							difficulty: caseData.difficulty,
							lastUpdated: new Date(),
							contentHash,
						})
						.where(eq(clinicalCases.id, effectiveId));

					// ATENÇÃO: Estratégia "Wipe and Replace" para consistência.
					// Isso garante que se uma pergunta for removida do JSON, ela será removida do banco.
					// O mesmo vale para tags (cases_tags).
					await db
						.delete(caseQuestions)
						.where(eq(caseQuestions.caseId, effectiveId));
					await db.delete(casesTags).where(eq(casesTags.caseId, effectiveId));

					stats.updated++;
				} else {
					// INSERT
					await db.insert(clinicalCases).values({
						id: effectiveId,
						title: caseData.title,
						description: descriptionToSave,
						vignette: caseData.vignette,
						explanation: caseData.explanation ?? null,
						mainImageUrl: caseData.mainImageUrl ?? null,
						status: caseData.status,
						difficulty: caseData.difficulty,
						contentHash,
					});

					stats.inserted++;
				}

				// --- 3.4. Tags (Sempre recriadas no update ou criadas no insert) ---
				if (caseData.tags && caseData.tags.length > 0) {
					for (const tagPath of caseData.tags) {
						try {
							const leafTagId = await upsertTagHierarchy(db, tagPath);
							await db
								.insert(casesTags)
								.values({ caseId: effectiveId, tagId: leafTagId })
								.onConflictDoNothing();
						} catch (err) {
							console.error(`   ⚠️  Erro ao processar tag "${tagPath}":`, err);
						}
					}
				}

				// --- 3.5. Perguntas (Sempre recriadas no update ou criadas no insert) ---
				if (caseData.questions.length > 0) {
					await db.insert(caseQuestions).values(
						caseData.questions.map((q) => ({
							caseId: effectiveId,
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

	// --- 4. Garbage Collection (Remover casos deletados do JSON) ---
	// Verifica quais IDs existem no banco mas NÃO foram processados nesta rodada
	const allDbCases = await db
		.select({ id: clinicalCases.id })
		.from(clinicalCases);

	const idsToDelete = allDbCases
		.map((c) => c.id)
		.filter((id) => !processedIds.has(id));

	if (idsToDelete.length > 0) {
		console.log(
			`\n🗑️  Detectados ${idsToDelete.length} casos obsoletos (removidos dos JSONs). Limpando...`,
		);

		// Remove explicitamente as dependências primeiro para evitar erros de FK
		// (embora o DELETE CASCADE no DB geralmente resolva, é mais seguro aqui)
		await db
			.delete(caseQuestions)
			.where(inArray(caseQuestions.caseId, idsToDelete));
		await db.delete(casesTags).where(inArray(casesTags.caseId, idsToDelete));

		// Remove os casos
		await db
			.delete(clinicalCases)
			.where(inArray(clinicalCases.id, idsToDelete));

		stats.deleted = idsToDelete.length;
	}

	console.log("\n\n✅ Seed finalizado!");
	console.log(
		`   🆕 Inseridos: ${stats.inserted} | 🔄 Atualizados: ${stats.updated} | ⏩ Pulados: ${stats.skipped} | 🗑️  Deletados: ${stats.deleted}`,
	);
	process.exit(0);
}

main();
