"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusAlert } from "@/components/ui/status-alert";

interface CameraCaptureLabels {
  start: string;
  capture: string;
  retake: string;
  unavailable: string;
  idle: string;
  permissionDenied?: string;
}

interface CameraCaptureProps {
  previewUrl?: string | null;
  onCapture: (dataUrl: string, file: File) => void;
  onClear?: () => void;
  labels?: Partial<CameraCaptureLabels>;
  className?: string;
}

const DEFAULT_LABELS: CameraCaptureLabels = {
  start: "เปิดกล้อง",
  capture: "ถ่ายรูป",
  retake: "ถ่ายใหม่",
  unavailable: "กล้องไม่พร้อมใช้งานบนอุปกรณ์นี้",
  idle: "กล้องยังไม่เปิด",
  permissionDenied: "ไม่ได้รับอนุญาตใช้กล้อง — เปิดสิทธิ์ในเบราว์เซอร์แล้วลองอีกครั้ง",
};

const primaryButtonClass = cn(
  "flex-1 min-h-11 py-3 px-4 rounded-full font-medium text-white",
  "bg-line-green-cta hover:bg-line-green-cta-hover",
  "flex items-center justify-center gap-2 touch-manipulation",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-2",
  "disabled:opacity-60 disabled:cursor-not-allowed"
);

const secondaryButtonClass = cn(
  "min-h-11 py-3 px-4 rounded-full font-medium",
  "bg-bg-tertiary text-text-primary hover:bg-bg-secondary",
  "flex items-center justify-center gap-2 touch-manipulation",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
);

async function requestCameraStream(): Promise<MediaStream> {
  const withEnvironment = {
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  } satisfies MediaStreamConstraints;

  try {
    return await navigator.mediaDevices.getUserMedia(withEnvironment);
  } catch {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

function cameraErrorMessage(err: unknown, labels: CameraCaptureLabels): string {
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name?: string }).name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return labels.permissionDenied ?? labels.unavailable;
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return labels.unavailable;
  }
  return labels.unavailable;
}

export default function CameraCapture({
  previewUrl,
  onCapture,
  onClear,
  labels,
  className,
}: CameraCaptureProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (previewUrl) {
      stopCamera();
    }
  }, [previewUrl, stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    void video.play().catch((err) => {
      console.error("Video play failed", err);
      setError(mergedLabels.unavailable);
    });

    return () => {
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [stream, mergedLabels.unavailable]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(mergedLabels.unavailable);
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const media = await requestCameraStream();
      streamRef.current = media;
      setStream(media);
    } catch (err) {
      console.error("Failed to start camera", err);
      setError(cameraErrorMessage(err, mergedLabels));
    } finally {
      setIsStarting(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    if (!width || !height) {
      setError(mergedLabels.unavailable);
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError(mergedLabels.unavailable);
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(mergedLabels.unavailable);
          return;
        }
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        onCapture(dataUrl, file);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  if (previewUrl) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="relative rounded-2xl overflow-hidden bg-bg-tertiary">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URL from camera capture */}
          <img
            src={previewUrl}
            alt="รูปที่ถ่ายไว้"
            className="w-full h-56 object-cover"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClear}
            className={cn(secondaryButtonClass, "flex-1")}
          >
            {mergedLabels.retake}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {error ? (
        <StatusAlert
          variant="error"
          message={error}
          action={{
            label: "ลองอีกครั้ง",
            onClick: () => {
              setError(null);
              void startCamera();
            },
          }}
        />
      ) : null}

      <div className="relative rounded-2xl overflow-hidden bg-text-primary">
        <video
          ref={videoRef}
          className={cn(
            "w-full h-56 object-cover bg-text-primary",
            !stream && "hidden"
          )}
          playsInline
          muted
          autoPlay
        />
        {!stream && (
          <div className="w-full h-56 flex flex-col items-center justify-center text-text-tertiary gap-2 bg-bg-tertiary px-4">
            <VideoOff className="w-6 h-6" aria-hidden />
            <span className="text-sm text-text-secondary text-center text-pretty">
              {mergedLabels.idle}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!stream ? (
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={isStarting}
            aria-busy={isStarting}
            className={primaryButtonClass}
          >
            <Camera className="w-4 h-4" aria-hidden />
            {isStarting ? "กำลังเปิดกล้อง..." : mergedLabels.start}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={capturePhoto}
              className={primaryButtonClass}
            >
              <Camera className="w-4 h-4" aria-hidden />
              {mergedLabels.capture}
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setError(null);
              }}
              className={cn(secondaryButtonClass, "px-4 shrink-0")}
              aria-label="ปิดกล้อง"
            >
              <RotateCcw className="w-4 h-4" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
