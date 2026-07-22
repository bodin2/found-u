"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

const MapCanvasDynamic = dynamic(() => import("@/components/ui/map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[200px] rounded-xl bg-bg-tertiary flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-line-green motion-reduce:animate-none" />
    </div>
  ),
});

export type MapCanvasLazyProps = ComponentProps<typeof MapCanvasDynamic>;

export default function MapCanvasLazy(props: MapCanvasLazyProps) {
  return <MapCanvasDynamic {...props} />;
}
