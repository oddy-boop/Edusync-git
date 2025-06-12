
import type {Metadata} from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Re-enabled

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
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
      <body className={`${ptSans.className} antialiased`}>
        {children}
        <Toaster /> {/* Re-enabled */}
      </body>
    </html>
  );
}
