
'use client';

import React, { useEffect, useRef } from 'react';
import L, { LatLngExpression, Map } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import marker icons
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

interface LocationMapProps {
  settings: {
    school_latitude?: number | null;
    school_longitude?: number | null;
    check_in_radius_meters?: number | null;
  };
  onLocationSet: (lat: number, lng: number) => void;
}

export default function LocationMap({ settings, onLocationSet }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Initialize the map only once
  useEffect(() => {
    // Configure default icon paths for Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: iconRetinaUrl.src,
        iconUrl: iconUrl.src,
        shadowUrl: shadowUrl.src,
    });

    if (mapRef.current && !mapInstance.current) { // Only initialize if it hasn't been already
      const position: LatLngExpression = [settings.school_latitude || 5.6037, settings.school_longitude || -0.1870];
      
      mapInstance.current = L.map(mapRef.current, {
        center: position,
        zoom: 16,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstance.current);

      mapInstance.current.on('click', (e) => {
        onLocationSet(e.latlng.lat, e.latlng.lng);
      });
    }

    // Cleanup function to remove the map instance when the component unmounts
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [onLocationSet]); // onLocationSet is stable, so this effect runs once

  // Update map view, marker, and circle when settings change
  useEffect(() => {
    if (mapInstance.current && settings.school_latitude && settings.school_longitude) {
      const position: LatLngExpression = [settings.school_latitude, settings.school_longitude];
      const radius = settings.check_in_radius_meters || 100;
      
      // Fly to the new position
      mapInstance.current.flyTo(position, 16);
      
      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng(position);
      } else {
        markerRef.current = L.marker(position).addTo(mapInstance.current);
      }

      // Update or create circle
      if (circleRef.current) {
        circleRef.current.setLatLng(position);
        circleRef.current.setRadius(radius);
      } else {
        circleRef.current = L.circle(position, { 
            radius: radius,
            color: 'hsl(var(--primary))', 
            fillColor: 'hsl(var(--primary))', 
            fillOpacity: 0.2 
        }).addTo(mapInstance.current);
      }
    }
  }, [settings.school_latitude, settings.school_longitude, settings.check_in_radius_meters]);
  
  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}
