
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { getSupabase } from './../lib/supabaseClient';
import { createClient } from './../lib/supabase/server';

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
    const { data, error } = await supabase.from('app_settings').select('school_name').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') throw error;
    if (data?.school_name) {
      schoolName = `${data.school_name} | School Management Platform`;
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
    try {
        const { data } = await supabase.from('app_settings')
            .select('color_primary, color_accent, color_background')
            .eq('id', 1)
            .single();
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
      </body>
    </html>
  );
}
