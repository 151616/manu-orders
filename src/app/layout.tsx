import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { unstable_cache } from "next/cache";
import "./globals.css";
import { PageProgressBar } from "@/components/page-progress-bar";
import { TopNav } from "@/components/top-nav";
import { PendingRequestsToast } from "@/components/pending-requests-toast";
import { FirebaseAnalyticsBootstrap } from "@/components/firebase-analytics-bootstrap";
import { ThemeProvider } from "@/components/theme-provider";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ManuQueue",
  description: "Manufacturing order queue management",
};

const getCachedSiteBookmarks = unstable_cache(
  async () =>
    prisma.bookmark.findMany({
      where: {
        kind: "SITE",
        isDeleted: false,
        siteUrl: { not: null },
      },
      select: { id: true, name: true, siteUrl: true },
      orderBy: [{ createdAt: "desc" }],
      take: 20,
    }),
  ["site-bookmarks"],
  { revalidate: 30, tags: ["site-bookmarks"] },
);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSession();

  let siteBookmarks: Array<{ id: string; name: string; siteUrl: string | null }> = [];
  let pendingRequestCount = 0;
  if (user) {
    try {
      siteBookmarks = await getCachedSiteBookmarks();
    } catch (error) {
      console.error("[RootLayout] Failed to load site bookmarks.", error);
      siteBookmarks = [];
    }
    if (user.role === "ADMIN") {
      try {
        const [orderCount, trackingCount] = await Promise.all([
          prisma.orderRequest.count({ where: { status: "PENDING" } }),
          prisma.trackingRequest.count({ where: { status: "PENDING" } }),
        ]);
        pendingRequestCount = orderCount + trackingCount;
      } catch {
        pendingRequestCount = 0;
      }
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <ThemeProvider>
          <FirebaseAnalyticsBootstrap />
          <PageProgressBar />
          {user ? <TopNav user={user} siteBookmarks={siteBookmarks} pendingRequestCount={pendingRequestCount} /> : null}
          {user?.role === "ADMIN" ? <PendingRequestsToast pendingCount={pendingRequestCount} /> : null}
          <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
