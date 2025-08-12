
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { headers } from 'next/headers';
import { getSubdomain } from '@/lib/utils';
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

async function getSchoolSettingsForHost() {
  const headersList = headers();
  const host = headersList.get('host') || '';
  const subdomain = getSubdomain(host);
  const client = await pool.connect();
  try {
      let query;
      let queryParams;
      if (subdomain) {
          query = 'SELECT name, color_primary, color_accent, color_background FROM schools WHERE domain = $1 LIMIT 1';
          queryParams = [subdomain];
      } else {
          query = 'SELECT name, color_primary, color_accent, color_background FROM schools ORDER BY created_at ASC LIMIT 1';
          queryParams = [];
      }
      const { rows } = await client.query(query, queryParams);
      return rows[0] || null;
  } catch (error) {
      console.error("Could not fetch school settings for layout:", error);
      return null;
  } finally {
      client.release();
  }
}

export async function generateMetadata(): Promise<Metadata> {
  let schoolName = "School Management Platform"; // Fallback title
  
  try {
    const settings = await getSchoolSettingsForHost();
    if (settings?.name) {
      schoolName = `${settings.name} | School Management Platform`;
    }
  } catch (e) {
      console.error("Could not generate metadata:", e);
  }
  
  return {
    title: schoolName,
    description: 'A comprehensive educational management platform.',
    manifest: '/manifest.json', // Link to the manifest file
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
  let colors = null;
  try {
    colors = await getSchoolSettingsForHost();
  } catch (e) {
    console.error("Could not load colors for root layout", e);
  }
  
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
          {colors && (
              <style>
                  {`
                    :root {
                      ${colors.color_primary ? `--primary: ${colors.color_primary};` : ''}
                      ${colors.color_accent ? `--accent: ${colors.color_accent};` : ''}
                      ${colors.color_background ? `--background: ${colors.color_background};` : ''}
                    }
                  `}
              </style>
          )}
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
