import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type Registry = { lastId: number; mappings: Record<string, number> };

function readRegistry(registryPath: string): Registry {
  if (!fs.existsSync(registryPath)) {
    return { lastId: 0, mappings: {} };
  }
  const raw = fs.readFileSync(registryPath, "utf-8");
  try {
    const parsed = JSON.parse(raw) as Registry;
    if (typeof parsed.lastId !== "number" || !parsed.mappings || typeof parsed.mappings !== "object") {
      throw new Error("invalid registry format");
    }
    return parsed;
  } catch {
    throw new Error(`Registro inválido em ${registryPath}`);
  }
}

function writeRegistry(registryPath: string, reg: Registry) {
  fs.writeFileSync(registryPath, JSON.stringify(reg, null, 2) + "\n");
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

function ensureUuid(): string {
  return crypto.randomUUID();
}

function main() {
  const registryPath = path.join(process.cwd(), "id_registry.lock.json");
  const dataDir = path.join(process.cwd(), "src", "content", "database");
  const files = listJsonFilesRecursive(dataDir);

  let reg = readRegistry(registryPath);

  let maxExistingId = reg.lastId;
  for (const f of files) {
    const arr = JSON.parse(fs.readFileSync(f, "utf-8")) as any[];
    for (const c of arr) {
      if (typeof c.id === "number" && Number.isInteger(c.id) && c.id > maxExistingId) {
        maxExistingId = c.id;
      }
    }
  }

  let changes = 0;

  for (const f of files) {
    const arr = JSON.parse(fs.readFileSync(f, "utf-8")) as any[];
    let mutated = false;
    for (const c of arr) {
      const hasNumberId = typeof c.id === "number" && Number.isInteger(c.id) && c.id > 0;
      if (hasNumberId) continue;

      if (c.id === null) {
        if (!c.tempId) {
          c.tempId = ensureUuid();
          mutated = true;
        }
        const uuid: string = c.tempId;
        const existing = reg.mappings[uuid];
        if (existing) {
          c.id = existing;
          delete c.tempId;
          mutated = true;
          changes++;
        } else {
          const nextId = Math.max(reg.lastId, maxExistingId) + 1;
          reg.mappings[uuid] = nextId;
          reg.lastId = nextId;
          c.id = nextId;
          delete c.tempId;
          mutated = true;
          changes++;
        }
      }
    }
    if (mutated) {
      fs.writeFileSync(f, JSON.stringify(arr, null, 2) + "\n");
    }
  }

  reg.lastId = Math.max(
    reg.lastId,
    ...Object.values(reg.mappings),
    maxExistingId,
  );

  if (changes > 0) {
    writeRegistry(registryPath, reg);
    console.log(`IDs atribuídos/atualizados: ${changes}`);
  } else {
    console.log("Nenhuma atribuição necessária.");
  }
}

main();

