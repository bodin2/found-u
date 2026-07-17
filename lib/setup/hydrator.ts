import postgres from "postgres";
import {
  LEGACY_SETUP_BACKFILL_SQL,
  RESET_FALSE_SETUP_WITHOUT_ADMIN_SQL,
} from "@/lib/setup/backfill-sql";
import { ensureAccountsTableWithSql } from "@/lib/setup/ensure-accounts-table";
import { ensureContentCmsWithSql } from "@/lib/setup/ensure-content-cms";
import { ensureStorageBucketsWithSql } from "@/lib/setup/ensure-storage-buckets";
import { SETUP_ADVISORY_LOCK_ID } from "@/lib/setup/constants";
import { resolvePostgresUrl } from "@/lib/setup/db-url";
import { probeDatabaseState, tableExists } from "@/lib/setup/probe";
import {
  loadAllMigrationSql,
  loadSystemConfigMigrationSql,
} from "@/lib/setup/schemas";

export type HydrationResult = {
  ok: boolean;
  reason?: "missing_env" | "no_migrations" | "hydration_failed";
  error?: string;
  mode?: "full" | "system_config_only" | "skipped";
};

async function runSqlBatch(sql: postgres.Sql, batchSql: string): Promise<void> {
  await sql.unsafe(batchSql);
}

export async function hydrateDatabase(): Promise<HydrationResult> {
  const connectionString = resolvePostgresUrl();
  if (!connectionString) {
    return { ok: false, reason: "missing_env" };
  }

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    prepare: false,
  });

  try {
    await sql`SELECT pg_advisory_lock(${SETUP_ADVISORY_LOCK_ID})`;

    const state = await probeDatabaseState(sql);

    if (state.hasSystemConfig && state.hasLostItems) {
      await ensureAccountsTableWithSql(sql);
      await ensureContentCmsWithSql(sql);
      await backfillSetupStatusIfNeeded(sql);
      await ensureStorageBucketsWithSql(sql);
      return { ok: true, mode: "skipped" };
    }

    if (state.hasLostItems && !state.hasSystemConfig) {
      const systemConfigSql = loadSystemConfigMigrationSql();
      if (!systemConfigSql) {
        return { ok: false, reason: "no_migrations" };
      }
      await runSqlBatch(sql, systemConfigSql);
      await ensureAccountsTableWithSql(sql);
      await ensureContentCmsWithSql(sql);
      await backfillSetupStatusIfNeeded(sql);
      await ensureStorageBucketsWithSql(sql);
      return { ok: true, mode: "system_config_only" };
    }

    const migrations = loadAllMigrationSql();
    if (migrations.length === 0) {
      return { ok: false, reason: "no_migrations" };
    }

    for (const migration of migrations) {
      await runSqlBatch(sql, migration.sql);
    }

    await ensureAccountsTableWithSql(sql);
    await ensureContentCmsWithSql(sql);
    await ensureStorageBucketsWithSql(sql);
    await backfillSetupStatusIfNeeded(sql);

    return { ok: true, mode: "full" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[setup] hydration failed:", message);
    return { ok: false, reason: "hydration_failed", error: message };
  } finally {
    try {
      await sql`SELECT pg_advisory_unlock(${SETUP_ADVISORY_LOCK_ID})`;
    } catch {
      // ignore unlock errors
    }
    await sql.end({ timeout: 5 });
  }
}

async function backfillSetupStatusIfNeeded(sql: postgres.Sql): Promise<void> {
  if (!(await tableExists(sql, "public", "accounts"))) {
    return;
  }
  await sql.unsafe(RESET_FALSE_SETUP_WITHOUT_ADMIN_SQL);
  await sql.unsafe(LEGACY_SETUP_BACKFILL_SQL);
}
