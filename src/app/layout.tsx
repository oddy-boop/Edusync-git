
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { createClient } from './../lib/supabase/server';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { headers } from 'next/headers';
import { getSubdomain } from '@/lib/utils';

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

// Dynamically generate metadata
export async function generateMetadata(): Promise<Metadata> {
  let schoolName = "School Management Platform"; // Fallback title
  try {
    const supabase = createClient();
    const headersList = headers();
    const host = headersList.get('host') || '';
    const subdomain = getSubdomain(host);
    
    let schoolQuery = supabase.from('schools');
    if (subdomain) {
        schoolQuery = schoolQuery.select('name').eq('domain', subdomain).single();
    } else {
        schoolQuery = schoolQuery.select('name').eq('id', 1).single();
    }
    
    const { data, error } = await schoolQuery;
    
    if (error && error.code !== 'PGRST116') throw error;
    if (data?.name) {
      schoolName = `${data.name} | School Management Platform`;
    }
  } catch (error) {
    console.error("Could not fetch school name for metadata:", error);
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

async function getThemeColors() {
    const supabase = createClient();
    const headersList = headers();
    const host = headersList.get('host') || '';
    const subdomain = getSubdomain(host);

    try {
        let schoolQuery = supabase.from('schools');
        if (subdomain) {
            schoolQuery = schoolQuery.select('color_primary, color_accent, color_background').eq('domain', subdomain).single();
        } else {
            schoolQuery = schoolQuery.select('color_primary, color_accent, color_background').eq('id', 1).single();
        }
        
        const { data } = await schoolQuery;
        return data;
    } catch (error) {
        console.error("Could not fetch theme colors:", error);
        return null;
    }
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const colors = await getThemeColors();
  
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
