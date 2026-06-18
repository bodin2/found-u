import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkAuthEligibility,
  revokeIneligibleOAuthUser,
} from "@/lib/auth-eligibility";
import { AUTH_ROUTES } from "@/lib/auth-routes";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/home";
  }
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const link = searchParams.get("link") === "1";

  if (!code) {
    const message = searchParams.get("error_description") || searchParams.get("error") || "auth";
    return NextResponse.redirect(`${origin}${AUTH_ROUTES.login}?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(`${origin}${AUTH_ROUTES.login}?error=auth`);
  }

  if (!link) {
    const eligibility = await checkAuthEligibility(
      data.user.id,
      "secondary"
    );

    if (!eligibility.eligible) {
      await revokeIneligibleOAuthUser(data.user.id, data.user.email);
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}${AUTH_ROUTES.login}?error=${encodeURIComponent(eligibility.message)}`
      );
    }
  }

  const destination = new URL(next, origin);
  if (link) destination.searchParams.set("linked", "1");

  return NextResponse.redirect(destination.toString());
}
