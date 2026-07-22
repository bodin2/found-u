"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagQrPrintProps {
  tagUrl: string;
  tagId: string;
  itemName: string;
  className?: string;
}

export default function TagQrPrint({ tagUrl, tagId, itemName, className }: TagQrPrintProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const absoluteUrl = tagUrl.startsWith("http")
      ? tagUrl
      : `${typeof window !== "undefined" ? window.location.origin : ""}${tagUrl}`;

    QRCode.toCanvas(canvasRef.current, absoluteUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#191919", light: "#ffffff" },
    }).catch(console.error);
  }, [tagUrl]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn("nfc-print-area", className)}>
      <div className="bg-bg-card border border-border-light rounded-2xl p-6 text-center print:border-0 print:shadow-none">
        <p className="text-xs text-text-secondary mb-2">Found-U · NFC</p>
        <h3 className="mb-1 break-words text-balance text-base font-medium leading-[1.4] text-text-primary">
          {itemName}
        </h3>
        <p className="mb-4 text-pretty text-base leading-[1.5] text-text-secondary">
          สแกนเมื่อพบของนี้
        </p>
        <canvas ref={canvasRef} className="mx-auto rounded-lg" />
        <p className="text-xs text-text-secondary mt-3 font-mono">{tagId}</p>
        <p className="text-xs text-text-secondary mt-2 break-all px-4">{tagUrl}</p>
      </div>

      <button
        type="button"
        onClick={handlePrint}
        className="mt-4 w-full min-h-11 flex items-center justify-center gap-2 py-3 rounded-full border border-border-light text-text-primary hover:bg-bg-secondary print:hidden touch-manipulation"
      >
        <Printer className="w-5 h-5" aria-hidden />
        พิมพ์ QR Code
      </button>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .nfc-print-area,
          .nfc-print-area * {
            visibility: visible;
          }
          .nfc-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
