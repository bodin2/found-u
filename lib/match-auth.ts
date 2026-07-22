import { NextRequest, NextResponse } from "next/server";
import { verifyAuthRequest, isAdminUser } from "@/lib/nfc-server";

type AuthUser = { uid: string; email?: string };

export async function requireMatchAdmin(
  request: NextRequest
): Promise<{ authUser: AuthUser } | { error: NextResponse }> {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!(await isAdminUser(authUser.uid))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { authUser };
}

export async function optionalMatchAuth(request: NextRequest) {
  return verifyAuthRequest(request);
}
