"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import type { GeoPoint, LocationCoords } from "@/lib/types";

export type MapMode = "marker" | "polygon" | "view";

export interface MapMarker {
  id?: string;
  position: GeoPoint;
  label?: string;
  color?: string;
}

interface MapCanvasProps {
  center: GeoPoint;
  zoom: number;
  tileUrl: string;
  attribution?: string;
  mode?: MapMode;
  marker?: LocationCoords | null;
  onMarkerChange?: (coords: LocationCoords | null) => void;
  polygon?: GeoPoint[];
  onPolygonChange?: (points: GeoPoint[]) => void;
  markers?: MapMarker[];
  fitPoints?: GeoPoint[];
  fitBoundsOnce?: boolean;
  showPolygonVertices?: boolean;
  showVertexList?: boolean;
  className?: string;
}

const POLYGON_STROKE = "#06C755";
const POLYGON_FILL = "#06C755";

const PIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" fill="none">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="#06C755" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
  </svg>`
);

const USER_PIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" fill="none">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="#3B82F6" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
  </svg>`
);

function createPinIcon(label?: string, variant: "green" | "blue" = "green") {
  const svg = variant === "blue" ? USER_PIN_SVG : PIN_SVG;
  return L.divIcon({
    className: "map-pin-icon-leaflet",
    html: `<div class="map-pin-wrap">
      <img src="data:image/svg+xml,${svg}" alt="" class="map-pin-img" width="28" height="42" />
      ${label ? `<span class="map-pin-label">${label}</span>` : ""}
    </div>`,
    iconSize: [28, 42],
    iconAnchor: [14, 42],
  });
}

function createCircleMarker(position: GeoPoint, color = "#06C755") {
  return L.circleMarker([position.lat, position.lng], {
    radius: 8,
    weight: 2,
    color: "#ffffff",
    fillColor: color,
    fillOpacity: 1,
  });
}

function syncPolygonLayer(
  map: L.Map,
  polygonRef: React.MutableRefObject<L.Polygon | null>,
  polylineRef: React.MutableRefObject<L.Polyline | null>,
  points: GeoPoint[]
) {
  if (polylineRef.current) {
    polylineRef.current.remove();
    polylineRef.current = null;
  }
  if (polygonRef.current) {
    polygonRef.current.remove();
    polygonRef.current = null;
  }

  if (!points.length) return;

  const latlngs = points.map((p) => [p.lat, p.lng] as L.LatLngTuple);

  if (points.length >= 3) {
    polygonRef.current = L.polygon(latlngs, {
      color: POLYGON_STROKE,
      weight: 3,
      opacity: 0.95,
      fillColor: POLYGON_FILL,
      fillOpacity: 0.22,
      lineJoin: "round",
      lineCap: "round",
    }).addTo(map);
    polygonRef.current.bringToBack();
    return;
  }

  if (points.length >= 2) {
    polylineRef.current = L.polyline(latlngs, {
      color: POLYGON_STROKE,
      weight: 3,
      opacity: 0.9,
      dashArray: "6 4",
      lineJoin: "round",
      lineCap: "round",
    }).addTo(map);
  }
}

export default function MapCanvas({
  center,
  zoom,
  tileUrl,
  attribution,
  mode = "marker",
  marker,
  onMarkerChange,
  polygon,
  onPolygonChange,
  markers,
  fitPoints,
  fitBoundsOnce = false,
  showPolygonVertices = mode === "polygon",
  showVertexList = mode === "polygon",
  className,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const vertexLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonPointsRef = useRef<GeoPoint[]>(polygon || []);
  const lastFitKeyRef = useRef<string>("");
  const hasFittedOnceRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    polygonPointsRef.current = polygon || [];
  }, [polygon]);

  const invalidateMapSize = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize({ animate: false });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView([center.lat, center.lng], zoom);

    mapRef.current = map;

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: attribution || "",
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    vertexLayerRef.current = L.layerGroup().addTo(map);

    syncPolygonLayer(map, polygonRef, polylineRef, polygonPointsRef.current);
    setMapReady(true);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => invalidateMapSize())
        : null;
    resizeObserver?.observe(containerRef.current);

    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      vertexLayerRef.current = null;
      polygonRef.current = null;
      polylineRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const fitKey =
      fitPoints && fitPoints.length >= 2
        ? fitPoints.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|")
        : "";

    if (fitKey) {
      if (fitBoundsOnce && hasFittedOnceRef.current) {
        return;
      }
      if (fitKey !== lastFitKeyRef.current || !hasFittedOnceRef.current) {
        invalidateMapSize();
        const bounds = L.latLngBounds(fitPoints!.map((p) => [p.lat, p.lng] as L.LatLngTuple));
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: Math.max(zoom, 18) });
        lastFitKeyRef.current = fitKey;
        hasFittedOnceRef.current = true;
        requestAnimationFrame(() => invalidateMapSize());
        return;
      }
    }

    if (!fitKey) {
      lastFitKeyRef.current = "";
      hasFittedOnceRef.current = false;
    }

    if (!fitKey || !fitBoundsOnce || !hasFittedOnceRef.current) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [center.lat, center.lng, zoom, fitPoints, fitBoundsOnce, mapReady, invalidateMapSize]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(tileUrl);
    if (attribution !== undefined) {
      tileLayerRef.current.options.attribution = attribution;
    }
  }, [tileUrl, attribution]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (event: L.LeafletMouseEvent) => {
      if (mode === "marker" && onMarkerChange) {
        onMarkerChange({
          lat: event.latlng.lat,
          lng: event.latlng.lng,
          source: "map",
        });
      }

      if (mode === "polygon" && onPolygonChange) {
        const nextPoints = [...(polygonPointsRef.current || []), {
          lat: event.latlng.lat,
          lng: event.latlng.lng,
        }];
        onPolygonChange(nextPoints);
      }
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [mode, onMarkerChange, onPolygonChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (marker && mode !== "view") {
      if (!markerRef.current) {
        markerRef.current = L.marker([marker.lat, marker.lng], {
          icon: createPinIcon(undefined, "blue"),
          interactive: false,
        }).addTo(map);
      } else {
        markerRef.current.setLatLng([marker.lat, marker.lng]);
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [marker, mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    syncPolygonLayer(map, polygonRef, polylineRef, polygon || []);
  }, [polygon, mapReady]);

  useEffect(() => {
    const layer = vertexLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (!showPolygonVertices || !polygon || polygon.length === 0) return;

    polygon.forEach((point, index) => {
      L.marker([point.lat, point.lng], {
        icon: createPinIcon(String(index + 1)),
        interactive: false,
      }).addTo(layer);
    });
  }, [polygon, showPolygonVertices]);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (!markers || markers.length === 0) return;

    markers.forEach((item) => {
      const markerLayer = createCircleMarker(item.position, item.color || "#2563eb");
      if (item.label) {
        markerLayer.bindTooltip(item.label, { direction: "top" });
      }
      markerLayer.addTo(layer);
    });
  }, [markers]);

  const vertexRows = polygon || [];

  return (
    <div className="w-full min-w-0 space-y-3">
      <div
        ref={containerRef}
        className={cn(
          "map-canvas-root relative z-0 isolate w-full min-w-0 overflow-hidden rounded-2xl border border-border-light",
          mode === "polygon" && "map-polygon-mode",
          className ?? "h-[360px] min-h-[280px]"
        )}
      />
      {showVertexList && vertexRows.length > 0 && (
        <div className="rounded-xl border border-border-light bg-bg-secondary p-3">
          <p className="mb-2 text-xs font-medium text-text-primary">
            จุดขอบเขต ({vertexRows.length} จุด)
          </p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border-light">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-bg-tertiary text-left text-text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium w-12">#</th>
                  <th className="px-3 py-2 font-medium">Latitude</th>
                  <th className="px-3 py-2 font-medium">Longitude</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light bg-bg-card">
                {vertexRows.map((point, index) => (
                  <tr key={`${index}-${point.lat}-${point.lng}`}>
                    <td className="px-3 py-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-line-green-cta text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-text-primary">
                      {point.lat.toFixed(6)}
                    </td>
                    <td className="px-3 py-2 font-mono text-text-primary">
                      {point.lng.toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
