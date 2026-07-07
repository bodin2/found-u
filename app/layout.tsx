import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { AppModeProvider } from "@/contexts/app-mode-context";
import { DataProvider } from "@/contexts/DataContext";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import AuthGuard from "@/components/auth/auth-guard";
import { BfcacheRestoreHandler } from "@/components/bfcache-restore-handler";
import { buildSiteMetadata } from "@/lib/seo-metadata";

// โหลดฟอนต์ Kanit สำหรับภาษาไทย
const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Load OG/SEO metadata from admin settings (cached; no cookies() in layout).
export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata();
}

export const revalidate = 60;

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
      <head>
        {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        ) : null}
        <link rel="dns-prefetch" href="https://api.supabase.com" />
      </head>
      <body className={`${kanit.variable} antialiased font-sans`} suppressHydrationWarning>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="theme"
          >
            <AuthProvider>
              <AppModeProvider>
                <BfcacheRestoreHandler />
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
              </AppModeProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
