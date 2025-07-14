
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getSubdomain } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // We get the subdomain from the client side to correctly handle all environments
    const subdomain = getSubdomain(window.location.hostname);
    
    // If a subdomain exists (e.g., "sjm" in sjm.localhost:3000), redirect to its marketing page
    // Otherwise, redirect to the main portal selection page
    if (subdomain) {
      router.replace(`/${subdomain}`);
    } else {
      router.replace('/portals');
    }
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
