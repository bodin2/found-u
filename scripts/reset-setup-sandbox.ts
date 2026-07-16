#!/usr/bin/env bun
/**
 * Reset setup wizard state on the sandbox Supabase project (.env.setup.local).
 * Re-run the wizard from step 1 without redeploying or swapping main .env.local.
 *
 * Usage: bun run setup:reset
 */

import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "./lib/load-env-file";

const ENV_FILE = ".env.setup.local";
const root = resolve(import.meta.dir, "..");

if (!existsSync(resolve(root, ENV_FILE))) {
  console.error(`Missing ${ENV_FILE}. Copy .env.setup.example first.`);
  process.exit(1);
}

loadEnvFile(ENV_FILE, root);

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING?.trim() ||
  process.env.POSTGRES_URL?.trim();

if (!connectionString) {
  console.error("POSTGRES_URL_NON_POOLING (or POSTGRES_URL) is required in .env.setup.local");
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  idle_timeout: 5,
  connect_timeout: 15,
  prepare: false,
});

async function tableExists(schema: string, table: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = ${schema} AND table_name = ${table}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function listStoragePaths(
  supabaseUrl: string,
  serviceKey: string,
  bucket: string,
  prefix = ""
): Promise<string[]> {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
  });
  if (error) {
    if (error.message?.toLowerCase().includes("bucket not found")) {
      return [];
    }
    throw error;
  }
  if (!data?.length) return [];

  const paths: string[] = [];
  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      paths.push(...(await listStoragePaths(supabaseUrl, serviceKey, bucket, path)));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

async function clearStorageBucket(
  supabaseUrl: string,
  serviceKey: string,
  bucket: string
): Promise<number> {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const paths = await listStoragePaths(supabaseUrl, serviceKey, bucket);
  if (paths.length === 0) return 0;

  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
  return paths.length;
}

try {
  if (!(await tableExists("public", "system_config"))) {
    console.log("system_config not found — open /setup once to run hydration, then retry.");
    process.exit(0);
  }

  await sql`
    INSERT INTO public.system_config (id, config_data)
    VALUES ('setup_status', '{"is_completed": false, "current_step": 1}'::jsonb)
    ON CONFLICT (id) DO UPDATE
    SET config_data = '{"is_completed": false, "current_step": 1}'::jsonb,
        updated_at = now()
  `;

  await sql`
    DELETE FROM public.system_config
    WHERE id IN ('school_branding', 'ai_credentials')
  `;

  if (await tableExists("public", "accounts")) {
    const removed = await sql<{ student_id: string | null }[]>`
      DELETE FROM public.accounts WHERE role = 'admin'
      RETURNING student_id
    `;
    if (removed.length > 0) {
      console.log(
        `Removed ${removed.length} wizard admin account(s):`,
        removed.map((r) => r.student_id).filter(Boolean).join(", ") || "(no student_id)"
      );
    }
  }

  if (await tableExists("public", "app_settings")) {
    await sql`
      UPDATE public.app_settings
      SET
        settings = COALESCE(settings, '{}'::jsonb)
          - 'ogTitle' - 'ogDescription' - 'ogImage' - 'updatedAt' - 'updatedBy',
        updated_at = now(),
        updated_by = NULL
      WHERE id = 'default'
    `;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (supabaseUrl && serviceKey) {
    try {
      const removed = await clearStorageBucket(
        supabaseUrl,
        serviceKey,
        "school-branding"
      );
      if (removed > 0) {
        console.log(`Removed ${removed} file(s) from school-branding bucket.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Could not clear school-branding bucket: ${message}`);
    }
  } else {
    console.warn(
      "Skipping storage reset — add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.setup.local"
    );
  }

  console.log("Setup sandbox reset complete.");
  console.log("Next: bun run dev:setup → http://localhost:3000/setup");
} catch (error) {
  console.error("Reset failed:", error);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
