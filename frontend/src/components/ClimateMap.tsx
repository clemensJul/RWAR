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
    'fill-opacity': [
      'interpolate', ['linear'], ['get', 'risk_level'],
      0, 0.18, 0.1, 0.35, 1.0, 0.65,
    ],
    'fill-outline-color': 'rgba(0,0,0,0.04)',
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
  const [purchaseState, setPurchaseState] = useState<'idle' | 'success'>('idle');

  const loadedRef        = useRef<Set<string>>(new Set());
  const retryRef         = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const polygonBboxRef   = useRef<string | null>(null);
  // Always-current references so draw event callbacks never see stale closures
  const activeLayersRef  = useRef<string[]>(activeLayers);
  const fetchLayerRef    = useRef<(id: string) => void>(() => {});

  useImperativeHandle(ref, () => ({
    flyTo: (longitude, latitude, zoom = 13) => {
      mapRef.current?.flyTo({ center: [longitude, latitude], zoom, duration: 1400 });
    },
  }));

  const fetchLayerData = useCallback(async (layerId: string) => {
    if (!polygonBboxRef.current) return;
    const layer = RISK_LAYERS.find(l => l.id === layerId);
    if (!layer) return;

    onLoadingChange(layerId, true);
    try {
      const res  = await fetch(`${API_BASE}/api/risk-data?type=${layer.apiType}&bbox=${polygonBboxRef.current}`);
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
  }, [onLoadingChange]);

  useEffect(() => { activeLayersRef.current = activeLayers;   }, [activeLayers]);
  useEffect(() => { fetchLayerRef.current   = fetchLayerData; }, [fetchLayerData]);

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

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      styles: [
        // filled polygon
        { id: 'gl-draw-polygon-fill', type: 'fill', filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.15 } },
        // polygon outline while drawing
        { id: 'gl-draw-polygon-stroke-active', type: 'line', filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [2, 1] } },
        // completed polygon outline
        { id: 'gl-draw-polygon-stroke-static', type: 'line', filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#3b82f6', 'line-width': 2 } },
        // midpoints
        { id: 'gl-draw-polygon-midpoint', type: 'circle', filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: { 'circle-radius': 4, 'circle-color': '#93c5fd' } },
        // vertex points
        { id: 'gl-draw-polygon-and-line-vertex-active', type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['!=', 'mode', 'static']],
          paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-color': '#3b82f6', 'circle-stroke-width': 2 } },
      ],
    });
    drawRef.current = draw;
    map.addControl(draw);

    function updateArea() {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const area = turf.area(data);
        setRoundedArea(Math.round(area * 100) / 100);

        // Compute tight bbox from the drawn polygon coordinates only
        const coords = data.features.flatMap(f => {
          const geom = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
          if (geom.type === 'Polygon') return geom.coordinates.flat();
          if (geom.type === 'MultiPolygon') return geom.coordinates.flat(2);
          return [];
        });
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        polygonBboxRef.current = [
          Math.min(...lngs).toFixed(4),
          Math.min(...lats).toFixed(4),
          Math.max(...lngs).toFixed(4),
          Math.max(...lats).toFixed(4),
        ].join(',');

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
        setLayerData({});
        setPurchaseState('idle');
        polygonBboxRef.current = null;
        loadedRef.current.clear();
        return;
      }

      // Use live refs so this callback always sees the current layers,
      // even if activeLayers changed since handleLoad first ran.
      loadedRef.current.clear();
      activeLayersRef.current.forEach(id => fetchLayerRef.current(id));
    }

    map.on('draw.create', updateArea);
    map.on('draw.delete', updateArea);
    map.on('draw.update', updateArea);
  }, []);

  const handleMapClick = useCallback((event: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
    const features = event.features;
    if (!features?.length) { setPopup(null); return; }
    setPopup({
      lng:        event.lngLat.lng,
      lat:        event.lngLat.lat,
      properties: features[0].properties as RiskProperties,
    });
  }, []);

  const activeLayerFillIds = useMemo(
    () => drawnPolygon ? activeLayers.map(id => `${id}-fill`) : [],
    [activeLayers, drawnPolygon],
  );

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
        mapStyle="mapbox://styles/mapbox/outdoors-v12" //mapbox://styles/mapbox/light-v11
        interactiveLayerIds={activeLayerFillIds}
        onClick={handleMapClick}
        onLoad={handleLoad}
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

      {roundedArea == null ? (
        <div style={{
          position: 'absolute', bottom: 40, left: 10, zIndex: 10,
          background: 'rgba(250,248,244,0.92)', borderRadius: 10,
          padding: '10px 14px', minWidth: 150, textAlign: 'center',
          border: '1px solid #e8e0d0', boxShadow: '0 2px 8px rgba(28,26,23,0.08)',
          fontSize: 12, color: '#1c1a17',
        }}>
          <p style={{ margin: 0 }}>Draw a polygon on the map.</p>
        </div>
      ) : (
        <div style={{
          position: 'absolute', bottom: 40, left: 10, zIndex: 10,
          background: '#fff', borderRadius: 14,
          padding: '16px 18px', minWidth: 220,
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.13)',
          fontFamily: 'inherit',
        }}>
          {purchaseState === 'success' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>✅</div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#15803d' }}>Purchase Successful!</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                Your climate zone license has been activated.
              </p>
              <p style={{ margin: '2px 0 10px', fontSize: 11, color: '#94a3b8' }}>
                Order confirmation sent to your email.
              </p>
              <button
                onClick={() => {
                  const draw = drawRef.current;
                  if (draw) draw.deleteAll();
                  setRoundedArea(null);
                  setDrawnPolygon(null);
                  setPurchaseState('idle');
                  polygonBboxRef.current = null;
                  loadedRef.current.clear();
                  activeLayersRef.current.forEach(id => fetchLayerRef.current(id));
                }}
                style={{
                  width: '100%', padding: '7px 0', borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  color: '#475569', fontSize: 12, cursor: 'pointer',
                }}
              >
                Clear &amp; Draw New Zone
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>🗺️</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Zone Selected</span>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                  <span>Area</span>
                  <span>{roundedArea >= 10000
                    ? `${(roundedArea / 10000).toFixed(2)} ha`
                    : `${Math.round(roundedArea).toLocaleString()} m²`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                  <span>Coverage</span>
                  <span>{(roundedArea / 1_000_000).toFixed(4)} km²</span>
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 12,
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Zone License
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: '#fff' }}>
                    {formatPrice(roundedArea)}
                  </p>
                </div>
                <span style={{ fontSize: 28 }}>🏷️</span>
              </div>

              <p style={{ margin: '0 0 10px', fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                Includes climate risk data access, satellite imagery, and trend analysis for the selected zone.
              </p>

              <button
                onClick={() => setPurchaseState('success')}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 9,
                  border: 'none',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '0.01em',
                  boxShadow: '0 2px 8px rgba(22,163,74,0.35)',
                }}
              >
                Buy Zone License
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

function formatPrice(areaM2: number): string {
  const hectares = areaM2 / 10000;
  const price = Math.max(9.99, Math.ceil(hectares) * 12.99);
  return `€${price.toFixed(2)}`;
}

function riskColor(level: number): string {
  if (level < 0.25) return '#22c55e';
  if (level < 0.5)  return '#eab308';
  if (level < 0.75) return '#f97316';
  return '#ef4444';
}

export default ClimateMap;
