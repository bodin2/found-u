import postgres from "postgres";
import { SETUP_ADVISORY_LOCK_ID } from "@/lib/setup/constants";
import { resolvePostgresUrl } from "@/lib/setup/db-url";

export async function withSetupAdvisoryLock<T>(fn: () => Promise<T>): Promise<T> {
  const connectionString = resolvePostgresUrl();
  if (!connectionString) {
    throw new Error("POSTGRES_URL is not configured");
  }

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    prepare: false,
  });

  try {
    await sql`SELECT pg_advisory_lock(${SETUP_ADVISORY_LOCK_ID})`;
    return await fn();
  } finally {
    try {
      await sql`SELECT pg_advisory_unlock(${SETUP_ADVISORY_LOCK_ID})`;
    } catch {
      // ignore
    }
    await sql.end({ timeout: 5 });
  }
}

export async function markSetupCompletedAtomic(
  completedBy: string
): Promise<boolean> {
  const connectionString = resolvePostgresUrl();
  if (!connectionString) {
    throw new Error("POSTGRES_URL is not configured");
  }

  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
  });

  try {
    const now = new Date().toISOString();
    const configData = {
      is_completed: true,
      current_step: 3,
      completed_at: now,
      completed_by: completedBy,
    };

    const rows = await sql<{ id: string }[]>`
      UPDATE public.system_config
      SET
        config_data = ${sql.json(configData)},
        updated_at = ${now}
      WHERE id = 'setup_status'
        AND COALESCE((config_data->>'is_completed')::boolean, false) IS NOT TRUE
      RETURNING id
    `;
    return rows.length > 0;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
