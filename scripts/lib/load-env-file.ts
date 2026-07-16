import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Load KEY=VALUE pairs from a dotenv file into process.env (overwrites existing). */
export function loadEnvFile(filename: string, cwd = process.cwd()): void {
  const path = resolve(cwd, filename);
  if (!existsSync(path)) {
    throw new Error(`Env file not found: ${path}`);
  }

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function applyEnvToProcess(filename: string): NodeJS.ProcessEnv {
  loadEnvFile(filename);
  return { ...process.env };
}
