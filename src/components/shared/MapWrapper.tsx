
'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

const LocationMap = dynamic(() => import('@/components/shared/LocationMap'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-muted flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>,
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
  // useMemo ensures that the dynamically imported component is not re-rendered
  // unless its props actually change, preventing unnecessary map re-initializations.
  const memoizedMap = useMemo(() => {
    return <LocationMap settings={settings} onLocationSet={onLocationSet} />;
  }, [settings, onLocationSet]);

  return memoizedMap;
}
