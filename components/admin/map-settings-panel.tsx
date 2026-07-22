"use client";

import { useState } from "react";
import { MapPin, Settings2 } from "lucide-react";
import MapCanvas from "@/components/ui/map-canvas";
import { PlaceSearchInput } from "@/components/admin/place-search-input";
import { useMapView } from "@/hooks/use-map-view";
import { cn } from "@/lib/utils";
import type { AppSettings, GeoPoint } from "@/lib/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useMediaQuery } from "@/hooks/use-media-query";

type MapSettingsPanelProps = {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
};

type MapTab = "general" | "boundary";

type SearchView = {
  center: GeoPoint;
  zoom: number;
};

const SEARCH_ZOOM = 17;

const fieldLabelClass = "block text-sm font-medium text-text-primary mb-1";
const fieldInputClass = cn(
  "w-full min-h-11 px-4 py-2.5 rounded-xl text-base text-text-primary",
  "bg-bg-tertiary border border-transparent",
  "focus:outline-none focus:bg-bg-card focus:ring-2 focus:ring-line-green-light"
);
const fieldInputCompactClass = cn(
  "w-full min-h-11 px-3 py-2 rounded-xl text-sm text-text-primary",
  "bg-bg-tertiary border border-transparent",
  "focus:outline-none focus:bg-bg-card focus:ring-2 focus:ring-line-green-light"
);

export default function MapSettingsPanel({ settings, onChange }: MapSettingsPanelProps) {
  const [tab, setTab] = useState<MapTab>("general");
  const [searchView, setSearchView] = useState<SearchView | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const mapCenter = settings.mapDefaultCenter || DEFAULT_APP_SETTINGS.mapDefaultCenter!;
  const mapZoom = settings.mapDefaultZoom ?? DEFAULT_APP_SETTINGS.mapDefaultZoom ?? 17;
  const mapPolygon = settings.mapSchoolBoundary || [];

  const { center, zoom, fitPoints } = useMapView({
    enabled: settings.mapsEnabled,
    fallbackCenter: mapCenter,
    fallbackZoom: mapZoom,
    polygon: mapPolygon,
    preferPolygonFit: true,
    locateUser: false,
  });

  const viewCenter = searchView?.center ?? center;
  const viewZoom = searchView?.zoom ?? zoom;
  const viewFitPoints = searchView ? undefined : fitPoints;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-line-green-light flex items-center justify-center">
            <MapPin className="w-5 h-5 text-line-green-link" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-text-primary">แผนที่และ GPS</h3>
            <p className="text-sm text-text-secondary mt-1 text-pretty">
              ใช้แผนที่เพื่อปักพิกัดและกำหนดขอบเขตโรงเรียน
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.mapsEnabled}
          onClick={() =>
            onChange({
              ...settings,
              mapsEnabled: !settings.mapsEnabled,
            })
          }
          className={cn(
            "relative inline-flex h-11 w-[3.25rem] shrink-0 items-center rounded-full transition-colors touch-manipulation self-start",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-2",
            settings.mapsEnabled ? "bg-line-green" : "bg-bg-tertiary"
          )}
          aria-label="เปิด/ปิดแผนที่"
        >
          <span
            className={cn(
              "absolute top-1 h-9 w-9 rounded-full bg-bg-card shadow-sm transition-transform",
              settings.mapsEnabled ? "right-1" : "left-1"
            )}
            aria-hidden
          />
        </button>
      </div>

      {settings.mapsEnabled && (
        <>
          <SegmentedTabs<MapTab>
            value={tab}
            onChange={setTab}
            size="sm"
            items={[
              { id: "general", label: "ตั้งค่าทั่วไป", icon: Settings2 },
              { id: "boundary", label: "ขอบเขตโรงเรียน", icon: MapPin },
            ]}
          />

          {tab === "general" && (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="min-w-0 lg:col-span-2">
                  <label className={fieldLabelClass}>ลิงก์แผนที่ (Tile URL)</label>
                  <input
                    type="text"
                    value={settings.mapTileUrl || DEFAULT_APP_SETTINGS.mapTileUrl}
                    onChange={(e) => onChange({ ...settings, mapTileUrl: e.target.value })}
                    className={fieldInputClass}
                  />
                </div>
                <div className="min-w-0 lg:col-span-2">
                  <label className={fieldLabelClass}>แหล่งที่มา (Attribution)</label>
                  <input
                    type="text"
                    value={settings.mapAttribution || DEFAULT_APP_SETTINGS.mapAttribution}
                    onChange={(e) => onChange({ ...settings, mapAttribution: e.target.value })}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 max-w-2xl">
                <div className="min-w-0">
                  <label className={fieldLabelClass}>Lat</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={mapCenter.lat}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        mapDefaultCenter: {
                          lat: Number(e.target.value),
                          lng: mapCenter.lng,
                        },
                      })
                    }
                    className={fieldInputCompactClass}
                  />
                </div>
                <div className="min-w-0">
                  <label className={fieldLabelClass}>Lng</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={mapCenter.lng}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        mapDefaultCenter: {
                          lat: mapCenter.lat,
                          lng: Number(e.target.value),
                        },
                      })
                    }
                    className={fieldInputCompactClass}
                  />
                </div>
                <div className="min-w-0 col-span-2 lg:col-span-1">
                  <label className={fieldLabelClass}>Zoom</label>
                  <input
                    type="number"
                    min={10}
                    max={22}
                    value={mapZoom}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        mapDefaultZoom: Number(e.target.value),
                      })
                    }
                    className={fieldInputCompactClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-bg-secondary rounded-xl border border-border-light">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    บังคับพิกัดในโรงเรียน (เฉพาะแจ้งเจอของ)
                  </p>
                  <p className="text-xs text-text-secondary mt-1 text-pretty">
                    บล็อกการส่งถ้าอยู่นอกขอบเขตที่กำหนด
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(settings.mapEnforceFoundInSchool)}
                  onClick={() =>
                    onChange({
                      ...settings,
                      mapEnforceFoundInSchool: !settings.mapEnforceFoundInSchool,
                    })
                  }
                  className={cn(
                    "relative inline-flex h-11 w-[3.25rem] shrink-0 items-center rounded-full transition-colors touch-manipulation self-start sm:self-center",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-2",
                    settings.mapEnforceFoundInSchool ? "bg-line-green" : "bg-bg-tertiary"
                  )}
                  aria-label="บังคับพิกัดในโรงเรียน"
                >
                  <span
                    className={cn(
                      "absolute top-1 h-9 w-9 rounded-full bg-bg-card shadow-sm transition-transform",
                      settings.mapEnforceFoundInSchool ? "right-1" : "left-1"
                    )}
                    aria-hidden
                  />
                </button>
              </div>
            </div>
          )}

          {tab === "boundary" && (
            <div className="space-y-3 min-w-0">
              <div>
                <label className="block text-sm font-medium text-text-primary">
                  ขอบเขตโรงเรียน (Polygon)
                </label>
                <p className="text-xs text-text-secondary mt-1 text-pretty">
                  ค้นหาสถานที่หรือคลิกบนแผนที่เพื่อเพิ่มจุด — พื้นที่สีเขียวคือขอบเขตที่บันทึกไว้
                </p>
              </div>
              <PlaceSearchInput
                onSelect={(place) =>
                  setSearchView({
                    center: { lat: place.lat, lng: place.lng },
                    zoom: SEARCH_ZOOM,
                  })
                }
              />
              <MapCanvas
                center={viewCenter}
                zoom={viewZoom}
                fitPoints={viewFitPoints}
                fitBoundsOnce={!searchView}
                tileUrl={settings.mapTileUrl || DEFAULT_APP_SETTINGS.mapTileUrl!}
                attribution={settings.mapAttribution || DEFAULT_APP_SETTINGS.mapAttribution}
                mode="polygon"
                polygon={mapPolygon}
                onPolygonChange={(points: GeoPoint[]) =>
                  onChange({ ...settings, mapSchoolBoundary: points })
                }
                showVertexList={!isMobile}
                className="h-[min(360px,50dvh)] min-h-[240px] lg:h-[480px] lg:min-h-[320px] rounded-xl overflow-hidden"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, mapSchoolBoundary: [] })}
                  className="min-h-11 px-4 py-2.5 text-sm rounded-full bg-bg-tertiary text-text-primary hover:bg-bg-secondary transition-colors touch-manipulation"
                >
                  ล้างขอบเขต
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...settings,
                      mapSchoolBoundary: mapPolygon.slice(0, -1),
                    })
                  }
                  className="min-h-11 px-4 py-2.5 text-sm rounded-full bg-bg-tertiary text-text-primary hover:bg-bg-secondary transition-colors touch-manipulation"
                >
                  ลบจุดล่าสุด
                </button>
              </div>
              {isMobile && mapPolygon.length > 0 && (
                <p className="text-xs text-text-secondary">
                  จุดขอบเขต {mapPolygon.length} จุด — ใช้ Desktop เพื่อดูตารางพิกัดแบบเต็ม
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
