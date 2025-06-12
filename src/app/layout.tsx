
import type {Metadata} from 'next';
// import { PT_Sans } from 'next/font/google'; // Temporarily removed
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// const ptSans = PT_Sans({ // Temporarily removed
//   subsets: ['latin'],
//   weight: ['400', '700'],
//   style: ['normal', 'italic'],
// });

export const metadata: Metadata = {
  title: "St. Joseph's Montessori",
  description: 'Comprehensive Educational Management Platform for St. Joseph\'s Montessori',
  // No explicit icons field, relying on app/favicon.ico convention
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      {/* Apply a generic sans-serif font stack directly, and PT Sans via globals.css if needed */}
      <body className={`antialiased font-sans`}> {/* Changed from ptSans.className */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
