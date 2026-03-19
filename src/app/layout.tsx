import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PageProgressBar } from "@/components/page-progress-bar";
import { TopNav } from "@/components/top-nav";
import { FirebaseAnalyticsBootstrap } from "@/components/firebase-analytics-bootstrap";
import { ThemeProvider } from "@/components/theme-provider";
import { getSession } from "@/lib/auth";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSession();
  const isApproved = user && user.permissionLevel <= 4;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
          {isApproved ? (
            <TopNav user={user} siteBookmarks={[]} pendingRequestCount={0} />
          ) : null}
          <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
