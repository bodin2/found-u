import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminEnv } from "@/lib/setup/db-url";
import { mapArticle } from "@/lib/blog/map";
import { isMissingRelationError } from "@/lib/supabase/missing-relation";
import type { Article, ArticleSection } from "@/lib/blog/types";

export { mapArticle } from "@/lib/blog/map";

export async function listPublishedArticles(options?: {
  section?: ArticleSection;
  tag?: string;
}): Promise<Article[]> {
  if (!hasSupabaseAdminEnv()) return [];

  try {
    const admin = createAdminClient();
    let query = admin
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (options?.section) {
      query = query.eq("section", options.section);
    }
    if (options?.tag) {
      query = query.contains("tags", [options.tag]);
    }

    const { data, error } = await query;
    if (error) {
      if (!isMissingRelationError(error)) {
        console.error("[blog] listPublishedArticles:", error);
      }
      return [];
    }
    return (data ?? []).map((row) => mapArticle(row as Record<string, unknown>));
  } catch (error) {
    if (!isMissingRelationError(error)) {
      console.error("[blog] listPublishedArticles:", error);
    }
    return [];
  }
}

export async function getPublishedArticleBySlug(
  slug: string,
  section?: ArticleSection
): Promise<Article | null> {
  if (!hasSupabaseAdminEnv()) return null;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published");

    if (section) {
      query = query.eq("section", section);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      if (!isMissingRelationError(error)) {
        console.error("[blog] getPublishedArticleBySlug:", error);
      }
      return null;
    }
    if (!data) return null;
    return mapArticle(data as Record<string, unknown>);
  } catch (error) {
    if (!isMissingRelationError(error)) {
      console.error("[blog] getPublishedArticleBySlug:", error);
    }
    return null;
  }
}

/** Admin-only: fetch any article by id (including drafts) via service role */
export async function getArticleById(id: string): Promise<Article | null> {
  if (!hasSupabaseAdminEnv()) return null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("articles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (!isMissingRelationError(error)) {
        console.error("[blog] getArticleById:", error);
      }
      return null;
    }
    if (!data) return null;
    return mapArticle(data as Record<string, unknown>);
  } catch (error) {
    if (!isMissingRelationError(error)) {
      console.error("[blog] getArticleById:", error);
    }
    return null;
  }
}
