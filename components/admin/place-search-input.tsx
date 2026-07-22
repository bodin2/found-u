"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeoPoint } from "@/lib/types";

export type PlaceSearchResult = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

type PlaceSearchInputProps = {
  onSelect: (place: GeoPoint & { label: string }) => void;
  className?: string;
  placeholder?: string;
};

const DEBOUNCE_MS = 400;

export function PlaceSearchInput({
  onSelect,
  className,
  placeholder = "ค้นหาสถานที่ เช่น โรงเรียนบดินทรเดชา…",
}: PlaceSearchInputProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setOpen(false);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      abortRef.current?.abort();
      setLoading(false);
      clearResults();
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/geocode/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal, credentials: "same-origin" }
        );

        if (response.status === 429) {
          setError("ค้นหาถี่เกินไป กรุณารอสักครู่");
          setResults([]);
          setOpen(true);
          return;
        }

        if (!response.ok) {
          setError("ค้นหาไม่สำเร็จ ลองอีกครั้ง");
          setResults([]);
          setOpen(true);
          return;
        }

        const data = (await response.json()) as { results?: PlaceSearchResult[] };
        const next = Array.isArray(data.results) ? data.results : [];
        setResults(next);
        setError(next.length === 0 ? "ไม่พบสถานที่ที่ตรงกัน" : null);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("ค้นหาไม่สำเร็จ ลองอีกครั้ง");
        setResults([]);
        setOpen(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query, clearResults]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const handleSelect = (place: PlaceSearchResult) => {
    onSelect({ lat: place.lat, lng: place.lng, label: place.label });
    setQuery(place.label.split(",")[0]?.trim() || place.label);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <label className="block text-sm font-medium text-text-primary mb-1">
        ค้นหาสถานที่
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || error) setOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full min-h-11 pl-9 pr-12 py-2.5 bg-bg-card border border-border-light rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-line-green"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {loading && (
            <Loader2
              className="mr-2 h-4 w-4 animate-spin text-text-tertiary motion-reduce:animate-none"
              aria-hidden
            />
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                clearResults();
              }}
              className="inline-flex items-center justify-center min-w-11 min-h-11 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary touch-manipulation"
              aria-label="ล้างการค้นหา"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {open && (results.length > 0 || error) && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-border-light bg-bg-card shadow-sm"
        >
          {error && results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-text-secondary break-words">{error}</p>
          ) : (
            <ul className="py-1">
              {results.map((place) => (
                <li key={place.id} role="option">
                  <button
                    type="button"
                    onClick={() => handleSelect(place)}
                    className="w-full min-h-11 flex items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-bg-secondary transition-colors touch-manipulation"
                  >
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-line-green" aria-hidden />
                    <span className="min-w-0 text-text-primary leading-snug break-words">
                      {place.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
