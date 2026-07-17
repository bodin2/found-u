import postgres from "postgres";
import { resolvePostgresUrl } from "@/lib/setup/db-url";
import { tableExists } from "@/lib/setup/probe";
import {
  loadArticlesMigrationSql,
  loadHelpPagesMigrationSql,
} from "@/lib/setup/schemas";

/**
 * Applies help_pages + articles CMS migrations when missing.
 * Needed because hydrateDatabase() often returns early in "skipped" mode
 * after lost_items + system_config already exist (Vercel/Supabase new school).
 */
export async function ensureContentCmsWithSql(sql: postgres.Sql): Promise<void> {
  const hasHelp = await tableExists(sql, "public", "help_pages");
  if (!hasHelp) {
    const helpSql = loadHelpPagesMigrationSql();
    if (helpSql) {
      await sql.unsafe(helpSql);
    }
  }

  const hasArticles = await tableExists(sql, "public", "articles");
  if (!hasArticles) {
    const articlesSql = loadArticlesMigrationSql();
    if (articlesSql) {
      await sql.unsafe(articlesSql);
    }
  }
}

export async function ensureContentCms(): Promise<void> {
  const connectionString = resolvePostgresUrl();
  if (!connectionString) return;

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    prepare: false,
  });

  try {
    await ensureContentCmsWithSql(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
