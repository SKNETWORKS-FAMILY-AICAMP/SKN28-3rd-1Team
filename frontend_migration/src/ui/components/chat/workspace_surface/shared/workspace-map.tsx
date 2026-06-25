"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { frontendSettings } from "@/settings/frontend";
import type {
  WorkspaceCoordinate,
  WorkspaceMapLandmark,
  WorkspaceMapLegendItem,
} from "@/ui/components/chat/workspace_root/workspace-state";

type WorkspaceMapPoint = {
  coordinate?: WorkspaceCoordinate;
  id: string;
  label: string;
  markerLabel?: string;
  selected?: boolean;
  tier?: number;
};

type WorkspaceMapFrameProps = {
  children?: ReactNode;
  className?: string;
  fallbackChildren?: ReactNode;
  landmarks?: WorkspaceMapLandmark[];
  legend?: WorkspaceMapLegendItem[];
  naverMap?: {
    center?: WorkspaceCoordinate;
    points?: WorkspaceMapPoint[];
    zoom?: number;
  };
};

type NaverLatLng = {
  lat: () => number;
  lng: () => number;
};

type NaverFitBoundsOptions = {
  bottom: number;
  left: number;
  maxZoom?: number;
  right: number;
  top: number;
};

type NaverMap = {
  autoResize: () => void;
  fitBounds: (bounds: NaverLatLng[], options?: NaverFitBoundsOptions) => void;
  getMaxZoom: () => number;
  getMinZoom: () => number;
  setCenter: (center: NaverLatLng) => void;
  setZoom: (zoom: number, effect?: boolean) => void;
};

type NaverOverlay = {
  setMap: (map: NaverMap | null) => void;
};

type NaverMapsNamespace = {
  Event: {
    removeListener?: (listener: NaverEventListener) => void;
  };
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  Map: new (
    element: HTMLElement,
    options: {
      center: NaverLatLng;
      minZoom?: number;
      zoom: number;
    }
  ) => NaverMap;
  Marker: new (options: {
    map: NaverMap;
    position: NaverLatLng;
    title?: string;
  }) => NaverOverlay;
};

type NaverEventListener = {
  remove?: () => void;
};

declare global {
  interface Window {
    naver?: {
      maps?: NaverMapsNamespace;
    };
    navermap_authFailure?: () => void;
  }
}

let naverMapsScriptPromise: Promise<void> | null = null;
let naverMapsRuntimeUnavailable = false;
const NAVER_MAP_MIN_LOCAL_ZOOM = 14;
const NAVER_MAP_FOCUSED_ZOOM = 16;
const NAVER_MAP_MULTI_POINT_ZOOM = 15;
const NAVER_MAP_LOCAL_FIT_RADIUS_KM = 4;
const NAVER_MAP_BOUNDS_MARGIN: Omit<NaverFitBoundsOptions, "maxZoom"> = {
  bottom: 40,
  left: 40,
  right: 40,
  top: 40,
};

export function WorkspaceMapFrame({
  children,
  className,
  fallbackChildren,
  landmarks = [],
  legend,
  naverMap,
}: WorkspaceMapFrameProps) {
  const [naverUnavailable, setNaverUnavailable] = useState(
    naverMapsRuntimeUnavailable
  );
  const handleNaverUnavailable = useCallback(() => {
    naverMapsRuntimeUnavailable = true;
    setNaverUnavailable(true);
  }, []);
  const naverPoints = useMemo(
    () => naverMap?.points ?? [],
    [naverMap?.points]
  );
  const canRenderNaverMap =
    Boolean(frontendSettings.naverMapClientId) &&
    !naverUnavailable &&
    naverPoints.some((point) => point.coordinate);

  return (
    <div
      className={cn(
        "relative min-h-[320px] flex-1 overflow-hidden rounded-[18px] bg-[var(--chat-map-bg)] lg:min-h-0",
        className
      )}
    >
      {canRenderNaverMap ? (
        <WorkspaceNaverMapCanvas
          center={naverMap?.center}
          points={naverPoints}
          zoom={naverMap?.zoom}
          onUnavailable={handleNaverUnavailable}
        />
      ) : (
        <WorkspaceMockMapCanvas landmarks={landmarks} />
      )}

      {canRenderNaverMap ? null : fallbackChildren}
      {children}
      {legend?.length ? <WorkspaceMapLegend items={legend} /> : null}
    </div>
  );
}

export function WorkspaceMapMarker({
  children,
  x,
  y,
}: {
  children: ReactNode;
  x: number;
  y: number;
}) {
  return (
    <span
      className="absolute z-10 -translate-x-1/2 -translate-y-full"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </span>
  );
}

function WorkspaceNaverMapCanvas({
  center,
  points,
  zoom,
  onUnavailable,
}: {
  center?: WorkspaceCoordinate;
  points: WorkspaceMapPoint[];
  zoom?: number;
  onUnavailable: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const overlaysRef = useRef<NaverOverlay[]>([]);
  const mapKey = frontendSettings.naverMapClientId;
  const [scriptReady, setScriptReady] = useState(hasLoadedNaverMaps);

  useEffect(() => {
    if (!mapKey) return;

    let cancelled = false;
    const previousAuthFailure = window.navermap_authFailure;
    const handleNaverSdkError = (event: ErrorEvent | Event) => {
      if (!isNaverMapsSdkError(event)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      naverMapsRuntimeUnavailable = true;
      if (!cancelled) onUnavailable();
    };

    window.addEventListener("error", handleNaverSdkError, true);

    window.navermap_authFailure = () => {
      previousAuthFailure?.();
      if (!cancelled) onUnavailable();
    };

    loadNaverMapsScript(mapKey)
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch(() => {
        if (!cancelled) onUnavailable();
      });

    return () => {
      cancelled = true;
      window.removeEventListener("error", handleNaverSdkError, true);
      window.navermap_authFailure = previousAuthFailure;
    };
  }, [mapKey, onUnavailable]);

  useEffect(() => {
    if (!scriptReady || !canvasRef.current || !window.naver?.maps) return;

    const naver = window.naver.maps;
    const mapPoints = points.filter(
      (point): point is WorkspaceMapPoint & { coordinate: WorkspaceCoordinate } =>
        Boolean(point.coordinate)
    );
    const hasExplicitCenter = Boolean(center);
    const resolvedCenter = resolveMapCenter(center, mapPoints);
    const resolvedZoom = resolveLocalMapZoom(zoom, {
      focused: hasExplicitCenter || mapPoints.length <= 1,
    });

    if (!resolvedCenter) {
      onUnavailable();
      return;
    }

    try {
      if (!mapRef.current) {
        mapRef.current = new naver.Map(canvasRef.current, {
          center: new naver.LatLng(resolvedCenter.lat, resolvedCenter.lng),
          minZoom: NAVER_MAP_MIN_LOCAL_ZOOM,
          zoom: resolvedZoom,
        });
      }

      const map = mapRef.current;
      applyNaverMapViewport({
        center: resolvedCenter,
        map,
        naver,
        points: mapPoints,
        shouldFitBounds: !hasExplicitCenter,
        zoom: resolvedZoom,
      });

      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = mapPoints.map(
        (point) =>
          new naver.Marker({
            map,
            position: new naver.LatLng(point.coordinate.lat, point.coordinate.lng),
            title: point.label,
          })
      );

      const resizeFrame = window.requestAnimationFrame(() => {
        applyNaverMapViewport({
          center: resolvedCenter,
          map,
          naver,
          points: mapPoints,
          shouldFitBounds: !hasExplicitCenter,
          zoom: resolvedZoom,
        });
      });

      return () => {
        window.cancelAnimationFrame(resizeFrame);
        overlaysRef.current.forEach((overlay) => overlay.setMap(null));
        overlaysRef.current = [];
      };
    } catch {
      onUnavailable();
    }
  }, [center, onUnavailable, points, scriptReady, zoom]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[var(--chat-map-bg)]">
      <div ref={canvasRef} className="size-full" />
    </div>
  );
}

function WorkspaceMockMapCanvas({
  landmarks,
}: {
  landmarks: WorkspaceMapLandmark[];
}) {
  return (
    <>
      <div className="absolute inset-0 bg-linear-to-b from-[var(--chat-map-bg)] to-[var(--chat-map-bg)]" />
      <div className="absolute -right-[4%] -top-[6%] h-[55%] w-[40%] rotate-[-8deg] rounded-bl-[60%] bg-[var(--chat-map-blue)]" />
      <div className="absolute left-[8%] top-[18%] h-[30%] w-[26%] rounded-[40%_50%_45%_55%] bg-[var(--chat-map-green)]" />
      <div className="absolute bottom-[10%] right-[14%] h-[26%] w-[22%] rounded-[55%_45%_50%_40%] bg-[var(--chat-map-green)]" />
      <div className="absolute left-0 top-[46%] h-[9px] w-full bg-[var(--chat-map-road)] shadow-sm" />
      <div className="absolute left-[38%] top-0 h-full w-[9px] bg-[var(--chat-map-road)] shadow-sm" />
      <div className="absolute left-0 top-[22%] h-[5px] w-full bg-[var(--chat-map-road-soft)]" />
      <div className="absolute left-[70%] top-0 h-full w-[5px] bg-[var(--chat-map-road-soft)]" />
      <div className="absolute left-[-10%] top-[60%] h-1.5 w-[130%] origin-left rotate-[-18deg] bg-[var(--chat-map-transit)]" />

      {landmarks.map((landmark) => (
        <span
          key={landmark.id}
          className="absolute -translate-x-1/2 text-sm font-semibold text-[var(--chat-text-muted)]"
          style={{ left: `${landmark.x}%`, top: `${landmark.y}%` }}
        >
          {landmark.label}
        </span>
      ))}
    </>
  );
}

function WorkspaceMapLegend({ items }: { items: WorkspaceMapLegendItem[] }) {
  return (
    <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-4 rounded-[10px] bg-white/85 px-3 py-2 text-[15px] font-semibold text-[var(--chat-text-muted)] backdrop-blur">
      {items.map((item) => (
        <span key={item.id} className="flex items-center gap-1.5">
          <span className="chat-map-pin size-2.5 rounded-full" data-tier={item.tier} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function loadNaverMapsScript(mapKey: string) {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.naver?.maps) {
    return Promise.resolve();
  }

  if (naverMapsScriptPromise) {
    return naverMapsScriptPromise;
  }

  naverMapsScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById("naver-maps-sdk");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "naver-maps-sdk";
    script.async = true;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(mapKey)}`;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(), { once: true });
    document.head.appendChild(script);
  });

  return naverMapsScriptPromise;
}

function hasLoadedNaverMaps() {
  if (typeof globalThis === "undefined") return false;

  return Boolean(
    (globalThis as typeof globalThis & { naver?: Window["naver"] }).naver?.maps
  );
}

function isNaverMapsSdkError(event: ErrorEvent | Event) {
  const source =
    event instanceof ErrorEvent
      ? [event.filename, event.message].filter(Boolean).join(" ")
      : "";
  const targetSource =
    event.target instanceof HTMLScriptElement ? event.target.src : "";
  const combined = `${source} ${targetSource}`;

  return (
    combined.includes("oapi.map.naver.com") ||
    combined.includes("nrbe.map.naver.net") ||
    combined.includes("maps.js") ||
    combined.includes("NAVER Maps JavaScript API")
  );
}

function resolveMapCenter(
  center: WorkspaceCoordinate | undefined,
  points: Array<WorkspaceMapPoint & { coordinate: WorkspaceCoordinate }>
) {
  if (center) return center;

  return (
    points.find((point) => point.selected)?.coordinate ??
    points[0]?.coordinate ??
    resolveCoordinateCenter(points.map((point) => point.coordinate))
  );
}

function resolveCoordinateCenter(points: WorkspaceCoordinate[]) {
  if (!points.length) return undefined;

  return {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
  };
}

function applyNaverMapViewport({
  center,
  map,
  naver,
  points,
  shouldFitBounds,
  zoom,
}: {
  center: WorkspaceCoordinate;
  map: NaverMap;
  naver: NaverMapsNamespace;
  points: Array<WorkspaceMapPoint & { coordinate: WorkspaceCoordinate }>;
  shouldFitBounds: boolean;
  zoom: number;
}) {
  const resolvedZoom = clampNaverMapZoom(map, zoom);
  const coordinates = points.map((point) => point.coordinate);
  const canFitLocalBounds =
    shouldFitBounds &&
    coordinates.length > 1 &&
    getMaxDistanceKm(center, coordinates) <= NAVER_MAP_LOCAL_FIT_RADIUS_KM;

  map.autoResize();

  if (canFitLocalBounds) {
    map.fitBounds(
      coordinates.map((point) => new naver.LatLng(point.lat, point.lng)),
      {
        ...NAVER_MAP_BOUNDS_MARGIN,
        maxZoom: resolvedZoom,
      }
    );
    return;
  }

  map.setCenter(new naver.LatLng(center.lat, center.lng));
  map.setZoom(resolvedZoom, false);
}

function resolveLocalMapZoom(
  zoom: number | undefined,
  { focused }: { focused: boolean }
) {
  const fallbackZoom = focused ? NAVER_MAP_FOCUSED_ZOOM : NAVER_MAP_MULTI_POINT_ZOOM;
  const requestedZoom =
    typeof zoom === "number" && Number.isFinite(zoom) ? zoom : fallbackZoom;
  const minimumZoom = focused ? NAVER_MAP_FOCUSED_ZOOM : NAVER_MAP_MIN_LOCAL_ZOOM;

  return Math.max(requestedZoom, minimumZoom);
}

function clampNaverMapZoom(map: NaverMap, zoom: number) {
  return Math.min(Math.max(zoom, map.getMinZoom()), map.getMaxZoom());
}

function getMaxDistanceKm(
  center: WorkspaceCoordinate,
  points: WorkspaceCoordinate[]
) {
  return points.reduce(
    (maxDistance, point) =>
      Math.max(maxDistance, getDistanceKm(center, point)),
    0
  );
}

function getDistanceKm(from: WorkspaceCoordinate, to: WorkspaceCoordinate) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
