
'use client';

import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Marker icon fix for Webpack issue with Leaflet
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: iconRetinaUrl.src,
        iconUrl: iconUrl.src,
        shadowUrl: shadowUrl.src,
    });
}, []);


interface LocationMapProps {
  settings: {
    school_latitude?: number | null;
    school_longitude?: number | null;
    check_in_radius_meters?: number | null;
  };
  onLocationSet: (lat: number, lng: number) => void;
}

// Component to handle map clicks for setting a new location
function MapClickHandler({ onLocationSet }: { onLocationSet: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSet(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to handle updates to the map's view and circle
function MapUpdater({ center, radius }: { center: [number, number], radius: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return <Circle center={center} radius={radius} pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.2 }} />;
}


export default function LocationMap({ settings, onLocationSet }: LocationMapProps) {
  const position: [number, number] = [settings.school_latitude || 5.6037, settings.school_longitude || -0.1870];
  const radius = settings.check_in_radius_meters || 100;

  return (
    <MapContainer center={position} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onLocationSet={onLocationSet} />
      {settings.school_latitude && settings.school_longitude && (
        <>
            <Marker position={[settings.school_latitude, settings.school_longitude]} />
            <MapUpdater center={[settings.school_latitude, settings.school_longitude]} radius={radius} />
        </>
      )}
    </MapContainer>
  );
}
