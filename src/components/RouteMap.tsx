import React, { useEffect, useRef } from 'react';

interface Props {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  geometry?: [number, number][];
  className?: string;
}

const RouteMap: React.FC<Props> = ({ origin, destination, geometry, className = '' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (mapRef.current) return;
    if (!mapContainer.current) return;

    const loadLeaflet = async () => {
      if (!window.L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js';
        script.async = true;
        script.onload = initializeMap;
        document.head.appendChild(script);
      } else {
        initializeMap();
      }
    };

    const initializeMap = () => {
      const L = window.L;
      if (!L) return;

      const points: [number, number][] = [];
      if (origin) points.push([origin.lat, origin.lng]);
      if (destination) points.push([destination.lat, destination.lng]);
      if (geometry) points.push(...geometry);
      if (points.length === 0) {
        points.push([18.73, -68.39]);
      }

      const map = L.map(mapContainer.current!).setView(points[0], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      if (geometry && geometry.length > 0) {
        L.polyline(geometry, {
          color: '#C1121F',
          weight: 4,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      if (origin) {
        L.marker([origin.lat, origin.lng], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzEwYjk4MSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTEyIDE2SDE1VjE5SDEzVjE3SDEyWiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(map).bindPopup('📍 Pickup', { closeButton: false });
      }

      if (destination) {
        L.marker([destination.lat, destination.lng], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iI2RiMjcyNyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTEyIDE0SDE3VjE1SDE0VjE3SDE3VjE4SDEyWiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(map).bindPopup('📍 Drop-off', { closeButton: false });
      }

      if (geometry && geometry.length > 1) {
        const latLngs = geometry.map((p) => [p[0], p[1]]);
        map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
      } else if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
      }

      mapRef.current = map;
    };

    loadLeaflet();
  }, [origin, destination, geometry]);

  return (
    <div ref={mapContainer} className={`w-full rounded-xl border-[2.5px] border-ink bg-paper-warm ${className}`} style={{ height: '300px' }} />
  );
};

export default RouteMap;
