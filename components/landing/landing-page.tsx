"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Camera,
  Clock,
  Radio,
  Sparkles,
} from "lucide-react";
import { FeaturesMotionCarousel } from "@/components/landing/features-motion-carousel";
import { ComingSoonCta } from "@/components/landing/coming-soon-cta";
import CardSwap, { Card } from "@/components/ui/card-swap";
import { MobileHeroPhone } from "@/components/landing/mobile-hero-phone";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

type HeroImage = {
  fileName: string;
  label: string;
  url: string;
  width: number;
  height: number;
};

const steps = [
  {
    num: "1",
    title: "แจ้งเข้าระบบ",
    text: "ของหายหรือของเจอ กรอกรายละเอียดกับจุดที่เกี่ยวข้อง ใช้เวลาไม่นาน",
  },
  {
    num: "2",
    title: "ระบบช่วยจับคู่",
    text: "เมื่อมีรายการที่เข้ากัน ทีมงานหรือระบบจะช่วยเชื่อมให้เจอ",
  },
  {
    num: "3",
    title: "ติดตามสถานะ",
    text: "ติดตามสถานะได้ตลอด ไม่ต้องสอบถามในแชทหลายครั้ง",
  },
];

const features = [
  {
    id: "lost",
    icon: Search,
    title: "แจ้งของหาย",
    text: "บันทึกชื่อ ประเภท สถานที่ และช่องทางติดต่อ มีรหัสให้ติดตามทันที",
    tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotLabel: "ของหาย",
  },
  {
    id: "found",
    icon: Camera,
    title: "แจ้งเจอของ",
    text: "ถ่ายรูปหรือกรอกรายละเอียด แล้วบอกว่าฝากไว้ที่ไหนในโรงเรียน",
    tint: "bg-line-green/10 text-line-green",
    dotLabel: "ของเจอ",
  },
  {
    id: "track",
    icon: Clock,
    title: "ติดตามสถานะ",
    text: "พิมพ์รหัสติดตามแล้วรู้เลยว่าอยู่ขั้นตอนไหน",
    tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    dotLabel: "ติดตาม",
  },
  {
    id: "nfc",
    icon: Radio,
    title: "แท็ก NFC",
    text: "ติดแท็กกับของสำคัญ คนพบสแกนแล้วแจ้งถึงคุณได้เร็วขึ้น",
    tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    dotLabel: "NFC",
  },
];

export function LandingPage() {
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [mobileHeroImages, setMobileHeroImages] = useState<HeroImage[]>([]);
  const [comingSoon, setComingSoon] = useState(true);
  const [comingSoonMessage, setComingSoonMessage] = useState("พบกันเร็วๆนี้");

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/public-settings")
      .then((res) => res.json())
      .then((data: { comingSoonEnabled?: boolean; comingSoonMessage?: string }) => {
        if (cancelled) return;
        setComingSoon(Boolean(data.comingSoonEnabled));
        if (data.comingSoonMessage) setComingSoonMessage(data.comingSoonMessage);
      })
      .catch(() => {
        if (!cancelled) setComingSoon(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadImages = async (
      folder: "img" | "img/mobile_responsive",
      setImages: (images: HeroImage[]) => void
    ) => {
      try {
        const res = await fetch(`/api/public-images?folder=${encodeURIComponent(folder)}`);
        const data = (await res.json()) as { images?: HeroImage[] };
        if (!cancelled) {
          setImages(Array.isArray(data.images) ? data.images : []);
        }
      } catch {
        if (!cancelled) setImages([]);
      }
    };

    void loadImages("img", setHeroImages);
    void loadImages("img/mobile_responsive", setMobileHeroImages);
    return () => {
      cancelled = true;
    };
  }, []);

  const cardImages = useMemo(() => {
    if (heroImages.length > 0) return heroImages;
    return [
      {
        fileName: "logo.png",
        label: "foundu.forum",
        url: "/logo.png",
        width: 1024,
        height: 1024,
      },
    ];
  }, [heroImages]);

  const mobileCardImages = useMemo(() => mobileHeroImages, [mobileHeroImages]);

  /** อัตราส่วนการ์ด hero (กว้าง : สูง) */
  const heroCardAspect = 97 / 70;

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg-secondary text-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border-light bg-bg-primary/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="foundu.forum"
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className="text-lg font-semibold tracking-tight">foundu.forum</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <AnimatedThemeToggler />
            <ComingSoonCta
              comingSoon={comingSoon}
              message={comingSoonMessage}
              href="/auth/register"
              label="เริ่มใช้งาน"
              className="rounded-full bg-line-green px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-line-green-hover"
            />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-x-clip overflow-y-visible bg-bg-secondary px-5 pb-16 pt-10 md:overflow-visible md:pb-20 md:pt-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
        >
          <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-line-green/20 blur-[100px]" />
        </div>

        {cardImages.length > 1 && (
          <div className="absolute bottom-0 right-4 z-10 hidden w-[min(72vw,720px)] min-w-[280px] md:right-8 md:block md:w-[min(58vw,700px)] lg:right-12 lg:w-[min(54vw,760px)] xl:w-[min(50vw,800px)]">
            <div className="pointer-events-auto relative w-full">
              <CardSwap
                width="100%"
                aspectRatio={heroCardAspect}
                baseWidth={680}
                cardDistance={60}
                verticalDistance={70}
                delay={2000}
                pauseOnHover={false}
                skewAmount={6}
                easing="elastic"
              >
                {cardImages.map((img, index) => (
                  <Card
                    key={img.fileName}
                    customClass="group overflow-hidden rounded-2xl border border-border-light bg-bg-card shadow-lg shadow-black/10 dark:shadow-black/40"
                  >
                    <div className="relative h-full w-full">
                      <Image
                        src={img.url}
                        alt={img.label}
                        fill
                        sizes="(min-width: 1280px) 50vw, (min-width: 768px) 58vw, 72vw"
                        priority={index === 0}
                        className="object-cover object-top transition duration-500 group-hover:scale-[1.03]"
                        unoptimized={img.url.endsWith(".svg")}
                      />
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-14 items-center px-4">
                        <div className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-sm" />
                          <p className="text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">
                            {img.label}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </CardSwap>
            </div>
          </div>
        )}

        <div className="relative z-20 mx-auto max-w-6xl">
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,42%)] md:gap-10 lg:gap-12">
            <div className="max-w-xl text-center md:text-left">
              <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-4xl lg:text-5xl">
                ของหาย? แจ้งง่ายนิดเดียว
              </h1>
              <p className="mt-4 text-base leading-relaxed text-text-secondary md:text-lg">
                foundu.forum รวมการแจ้งของหาย ของเจอ และติดตามสถานะไว้ที่เดียว
                ให้คุณประกาศติดตามของที่หายและของที่พบเจอได้รวดเร็วกว่าเดิม
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
                <ComingSoonCta
                  comingSoon={comingSoon}
                  message={comingSoonMessage}
                  href="/auth/register"
                  label="เริ่มใช้งาน"
                  showArrow
                  className="rounded-full bg-line-green px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-line-green/25 transition hover:bg-line-green-hover"
                />
                <a
                  href="#วิธีใช้"
                  className="inline-flex items-center justify-center rounded-full border border-border-light bg-bg-card px-7 py-3.5 text-base font-medium text-text-primary transition hover:bg-bg-tertiary"
                >
                  ดูว่าใช้ยังไง
                </a>
              </div>
            </div>

            <div className="hidden md:block md:w-full" aria-hidden>
              <div className="aspect-[97/70] w-[min(58vw,720px)] max-w-full opacity-0" />
            </div>

            <MobileHeroPhone images={mobileCardImages} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-30 border-t border-border-light bg-bg-primary px-5 py-14 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-text-primary md:text-3xl">
            ทำอะไรได้บ้าง
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-text-secondary">
            ฟีเจอร์ของ foundu.forum
          </p>

          <div className="mt-10 -mx-2 sm:mx-0">
            <FeaturesMotionCarousel features={features} />
          </div>
        </div>
      </section>

      {/* Steps */}
      <section
        id="วิธีใช้"
        className="border-t border-border-light bg-bg-secondary px-5 py-14 md:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-center gap-2 text-line-green">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">ใช้งานง่ายๆ สามขั้น</span>
          </div>
          <h2 className="mt-2 text-center text-2xl font-bold text-text-primary md:text-3xl">
            แจ้ง ติดตาม จับคู่
          </h2>

          <ol className="mt-10 space-y-6 md:grid md:grid-cols-3 md:gap-6 md:space-y-0">
            {steps.map((step) => (
              <li
                key={step.num}
                className="relative rounded-2xl border border-border-light bg-bg-card p-6 shadow-card"
              >
                <span className="text-4xl font-bold text-line-green/30">
                  {step.num}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border-light bg-bg-primary px-5 py-14 md:py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-line-green/30 bg-gradient-to-br from-line-green/15 to-transparent p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
            พร้อมลองใช้แล้วหรือยัง
          </h2>
          <p className="mt-3 text-text-secondary">
            เริ่มแจ้งหรือติดตามของที่หายและของที่เจอได้ทันที
          </p>
          <div className="mt-8 flex justify-center">
            <ComingSoonCta
              comingSoon={comingSoon}
              message={comingSoonMessage}
              href="/auth/register"
              label="เริ่มใช้งาน"
              showArrow
              className="rounded-full bg-line-green px-8 py-3.5 font-semibold text-white transition hover:bg-line-green-hover"
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-border-light bg-bg-secondary">
        <div className="border-b border-border-light px-5 py-8 md:py-10">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
            <div className="flex shrink-0 items-center justify-center gap-5 sm:gap-8">
              <Image
                src="/img/logo/nrct.png"
                alt="สำนักงานการวิจัยแห่งชาติ (NRCT)"
                width={120}
                height={120}
                className="h-16 w-auto object-contain sm:h-20"
                onClick={() => window.open("https://nrct.go.th", "_blank")}
              />
              <Image
                src="/img/logo/nstda.png"
                alt="สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ (NSTDA)"
                width={160}
                height={80}
                className="h-12 w-auto object-contain sm:h-14"
                onClick={() => window.open("https://www.nstda.or.th", "_blank")} 
              />
            </div>
            <div className="max-w-2xl text-center text-sm leading-relaxed text-text-secondary md:text-right">
              <p>
                โครงการ Found-U : ระบบแจ้งของหาย-ของเจอสำหรับโรงเรียนด้วยปัญญาประดิษฐ์
                และเทคโนโลยี NFC ได้รับทุนอุดหนุนการทำกิจกรรมส่งเสริมและสนับสนุนการวิจัยและนวัตกรรมจากสำนักงานการวิจัยแห่งชาติ
                และสำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ
              </p>
              <p className="mt-3 text-xs leading-relaxed text-text-tertiary italic">
                This research and innovation activity is funded by National Research Council of
                Thailand (NRCT) and National Science and Technology Development Agency (NSTDA)
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-8 text-center text-sm text-text-tertiary">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-3">
            <Image
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 opacity-80"
            />
            <p>foundu.forum — ระบบแจ้งของหายและของเจอสำหรับโรงเรียนบดินทรเดชา (สิงห์ สิงหเสนี) ๒ โดย <a href="https://www.instagram.com/foundu.forum" target="_blank" rel="noopener noreferrer" className="text-line-green hover:underline">foundu.forum</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
