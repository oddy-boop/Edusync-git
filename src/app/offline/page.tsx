
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="text-center">
        <WifiOff className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold text-primary">You are currently offline</h1>
        <p className="mt-2 text-muted-foreground">
          It looks like your internet connection is down. Some pages may not be available.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cached pages and offline-ready features will still work. Please check your connection and try again.
        </p>
      </div>
    </div>
  );
}
