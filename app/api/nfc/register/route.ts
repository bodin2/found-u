import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthRequest,
  registerNfcTagAdmin,
  type RegisterNfcTagInput,
} from "@/lib/nfc-server";
import { parseJsonBody } from "@/lib/parse-request";
import { registerNfcTagSchema } from "@/lib/validations/nfc";
import type { ItemCategory } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, registerNfcTagSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { itemName, category, description, contacts, tagUid, readOnlyLocked } = parsed.data;

    const validContacts = contacts.filter((c) => c.value?.trim());

    const input: RegisterNfcTagInput = {
      itemName: itemName.trim(),
      category: category as ItemCategory,
      description: description?.trim(),
      contacts: validContacts,
      tagUid: tagUid?.trim() || undefined,
      readOnlyLocked: Boolean(readOnlyLocked),
    };

    const result = await registerNfcTagAdmin(user.uid, input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "tag_uid_already_registered") {
      return NextResponse.json({ error: message, message: "แท็ก NFC นี้ถูกลงทะเบียนแล้ว" }, { status: 409 });
    }
    if (message === "nfc_disabled") {
      return NextResponse.json({ error: message, message: "ระบบ NFC ถูกปิดใช้งานชั่วคราว" }, { status: 403 });
    }
    console.error("NFC register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
