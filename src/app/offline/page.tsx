"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function OfflinePage() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", checkOnline);
    window.addEventListener("offline", checkOnline);
    checkOnline();
    return () => {
      window.removeEventListener("online", checkOnline);
      window.removeEventListener("offline", checkOnline);
    };
  }, []);

  const handleReload = async () => {
    setIsChecking(true);
    try {
      const response = await fetch("/api/health-check");
      if (response.ok) {
        window.location.reload();
      } else {
        toast({
          title: "Still Offline",
          description:
            "Could not establish a connection. Please check your internet.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Connection Failed",
        description:
          "Unable to reconnect. Please check your internet connection.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 text-center">
      {isOnline ? (
        <Wifi className="mx-auto h-16 w-16 text-green-500" />
      ) : (
        <WifiOff className="mx-auto h-16 w-16 text-muted-foreground" />
      )}
      <h1 className="mt-4 text-2xl font-semibold text-primary">
        {isOnline ? "Connection Restored" : "You Are Offline"}
      </h1>
      <p className="mt-2 text-muted-foreground max-w-md">
        {isOnline
          ? "Your internet connection has been restored. You can now reload the page to continue."
          : "It seems there's no internet connection. The page you are trying to access has not been saved for offline use."}
      </p>
      <p className="mt-1 text-sm text-muted-foreground max-w-md">
        {isOnline
          ? "Click the button below to reload and access the latest content."
          : "Please check your connection or try returning to a page you've previously visited."}
      </p>
      <Button onClick={handleReload} className="mt-6" disabled={isChecking}>
        {isChecking ? (
          <>
            <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> Checking
            Connection...
          </>
        ) : (
          <>Try Reloading Page</>
        )}
      </Button>
    </div>
  );
}
