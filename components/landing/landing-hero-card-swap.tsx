"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { PublicHeroImage } from "@/lib/landing-public-data";

const HERO_CARD_ASPECT = 97 / 70;

const CardSwapBundle = dynamic(
  () =>
    import("@/components/ui/card-swap").then((mod) => {
      function HeroCardSwapInner({ images }: { images: PublicHeroImage[] }) {
        const { default: CardSwap, Card } = mod;
        return (
          <CardSwap
            width="100%"
            aspectRatio={HERO_CARD_ASPECT}
            baseWidth={680}
            cardDistance={60}
            verticalDistance={70}
            delay={4000}
            pauseOnHover
            skewAmount={2}
          >
            {images.map((img, index) => (
              <Card
                key={img.fileName}
                customClass="group overflow-hidden rounded-2xl border border-border-light bg-bg-card"
              >
                <div className="relative h-full w-full">
                  <Image
                    src={img.url}
                    alt={img.label}
                    fill
                    sizes="(min-width: 1280px) 50vw, (min-width: 768px) 58vw, 72vw"
                    priority={index === 0}
                    className="object-cover object-top"
                    unoptimized={img.url.endsWith(".svg")}
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/45 to-transparent px-4 py-3">
                    <p className="text-sm font-medium text-white text-pretty">{img.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </CardSwap>
        );
      }
      return HeroCardSwapInner;
    }),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full animate-pulse rounded-2xl bg-bg-tertiary"
        style={{ aspectRatio: String(HERO_CARD_ASPECT) }}
        role="status"
        aria-live="polite"
        aria-label="กำลังโหลดตัวอย่างหน้าจอ"
      />
    ),
  }
);

type LandingHeroCardSwapProps = {
  images: PublicHeroImage[];
};

export function LandingHeroCardSwap({ images }: LandingHeroCardSwapProps) {
  const isLargeDesktop = useMediaQuery("(min-width: 1024px)");

  if (!isLargeDesktop || images.length <= 1) {
    return null;
  }

  return (
    <div className="absolute bottom-0 right-4 z-10 hidden w-[min(72vw,720px)] min-w-[280px] md:right-8 lg:right-12 lg:block lg:w-[min(54vw,760px)] xl:w-[min(50vw,800px)]">
      <div className="pointer-events-auto relative w-full">
        <CardSwapBundle images={images} />
      </div>
    </div>
  );
}
