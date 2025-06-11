
import type {Metadata} from 'next';
import { PT_Sans } from 'next/font/google'; // Import the font
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Initialize the font
const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  // display: 'swap', // Optional: good for performance
});

export const metadata: Metadata = {
  title: "St. Joseph's Montessori",
  description: 'Comprehensive Educational Management Platform for St. Joseph\'s Montessori',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      {/* Removed explicit <head /> tag as Next.js App Router handles it */}
      <body className={`${ptSans.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
