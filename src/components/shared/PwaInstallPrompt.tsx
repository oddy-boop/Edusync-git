
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function PwaInstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = useState<Event | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPromptEvent) {
      return;
    }
    // Type assertion is needed here because the default Event type doesn't have prompt()
    (installPromptEvent as any).prompt();
    (installPromptEvent as any).userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPromptEvent(null);
    });
  };

  if (!installPromptEvent) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      onClick={handleInstallClick}
      className="hidden lg:inline-flex"
    >
      <Download className="mr-2 h-4 w-4" />
      Install App
    </Button>
  );
}
