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
        onClick={handleScan}
        disabled={!canScan || scanning}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-medium transition-colors",
          canScan
            ? "bg-[#06C755] text-white hover:bg-[#05b34d] disabled:opacity-50"
            : "bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
        )}
      >
        {scanning ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            กำลังสแกน... แตะแท็กที่โทรศัพท์
          </>
        ) : (
          <>
            <Radio className="w-5 h-5" />
            {scanLabel}
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
          action={{ label: "ลองอีกครั้ง", onClick: handleScan }}
        />
      )}

      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <Keyboard className="w-4 h-4" />
        {showManual ? "ซ่อนการกรอกรหัส" : "กรอกรหัส Tag แทน"}
      </button>

      {showManual && (
        <form onSubmit={handleManual} className="flex gap-2">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value.toUpperCase())}
            placeholder="รหัส Tag เช่น ABC123XYZ789"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            maxLength={16}
          />
          <button
            type="submit"
            className="px-4 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium"
          >
            ตกลง
          </button>
        </form>
      )}
    </div>
  );
}
