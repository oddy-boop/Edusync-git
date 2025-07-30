
import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { getSupabase } from './../lib/supabaseClient';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

// Dynamically generate metadata
export async function generateMetadata(): Promise<Metadata> {
  const supabase = getSupabase();
  let schoolName = "School Management Platform"; // Fallback title
  try {
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
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
