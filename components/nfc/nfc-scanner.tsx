"use client";

import { useEffect, useState } from "react";
import { Radio, Loader2, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { isWebNfcSupported, readNfcTag, getNfcErrorMessage } from "@/lib/nfc";
import { StatusAlert } from "@/components/ui/status-alert";

interface NfcScannerProps {
  onScan: (result: { tagId?: string; tagUid?: string; url?: string }) => void;
  onManualSubmit?: (tagId: string) => void;
  disabled?: boolean;
  className?: string;
  scanLabel?: string;
  /** When false, scan button stays disabled (e.g. iOS / desktop). */
  nfcSupported?: boolean;
}

export default function NfcScanner({
  onScan,
  onManualSubmit,
  disabled,
  className,
  scanLabel = "สแกน NFC Tag",
  nfcSupported: nfcSupportedProp,
}: NfcScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [manualId, setManualId] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);

  useEffect(() => {
    setNfcSupported(nfcSupportedProp ?? isWebNfcSupported());
    if (!(nfcSupportedProp ?? isWebNfcSupported())) {
      setShowManual(true);
    }
  }, [nfcSupportedProp]);

  const canScan = nfcSupported && !disabled;

  const handleScan = async () => {
    if (!nfcSupported) {
      setError(getNfcErrorMessage(new Error("web_nfc_not_supported")));
      setShowManual(true);
      return;
    }

    setScanning(true);
    setError("");
    try {
      const result = await readNfcTag();
      onScan(result);
    } catch (err) {
      setError(getNfcErrorMessage(err));
    } finally {
      setScanning(false);
    }
  };

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    const id = manualId.trim().toUpperCase();
    if (!id) return;
    if (onManualSubmit) {
      onManualSubmit(id);
    } else {
      onScan({ tagId: id });
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => void handleScan()}
        disabled={!canScan || scanning}
        aria-busy={scanning}
        className={cn(
          "w-full min-h-14 flex items-center justify-center gap-2 py-4 px-6 rounded-full font-medium transition-colors touch-manipulation",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-2",
          canScan
            ? "bg-line-green-cta text-white hover:bg-line-green-cta-hover disabled:opacity-50"
            : "bg-bg-tertiary text-text-secondary cursor-not-allowed"
        )}
      >
        {scanning ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" aria-hidden />
            <span className="text-pretty text-center">กำลังสแกน... แตะแท็กที่โทรศัพท์</span>
          </>
        ) : (
          <>
            <Radio className="w-5 h-5 shrink-0" aria-hidden />
            <span className="truncate">{scanLabel}</span>
          </>
        )}
      </button>

      {!nfcSupported && (
        <StatusAlert
          variant="warning"
          title="อุปกรณ์นี้ไม่รองรับ Web NFC"
          message="ใช้ QR Code บนสติ๊กเกอร์แทน (iOS / Desktop) — ลงทะเบียนแล้วพิมพ์ QR ได้ทันที"
          centered
          action={{
            label: "กรอกรหัส Tag แทน",
            onClick: () => setShowManual(true),
          }}
        />
      )}

      {error && nfcSupported && (
        <StatusAlert
          variant="error"
          message={error}
          centered
          action={{ label: "ลองอีกครั้ง", onClick: () => void handleScan() }}
        />
      )}

      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="flex w-full min-h-11 items-center justify-center gap-2 text-sm text-text-secondary hover:text-text-primary touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 rounded-lg"
      >
        <Keyboard className="w-4 h-4" aria-hidden />
        {showManual ? "ซ่อนการกรอกรหัส" : "กรอกรหัส Tag แทน"}
      </button>

      {showManual && (
        <form onSubmit={handleManual} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value.toUpperCase())}
            placeholder="รหัส Tag เช่น ABC123XYZ789"
            className="input-line flex-1 min-w-0 min-h-11 px-4 py-3 text-base"
            maxLength={16}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label="รหัส Tag"
          />
          <button
            type="submit"
                className="min-h-11 px-5 py-3 rounded-full bg-line-green-cta text-white font-medium hover:bg-line-green-cta-hover touch-manipulation shrink-0 sm:self-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 focus-visible:ring-offset-2"
          >
            ตกลง
          </button>
        </form>
      )}
    </div>
  );
}
