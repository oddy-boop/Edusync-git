
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { headers } from 'next/headers';
import pool from "@/lib/db";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

// PWA Viewport settings
export const viewport: Viewport = {
  themeColor: "#2C3E50",
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// This function is now simplified as dynamic data is fetched client-side.
export async function generateMetadata(): Promise<Metadata> {
  const schoolName = "EduSync Platform"; // Generic fallback title
  
  return {
    title: {
        default: schoolName,
        template: `%s | ${schoolName}`,
    },
    description: 'A comprehensive educational management platform.',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: schoolName,
    },
  };
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
          <link rel="icon" href="/logo.svg" type="image/svg+xml" />
           <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossOrigin=""
          />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
