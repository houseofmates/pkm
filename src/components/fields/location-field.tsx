
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import L from 'leaflet';

// fix for default marker icon in react leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationFieldProps {
  value: string; // Stored as "lat,lng" or JSON
  onChange: (val: string) => void;
  readOnly?: boolean;
}

function LocationMarker({ position, onChange, readOnly }: { position: L.LatLng | null, onChange: (pos: L.LatLng) => void, readOnly?: boolean }) {
  const map = useMapEvents({
  click(e) {
  if (!readOnly) {
 onChange(e.latlng);
  }
  },
  });

  useEffect(() => {
  if (position) {
  map.flyTo(position, map.getZoom());
  }
  }, [position, map]);

  return position ? <Marker position={position} /> : null;
}

export function LocationField({ value, onChange, readOnly }: LocationFieldProps) {
  // parse value
  const parsePos = (str: string): L.LatLng | null => {
  if (!str) return null;
  try {
  const [lat, lng] = str.split(',').map(Number);
  if (!isNaN(lat) && !isNaN(lng)) return new L.LatLng(lat, lng);
  } catch (e) { console.error(e); }
  return null; // Default null
  };

  const [position, setPosition] = useState<L.LatLng | null>(parsePos(value));

  const handleUpdate = (pos: L.LatLng) => {
  setPosition(pos);
  onChange(`${pos.lat},${pos.lng}`);
  };

  return (
  <div className="w-full h-[200px] rounded-md overflow-hidden border relative group z-0">
  <MapContainer
 center={position || [51.505, -0.09]}
 zoom={13}
 scrollWheelZoom={true}
 style={{ height: '100%', width: '100%' }}
 dragging={true}
  >
 <TileLayer
 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
 />
 <LocationMarker position={position} onChange={handleUpdate} readOnly={readOnly} />
  </MapContainer>

  {/* view button overlay (if we want to open external map) */}
  <div className="absolute bottom-1 right-1 z-[400] opacity-0 group-hover:opacity-100 transition-opacity">
 <Button size="sm" variant="secondary" className="text-xs h-6" onClick={(e) => {
 e.stopPropagation();
 if (position) window.open(`https://www.openstreetmap.org/?mlat=${position.lat}&mlon=${position.lng}#map=15/${position.lat}/${position.lng}`, '_blank');
 }}>
 Open OSM
 </Button>
  </div>
  </div>
  );
}
