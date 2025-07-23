
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent_edusync';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (consent === null) {
            setShowBanner(true);
        }
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setShowBanner(false);
    // Reload to initialize analytics on the next page load, as per updated firebase.ts
    window.location.reload(); 
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'false');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 z-[100] w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-8">
        <CardHeader>
            <CardTitle className="flex items-center">
                <Cookie className="mr-2 h-5 w-5" /> Our Use of Cookies
            </CardTitle>
        </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          We use cookies to enhance your browsing experience and analyze site traffic. By clicking "Accept", you consent to our use of cookies to help us improve our services.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleDecline}>Decline</Button>
        <Button onClick={handleAccept}>Accept</Button>
      </CardFooter>
    </Card>
  );
}
