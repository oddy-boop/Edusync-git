
"use client";

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, QrCode, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const QRCodeGenerator: React.FC = () => {
  const [qrCode, setQrCode] = useState<string>("");
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateQRCode = (lat: number, lon: number) => {
      const data = JSON.stringify({
        type: "attendance_checkin",
        location: { lat: lat, lng: lon },
        timestamp: Date.now(),
        validity: 60 // 1 minute validity to ensure freshness
      });

      QRCode.toDataURL(data, (err, url) => {
        if (err) {
            console.error("QR Code generation error:", err);
            setError("Failed to generate QR code.");
            toast({ title: "Error", description: "Could not generate a new QR code.", variant: "destructive" });
        } else {
            setQrCode(url);
        }
      });
  }

  useEffect(() => {
    // Initial generation
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation([latitude, longitude]);
        generateQRCode(latitude, longitude);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Could not get device location. Please enable location services for this site.");
        toast({ title: "Location Error", description: "Please enable location services and refresh the page.", variant: "destructive" });
      },
      { enableHighAccuracy: true }
    );

    // Regenerate QR code every 30 seconds to prevent screen capture cheating
    const interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
            generateQRCode(pos.coords.latitude, pos.coords.longitude);
        });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [toast]);

  return (
    <Card className="max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline flex items-center justify-center">
            <QrCode className="mr-2 h-7 w-7"/> Live Attendance QR Code
        </CardTitle>
        <CardDescription>
            Display this screen for teachers to scan for check-in. The code refreshes automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-6">
        {error ? (
          <div className="text-destructive text-center">
            <WifiOff className="h-12 w-12 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : qrCode ? (
          <img src={qrCode} alt="Attendance QR Code" width={300} height={300} className="border-4 border-primary p-2 rounded-lg"/>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin mb-2" />
            <p>Generating secure QR code...</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-center text-xs text-muted-foreground">
        <p>This QR code is valid for a short time and contains this device's location. It will automatically regenerate every 30 seconds.</p>
      </CardFooter>
    </Card>
  );
};

export default QRCodeGenerator;
