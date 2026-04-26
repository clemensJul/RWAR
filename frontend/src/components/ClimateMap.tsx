import { useEffect, useState, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import Map, { Source, Layer, Popup, type MapRef } from 'react-map-gl/mapbox';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { RISK_LAYERS } from '../data/riskLayers';

const API_BASE = 'http://localhost:5001';

interface RiskProperties {
  risk_level: number;
  risk_category: string;
  risk_type: string;
  trend: number;
}

interface PopupInfo {
  lng: number;
  lat: number;
  properties: RiskProperties;
}

export interface ClimateMapHandle {
  flyTo: (longitude: number, latitude: number, zoom?: number) => void;
}

interface ClimateMapProps {
  activeLayers: string[];
  onLoadingChange: (layerId: string, loading: boolean) => void;
  showTrendlines: boolean;
}

function buildFillPaint(colors: [string, string, string, string]) {
  return {
    'fill-color': [
      'interpolate', ['linear'], ['get', 'risk_level'],
      0, colors[0], 0.33, colors[1], 0.66, colors[2], 1.0, colors[3],
    ],
    'fill-opacity': 0.65,
    'fill-outline-color': 'rgba(0,0,0,0.08)',
  } as mapboxgl.FillPaint;
}

function buildTrendPaint(): mapboxgl.FillPaint {
  return {
    'fill-color': [
      'interpolate', ['linear'], ['get', 'trend'],
      -1, '#16a34a',
      0,  'rgba(255,255,255,0)',
      1,  '#dc2626',
    ],
    'fill-opacity': 0.45,
  } as mapboxgl.FillPaint;
}

const ClimateMap = forwardRef<ClimateMapHandle, ClimateMapProps>(
function ClimateMap({ activeLayers, onLoadingChange, showTrendlines }, ref) {
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const mapRef  = useRef<MapRef>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [layerData, setLayerData] = useState<Record<string, GeoJSON.FeatureCollection>>({});
  const [popup, setPopup]         = useState<PopupInfo | null>(null);
  const [roundedArea, setRoundedArea]   = useState<number | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null>(null);

  const loadedRef      = useRef<Set<string>>(new Set());
  const retryRef       = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const polygonBboxRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (longitude, latitude, zoom = 13) => {
      mapRef.current?.flyTo({ center: [longitude, latitude], zoom, duration: 1400 });
    },
  }));

  const currentBbox = useCallback((): string => {
    if (polygonBboxRef.current) return polygonBboxRef.current;
    const b = mapRef.current?.getMap()?.getBounds();
    if (b) return `${b.getWest().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getNorth().toFixed(4)}`;
    return '16.18,48.12,16.58,48.32';
  }, []);

  const fetchLayerData = useCallback(async (layerId: string) => {
    const layer = RISK_LAYERS.find(l => l.id === layerId);
    if (!layer) return;

    onLoadingChange(layerId, true);
    try {
      const res  = await fetch(`${API_BASE}/api/risk-data?type=${layer.apiType}&bbox=${currentBbox()}`);
      const data = await res.json() as GeoJSON.FeatureCollection & { status?: string };

      if (data.status === 'loading') {
        clearTimeout(retryRef.current[layerId]);
        retryRef.current[layerId] = setTimeout(() => fetchLayerData(layerId), 20_000);
        return;
      }

      clearTimeout(retryRef.current[layerId]);
      setLayerData(prev => ({ ...prev, [layerId]: data }));
      loadedRef.current.add(layerId);
    } catch (err) {
      console.error(`Failed to fetch ${layerId} data:`, err);
    } finally {
      if (loadedRef.current.has(layerId) || !retryRef.current[layerId]) {
        onLoadingChange(layerId, false);
      }
    }
  }, [onLoadingChange, currentBbox]);

  useEffect(() => {
    activeLayers.forEach(id => { if (!loadedRef.current.has(id)) fetchLayerData(id); });
    loadedRef.current.forEach(id => {
      if (!activeLayers.includes(id)) {
        loadedRef.current.delete(id);
        clearTimeout(retryRef.current[id]);
        delete retryRef.current[id];
      }
    });
  }, [activeLayers, fetchLayerData]);

  const handleMoveEnd = useCallback(() => {
    if (polygonBboxRef.current) return;
    activeLayers.forEach(id => fetchLayerData(id));
  }, [activeLayers, fetchLayerData]);

  const handleLoad = useCallback(() => {
    activeLayers.forEach(id => fetchLayerData(id));

    const map = mapRef.current?.getMap();
    if (!map) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    drawRef.current = draw;
    map.addControl(draw);

    function updateArea() {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const area = turf.area(data);
        setRoundedArea(Math.round(area * 100) / 100);

        // Derive bbox from all polygon coordinates
        const coords = data.features.flatMap(f => {
          const geom = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
          if (geom.type === 'Polygon') return geom.coordinates.flat();
          if (geom.type === 'MultiPolygon') return geom.coordinates.flat(2);
          return [];
        });
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        const minLng = Math.min(...lngs).toFixed(4);
        const minLat = Math.min(...lats).toFixed(4);
        const maxLng = Math.max(...lngs).toFixed(4);
        const maxLat = Math.max(...lats).toFixed(4);
        polygonBboxRef.current = `${minLng},${minLat},${maxLng},${maxLat}`;

        // Union all drawn features into one polygon for intersection filtering
        const merged = data.features.reduce<GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null>(
          (acc, f) => {
            const feat = f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
            return acc ? turf.union(turf.featureCollection([acc, feat])) as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> : feat;
          },
          null,
        );
        setDrawnPolygon(merged);
      } else {
        setRoundedArea(null);
        setDrawnPolygon(null);
        polygonBboxRef.current = null;
      }

      loadedRef.current.clear();
      activeLayers.forEach(id => fetchLayerData(id));
    }

    map.on('draw.create', updateArea);
    map.on('draw.delete', updateArea);
    map.on('draw.update', updateArea);
  }, [activeLayers, fetchLayerData]);

  const handleMapClick = useCallback((event: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
    const features = event.features;
    if (!features?.length) { setPopup(null); return; }
    setPopup({
      lng:        event.lngLat.lng,
      lat:        event.lngLat.lat,
      properties: features[0].properties as RiskProperties,
    });
  }, []);

  const activeLayerFillIds = useMemo(() => activeLayers.map(id => `${id}-fill`), [activeLayers]);

  const filteredLayerData = useMemo(() => {
    if (!drawnPolygon) return layerData;
    const result: Record<string, GeoJSON.FeatureCollection> = {};
    for (const [id, fc] of Object.entries(layerData)) {
      result[id] = {
        ...fc,
        features: fc.features.filter(f => {
          try { return turf.booleanIntersects(f, drawnPolygon); }
          catch { return false; }
        }),
      };
    }
    return result;
  }, [layerData, drawnPolygon]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: 16.3738, latitude: 48.2082, zoom: 11 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        interactiveLayerIds={activeLayerFillIds}
        onClick={handleMapClick}
        onLoad={handleLoad}
        onMoveEnd={handleMoveEnd}
      >
        {RISK_LAYERS.filter(l => activeLayers.includes(l.id)).map(layer => {
          const data = filteredLayerData[layer.id];
          if (!data) return null;
          return (
            <Source key={layer.id} id={layer.id} type="geojson" data={data}>
              <Layer id={`${layer.id}-fill`} type="fill" paint={buildFillPaint(layer.colors)} />
              {showTrendlines && (
                <Layer id={`${layer.id}-trend`} type="fill" paint={buildTrendPaint()} />
              )}
            </Source>
          );
        })}

        {popup && (
          <Popup longitude={popup.lng} latitude={popup.lat}
            onClose={() => setPopup(null)} closeOnClick={false} anchor="bottom">
            <div className="p-1 min-w-[160px]">
              <p className="font-semibold text-slate-800 capitalize text-sm">
                {popup.properties.risk_type.replace('_', ' ')} Risk
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: riskColor(popup.properties.risk_level) }} />
                <span className="text-sm text-slate-700">{popup.properties.risk_category}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {Math.round(popup.properties.risk_level * 100)}%
                </span>
              </div>
              {popup.properties.trend != null && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: popup.properties.trend > 0.1 ? '#dc2626' : popup.properties.trend < -0.1 ? '#16a34a' : '#9c9184' }}
                  >
                    {popup.properties.trend > 0.1 ? '▲ Worsening' : popup.properties.trend < -0.1 ? '▼ Improving' : '→ Stable'}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {popup.properties.trend > 0 ? '+' : ''}{Math.round(popup.properties.trend * 100)}%/yr
                  </span>
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>

      <div
        style={{
          position: 'absolute', bottom: 40, left: 10, zIndex: 10,
          background: 'rgba(250,248,244,0.92)', borderRadius: 10,
          padding: '10px 14px', minWidth: 150, textAlign: 'center',
          border: '1px solid #e8e0d0', boxShadow: '0 2px 8px rgba(28,26,23,0.08)',
          fontSize: 12, color: '#1c1a17',
        }}
      >
        <p style={{ margin: 0 }}>Draw a polygon on the map.</p>
        {roundedArea != null && (
          <div style={{ marginTop: 6 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{roundedArea.toLocaleString()}</p>
            <p style={{ margin: 0, color: '#9c9184' }}>square meters</p>
          </div>
        )}
      </div>
    </div>
  );
});

function riskColor(level: number): string {
  if (level < 0.25) return '#22c55e';
  if (level < 0.5)  return '#eab308';
  if (level < 0.75) return '#f97316';
  return '#ef4444';
}

export default ClimateMap;
