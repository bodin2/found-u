import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminEnv } from "@/lib/setup/db-url";
import { getPublishedArticleBySlug } from "@/lib/blog/data";
import { isMissingRelationError } from "@/lib/supabase/missing-relation";
import type { Article } from "@/lib/blog/types";
import type {
  HelpAudience,
  HelpPage,
  HelpPageWithSections,
  HelpSection,
  HelpSectionType,
} from "@/lib/help/types";

function asSectionType(value: unknown): HelpSectionType {
  if (value === "note" || value === "faq" || value === "step") return value;
  return "step";
}

function asAudience(value: unknown): HelpAudience {
  if (value === "student" || value === "admin" || value === "all") return value;
  return "all";
}

function mapPage(row: Record<string, unknown>): HelpPage {
  return {
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    description: row.description == null ? null : String(row.description),
    intro: row.intro == null ? null : String(row.intro),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapSection(row: Record<string, unknown>): HelpSection {
  return {
    id: String(row.id ?? ""),
    page_slug: String(row.page_slug ?? ""),
    section_type: asSectionType(row.section_type),
    audience: asAudience(row.audience),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    image_url: row.image_url == null ? null : String(row.image_url),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function getHelpPageWithSections(
  slug: string
): Promise<HelpPageWithSections | null> {
  if (!hasSupabaseAdminEnv()) return null;

  try {
    const admin = createAdminClient();
    const [{ data: pageRow, error: pageError }, { data: sectionRows, error: sectionError }] =
      await Promise.all([
        admin.from("help_pages").select("*").eq("slug", slug).maybeSingle(),
        admin
          .from("help_sections")
          .select("*")
          .eq("page_slug", slug)
          .order("sort_order", { ascending: true }),
      ]);

    if (pageError && !isMissingRelationError(pageError)) {
      console.error("[help] page fetch error:", pageError);
    }
    if (sectionError && !isMissingRelationError(sectionError)) {
      console.error("[help] sections fetch error:", sectionError);
    }
    if (pageError || sectionError || !pageRow) return null;

    return {
      ...mapPage(pageRow as Record<string, unknown>),
      sections: (sectionRows ?? []).map((row) =>
        mapSection(row as Record<string, unknown>)
      ),
    };
  } catch (error) {
    if (!isMissingRelationError(error)) {
      console.error("[help] getHelpPageWithSections:", error);
    }
    return null;
  }
}

/** Prefer rich articles (section=help); fall back to legacy help_pages */
export async function getHelpContent(
  slug: string
): Promise<
  | { kind: "legacy"; page: HelpPageWithSections }
  | { kind: "article"; article: Article }
  | null
> {
  const article = await getPublishedArticleBySlug(slug, "help");
  if (article) return { kind: "article", article };

  const legacy = await getHelpPageWithSections(slug);
  if (legacy) return { kind: "legacy", page: legacy };

  return null;
}

export async function listHelpPages(): Promise<HelpPage[]> {
  if (!hasSupabaseAdminEnv()) return [];

  try {
    const admin = createAdminClient();
    const [{ data: legacyRows, error: legacyError }, { data: articleRows, error: articleError }] =
      await Promise.all([
        admin.from("help_pages").select("*").order("slug", { ascending: true }),
        admin
          .from("articles")
          .select("slug, title, excerpt, updated_at")
          .eq("section", "help")
          .eq("status", "published")
          .order("published_at", { ascending: false }),
      ]);

    if (legacyError && !isMissingRelationError(legacyError)) {
      console.error("[help] listHelpPages legacy:", legacyError);
    }
    if (articleError && !isMissingRelationError(articleError)) {
      console.error("[help] listHelpPages articles:", articleError);
    }

    const legacy = (legacyRows ?? []).map((row) =>
      mapPage(row as Record<string, unknown>)
    );
    const legacySlugs = new Set(legacy.map((p) => p.slug));

    const fromArticles: HelpPage[] = (articleRows ?? [])
      .filter((row) => !legacySlugs.has(String(row.slug)))
      .map((row) => ({
        slug: String(row.slug),
        title: String(row.title ?? ""),
        description: row.excerpt == null ? null : String(row.excerpt),
        intro: null,
        updated_at: String(row.updated_at ?? new Date().toISOString()),
      }));

    return [...legacy, ...fromArticles];
  } catch (error) {
    if (!isMissingRelationError(error)) {
      console.error("[help] listHelpPages:", error);
    }
    return [];
  }
}
