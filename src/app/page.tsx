
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect users to the portals selection page.
    router.replace('/portals');
  }, [router]);

  // Provide a loading state as the redirect happens
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center">
        <Logo size="lg" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-lg text-muted-foreground">Initializing...</p>
      </div>
    </div>
  );
}
