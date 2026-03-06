import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PageTransitionOverlay } from "@/components/page-transition-overlay";
import { TopNav } from "@/components/top-nav";
import { FirebaseAnalyticsBootstrap } from "@/components/firebase-analytics-bootstrap";
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

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <FirebaseAnalyticsBootstrap />
        <PageTransitionOverlay />
        {user ? <TopNav user={user} /> : null}
        <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
