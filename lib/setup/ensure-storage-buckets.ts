import postgres from "postgres";
import { resolvePostgresUrl } from "@/lib/setup/db-url";
import { tableExists } from "@/lib/setup/probe";
import { loadStorageMigrationSql } from "@/lib/setup/schemas";

export async function ensureStorageBucketsWithSql(
  sql: postgres.Sql
): Promise<void> {
  if (!(await tableExists(sql, "storage", "buckets"))) {
    return;
  }

  const rows = await sql<{ name: string }[]>`
    SELECT name FROM storage.buckets WHERE name IN ('school-branding', 'item-uploads')
  `;
  const existing = new Set(rows.map((r) => r.name));
  if (existing.has("school-branding") && existing.has("item-uploads")) {
    return;
  }

  const storageSql = loadStorageMigrationSql();
  if (storageSql) {
    await sql.unsafe(storageSql);
  }
}

export async function ensureStorageBuckets(): Promise<void> {
  const connectionString = resolvePostgresUrl();
  if (!connectionString) return;

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    prepare: false,
  });

  try {
    await ensureStorageBucketsWithSql(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
