import postgres from "postgres";
import { resolvePostgresUrl } from "@/lib/setup/db-url";
import { tableExists } from "@/lib/setup/probe";
import { loadAccountsMigrationSql } from "@/lib/setup/schemas";

export async function ensureAccountsTableWithSql(
  sql: postgres.Sql
): Promise<void> {
  if (await tableExists(sql, "public", "accounts")) {
    return;
  }

  const accountsSql = loadAccountsMigrationSql();
  if (accountsSql) {
    await sql.unsafe(accountsSql);
  }
}

export async function ensureAccountsTable(): Promise<void> {
  const connectionString = resolvePostgresUrl();
  if (!connectionString) return;

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    prepare: false,
  });

  try {
    await ensureAccountsTableWithSql(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
