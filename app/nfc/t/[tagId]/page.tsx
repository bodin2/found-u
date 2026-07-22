"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NfcTagDeepLinkPage({
  params,
}: {
  params: Promise<{ tagId: string }> | { tagId: string };
}) {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const resolved = await Promise.resolve(params);
      const tagId = resolved.tagId?.toUpperCase()?.trim();
      if (tagId) {
        router.replace(`/nfc/found?tag=${encodeURIComponent(tagId)}`);
      } else {
        router.replace("/nfc");
      }
    };
    void run();
  }, [params, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      <p className="text-sm text-gray-500">กำลังเปิดแท็ก NFC...</p>
    </div>
  );
}
