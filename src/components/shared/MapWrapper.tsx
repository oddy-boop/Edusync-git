
'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const LocationMap = dynamic(() => import('@/components/shared/LocationMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>,
});

interface MapWrapperProps {
  settings: {
    school_latitude?: number | null;
    school_longitude?: number | null;
    check_in_radius_meters?: number | null;
  };
  onLocationSet: (lat: number, lng: number) => void;
}

export default function MapWrapper({ settings, onLocationSet }: MapWrapperProps) {
  // The LocationMap component now handles its own state, so we can render it directly.
  return <LocationMap settings={settings} onLocationSet={onLocationSet} />;
}
