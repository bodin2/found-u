"use client";

import type { LucideIcon } from "lucide-react";
import { MotionCarousel, type MotionCarouselSlide } from "@/components/ui/motion-carousel";
import { cn } from "@/lib/utils";

export type FeatureItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  text: string;
  tint: string;
  dotLabel: string;
};

type FeaturesMotionCarouselProps = {
  features: FeatureItem[];
};

export function FeaturesMotionCarousel({ features }: FeaturesMotionCarouselProps) {
  const slides: MotionCarouselSlide[] = features.map((feature) => {
    const Icon = feature.icon;
    return {
      id: feature.id,
      label: feature.dotLabel,
      content: (
        <article
          className={cn(
            "flex h-full w-full flex-col rounded-2xl border border-border-light bg-bg-secondary p-6",
            "md:p-7"
          )}
        >
          <div
            className={cn(
              "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
              feature.tint
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <h3 className="text-balance text-base font-medium leading-[1.4] text-text-primary">
            {feature.title}
          </h3>
          <p className="mt-2 flex-1 text-pretty text-base leading-[1.5] text-text-secondary">
            {feature.text}
          </p>
        </article>
      ),
    };
  });

  return (
    <MotionCarousel
      slides={slides}
      options={{
        align: "center",
        loop: true,
        containScroll: false,
      }}
    />
  );
}
