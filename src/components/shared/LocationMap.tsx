
'use client';

import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  settings: {
    school_latitude?: number | null;
    school_longitude?: number | null;
    check_in_radius_meters?: number | null;
  };
  onLocationSet: (lat: number, lng: number) => void;
}

function LocationMarker({ onLocationSet }: { onLocationSet: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      onLocationSet(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  return null;
}

export default function LocationMap({ settings, onLocationSet }: LocationMapProps) {
  const position: [number, number] = [settings.school_latitude || 5.6037, settings.school_longitude || -0.1870];

  return (
    <MapContainer center={position} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker onLocationSet={onLocationSet} />
      {settings.school_latitude && settings.school_longitude && (
        <>
          <Marker position={[settings.school_latitude, settings.school_longitude]} />
          <Circle
            center={[settings.school_latitude, settings.school_longitude]}
            radius={settings.check_in_radius_meters || 100}
            pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.2 }}
          />
        </>
      )}
    </MapContainer>
  );
}
