import fs from "node:fs";
import path from "node:path";
import { FileSchema } from "@/modules/content/contract";

function flattenMasterTaxonomy(
	obj: Record<string, any>,
	parentPath = "",
): string[] {
	let paths: string[] = [];
	for (const key of Object.keys(obj)) {
		const currentPath = parentPath ? `${parentPath}::${key}` : key;
		paths.push(currentPath);

		const value = obj[key];
		if (value && typeof value === "object" && !Array.isArray(value)) {
			paths = [...paths, ...flattenMasterTaxonomy(value, currentPath)];
		}
	}
	return paths;
}

function listJsonFilesRecursive(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files: string[] = [];
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) files.push(...listJsonFilesRecursive(full));
		else if (e.isFile() && e.name.endsWith(".json")) files.push(full);
	}
	return files.sort();
}

function loadAllowedTags(): Set<string> | null {
	const file = path.join(
		process.cwd(),
		"src",
		"modules",
		"taxonomy",
		"master.json",
	);
	if (!fs.existsSync(file)) return null;
	try {
		const raw = fs.readFileSync(file, "utf-8");
		const obj = JSON.parse(raw);
		// Diferença principal: agora processa a estrutura hierárquica
		const flatPaths = flattenMasterTaxonomy(obj);
		return new Set(flatPaths);
	} catch (e) {
		console.error("Failed to parse master.json:", e);
		return null;
	}
}

function readRegistry(): {
	lastId: number;
	mappings: Record<string, number>;
} | null {
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
			return obj as { lastId: number; mappings: Record<string, number> };
		}
		return null;
	} catch {
		return null;
	}
}

function main() {
	const dataDir = path.join(process.cwd(), "src", "content", "database");
	const files = listJsonFilesRecursive(dataDir);
	const ids = new Map<number, string>();
	const allowed = loadAllowedTags();
	const registry = readRegistry();
	const errors: string[] = [];

	if (!allowed) {
		console.warn(
			"⚠️  Warning: master.json not found or invalid. Skipping tag validation.",
		);
	}

	for (const file of files) {
		try {
			const raw = fs.readFileSync(file, "utf-8");
			const json = JSON.parse(raw);
			const parsed = FileSchema.safeParse(json);

			if (!parsed.success) {
				console.error(`\n❌ Schema Validation Error in ${file}:`);
				console.error(JSON.stringify(parsed.error.format(), null, 2));

				errors.push(`Invalid file schema: ${file}`);
				continue;
			}

			for (const c of parsed.data) {
				// 1. Validação de ID
				const effectiveId =
					c.id ??
					(c.tempId && registry ? registry.mappings[c.tempId] : undefined);
				if (typeof effectiveId !== "number") {
					errors.push(
						`Unassigned ID for case in ${file}${c.tempId ? ` (tempId ${c.tempId})` : ""}`,
					);
					continue;
				}
				if (ids.has(effectiveId)) {
					errors.push(
						`Duplicate id ${effectiveId} in ${file} (also in ${ids.get(effectiveId)})`,
					);
				} else {
					ids.set(effectiveId, file);
				}

				// 2. Validação de Tags
				if (allowed) {
					for (const t of c.tags) {
						if (!allowed.has(t)) errors.push(`Unknown tag '${t}' in ${file}`);
					}
				}
			}
		} catch (e) {
			errors.push(`JSON Parse error in ${file}`);
		}
	}

	if (errors.length) {
		console.error(errors.join("\n"));
		process.exit(1);
	}

	console.log(`✅ Lint passed: ${files.length} files checked.`);
	process.exit(0);
}

main();
