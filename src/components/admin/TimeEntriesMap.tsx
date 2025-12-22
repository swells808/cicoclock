import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TimeEntryProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface TimeEntry {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_address: string | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_out_address: string | null;
  profiles: TimeEntryProfile | null;
}

interface TimeEntriesMapProps {
  entries: TimeEntry[];
  selectedDate: Date;
}

const MAPBOX_TOKEN_KEY = 'mapbox_public_token';

export const TimeEntriesMap: React.FC<TimeEntriesMapProps> = ({ entries, selectedDate }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>(() => {
    return localStorage.getItem(MAPBOX_TOKEN_KEY) || '';
  });
  const [tokenInput, setTokenInput] = useState('');
  const [mapError, setMapError] = useState<string | null>(null);

  const entriesWithLocation = entries.filter(
    e => (e.clock_in_latitude && e.clock_in_longitude) || 
         (e.clock_out_latitude && e.clock_out_longitude)
  );

  const getEmployeeName = (entry: TimeEntry) => {
    if (!entry.profiles) return "Unknown";
    if (entry.profiles.display_name) return entry.profiles.display_name;
    if (entry.profiles.first_name || entry.profiles.last_name) {
      return `${entry.profiles.first_name || ""} ${entry.profiles.last_name || ""}`.trim();
    }
    return entry.profiles.email || "Unknown";
  };

  const saveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem(MAPBOX_TOKEN_KEY, tokenInput.trim());
      setMapboxToken(tokenInput.trim());
      setMapError(null);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      // Calculate bounds from entries
      let bounds: mapboxgl.LngLatBounds | null = null;
      
      entriesWithLocation.forEach(entry => {
        if (entry.clock_in_latitude && entry.clock_in_longitude) {
          if (!bounds) {
            bounds = new mapboxgl.LngLatBounds(
              [entry.clock_in_longitude, entry.clock_in_latitude],
              [entry.clock_in_longitude, entry.clock_in_latitude]
            );
          } else {
            bounds.extend([entry.clock_in_longitude, entry.clock_in_latitude]);
          }
        }
        if (entry.clock_out_latitude && entry.clock_out_longitude) {
          if (!bounds) {
            bounds = new mapboxgl.LngLatBounds(
              [entry.clock_out_longitude, entry.clock_out_latitude],
              [entry.clock_out_longitude, entry.clock_out_latitude]
            );
          } else {
            bounds.extend([entry.clock_out_longitude, entry.clock_out_latitude]);
          }
        }
      });

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        zoom: 12,
        center: bounds ? bounds.getCenter() : [-98.5795, 39.8283], // Default to US center
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        if (bounds && map.current) {
          map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
        }
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Invalid Mapbox token or map error. Please check your token.');
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to initialize map. Please check your Mapbox token.');
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Add markers when map is ready
  useEffect(() => {
    if (!map.current || !mapboxToken) return;

    const addMarkers = () => {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      entriesWithLocation.forEach(entry => {
        const name = getEmployeeName(entry);
        
        // Clock in marker (green)
        if (entry.clock_in_latitude && entry.clock_in_longitude) {
          const clockInEl = document.createElement('div');
          clockInEl.className = 'clock-in-marker';
          clockInEl.style.cssText = `
            width: 24px;
            height: 24px;
            background: #22c55e;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          `;

          const clockInPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px; min-width: 150px;">
              <strong style="color: #22c55e;">● Clock In</strong>
              <p style="margin: 4px 0 0 0; font-weight: 600;">${name}</p>
              <p style="margin: 2px 0; color: #666; font-size: 12px;">${format(new Date(entry.start_time), 'h:mm a')}</p>
              ${entry.clock_in_address ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">${entry.clock_in_address}</p>` : ''}
            </div>
          `);

          const marker = new mapboxgl.Marker(clockInEl)
            .setLngLat([entry.clock_in_longitude, entry.clock_in_latitude])
            .setPopup(clockInPopup)
            .addTo(map.current!);
          
          markersRef.current.push(marker);
        }

        // Clock out marker (red)
        if (entry.clock_out_latitude && entry.clock_out_longitude && entry.end_time) {
          const clockOutEl = document.createElement('div');
          clockOutEl.className = 'clock-out-marker';
          clockOutEl.style.cssText = `
            width: 24px;
            height: 24px;
            background: #ef4444;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          `;

          const clockOutPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px; min-width: 150px;">
              <strong style="color: #ef4444;">● Clock Out</strong>
              <p style="margin: 4px 0 0 0; font-weight: 600;">${name}</p>
              <p style="margin: 2px 0; color: #666; font-size: 12px;">${format(new Date(entry.end_time), 'h:mm a')}</p>
              ${entry.clock_out_address ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">${entry.clock_out_address}</p>` : ''}
            </div>
          `);

          const marker = new mapboxgl.Marker(clockOutEl)
            .setLngLat([entry.clock_out_longitude, entry.clock_out_latitude])
            .setPopup(clockOutPopup)
            .addTo(map.current!);
          
          markersRef.current.push(marker);
        }
      });
    };

    if (map.current.loaded()) {
      addMarkers();
    } else {
      map.current.on('load', addMarkers);
    }
  }, [entries, mapboxToken]);

  if (!mapboxToken) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Key className="h-5 w-5" />
              <h3 className="font-medium text-foreground">Mapbox Token Required</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              To view the map, please enter your Mapbox public token. You can find it at{' '}
              <a 
                href="https://mapbox.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>{' '}
              in the Tokens section of your dashboard.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
              <div className="flex gap-2">
                <Input
                  id="mapbox-token"
                  type="text"
                  placeholder="pk.eyJ1Ijoi..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <Button onClick={saveToken} disabled={!tokenInput.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mapError) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{mapError}</AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.removeItem(MAPBOX_TOKEN_KEY);
              setMapboxToken('');
              setMapError(null);
            }}
          >
            Reset Token
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (entriesWithLocation.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No entries with location data for {format(selectedDate, 'MMMM do, yyyy')}.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          <div ref={mapContainer} className="h-[500px] w-full" />
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
            <p className="text-xs font-medium text-foreground mb-2">Legend</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Clock In</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Clock Out</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {entriesWithLocation.length} {entriesWithLocation.length === 1 ? 'entry' : 'entries'} with location
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
