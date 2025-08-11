"use client";

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 text-center">
      <WifiOff className="mx-auto h-16 w-16 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-semibold text-primary">You Are Offline</h1>
      <p className="mt-2 text-muted-foreground max-w-md">
        It seems there's no internet connection. The page you are trying to access has not been saved for offline use.
      </p>
      <p className="mt-1 text-sm text-muted-foreground max-w-md">
        Please check your connection or try returning to a page you've previously visited.
      </p>
      <Button onClick={handleReload} className="mt-6">
        Try Reloading Page
      </Button>
    </div>
  );
}
