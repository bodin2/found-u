import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

export function listMigrationFiles(): string[] {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith(".sql"))
      .sort();
  } catch {
    return [];
  }
}

export function readMigrationSql(filename: string): string {
  return readFileSync(join(MIGRATIONS_DIR, filename), "utf8");
}

export function loadAllMigrationSql(): Array<{ filename: string; sql: string }> {
  return listMigrationFiles().map((filename) => ({
    filename,
    sql: readMigrationSql(filename),
  }));
}

export function loadSystemConfigMigrationSql(): string | null {
  const file = listMigrationFiles().find((name) => name.includes("system_config"));
  return file ? readMigrationSql(file) : null;
}

export function loadStorageMigrationSql(): string | null {
  const file = listMigrationFiles().find((name) => name.includes("setup_storage_buckets"));
  return file ? readMigrationSql(file) : null;
}

export function loadAccountsMigrationSql(): string | null {
  const file = listMigrationFiles().find((name) =>
    name.includes("create_unified_accounts")
  );
  return file ? readMigrationSql(file) : null;
}
