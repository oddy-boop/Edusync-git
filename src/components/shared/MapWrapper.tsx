
'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';

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
  const memoizedMap = useMemo(() => {
    return <LocationMap settings={settings} onLocationSet={onLocationSet} />;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.school_latitude, settings.school_longitude, settings.check_in_radius_meters]);

  return memoizedMap;
}
