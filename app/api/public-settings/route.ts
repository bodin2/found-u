import { NextResponse } from "next/server";
import { getPublicLandingSettings } from "@/lib/landing-public-data";

export const revalidate = 60;

export async function GET() {
  try {
    const settings = await getPublicLandingSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("public-settings error:", err);
    return NextResponse.json({
      comingSoonEnabled: false,
      comingSoonMessage: "พบกันเร็วๆนี้",
    });
  }
}
