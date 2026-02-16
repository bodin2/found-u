import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { DataProvider } from "@/contexts/DataContext";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import AuthGuard from "@/components/auth/auth-guard";
import { getAppSettings } from "@/lib/firestore";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";

// โหลดฟอนต์ Kanit สำหรับภาษาไทย
const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings().catch(() => DEFAULT_APP_SETTINGS);

  const title = settings.ogTitle || DEFAULT_APP_SETTINGS.ogTitle || "BD2Fondue";
  const description = settings.ogDescription || DEFAULT_APP_SETTINGS.ogDescription || "ระบบแจ้งของหาย-ของเจอ";
  const images = settings.ogImage ? [settings.ogImage] : [];

  return {
    title,
    description,
    keywords: ["lost and found", "ของหาย", "แจ้งของหาย", "โรงเรียน"],
    authors: [{ name: "scfondue" }],
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://scfondue.vercel.app'),
    openGraph: {
      title,
      description,
      images,
      type: 'website',
      siteName: 'BD2Fondue',
      locale: 'th_TH',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#06C755",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${kanit.variable} antialiased font-sans`} suppressHydrationWarning>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <DataProvider>
                <AuthGuard>
                  {/* 
                    Responsive layout wrapper
                    - Mobile: max-w-md centered
                    - Desktop: Full width for better experience
                  */}
                  <div className="min-h-screen bg-bg-secondary transition-colors">
                    <div className="w-full min-h-screen bg-bg-primary transition-colors">
                      {children}
                    </div>
                  </div>
                </AuthGuard>
              </DataProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
