import 'mapbox-gl/dist/mapbox-gl.css';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Loader2, Droplets, Mountain, Flame, Sun, CloudLightning, TrendingUp } from 'lucide-react';
import ClimateMap, { type ClimateMapHandle } from '../components/ClimateMap';
import { RISK_LAYERS } from '../data/riskLayers';

interface GeocodingFeature {
    id: string;
    place_name: string;
    center: [number, number];
}

const ICON_MAP = { Droplets, Mountain, Flame, Sun, CloudLightning } as const;

const LEGEND = [
    { label: 'Low', color: '#3d9150', range: '0–25%' },
    { label: 'Medium', color: '#d97706', range: '25–50%' },
    { label: 'High', color: '#f97316', range: '50–75%' },
    { label: 'Extreme', color: '#dc2626', range: '75–100%' },
];

function Dashboard() {
    const [activeLayers, setActiveLayers] = useState<string[]>([]);
    const [loadingLayers, setLoadingLayers] = useState<string[]>([]);
    const [showTrendlines, setShowTrendlines] = useState(false);
    const [searchVal, setSearchVal] = useState('');
    const [suggestions, setSuggestions] = useState<GeocodingFeature[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const mapRef = useRef<ClimateMapHandle>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    // Fly to location passed from the Hero search
    useEffect(() => {
        const state = location.state as { flyTo?: { place_name: string; center: [number, number] } } | null;
        if (!state?.flyTo) return;
        setSearchVal(state.flyTo.place_name);
        // Wait for map to initialise before flying
        const timer = setTimeout(() => {
            mapRef.current?.flyTo(state.flyTo!.center[0], state.flyTo!.center[1]);
        }, 800);
        return () => clearTimeout(timer);
    }, [location.state]);

    // Debounced Mapbox geocoding
    useEffect(() => {
        if (searchVal.trim().length < 2) { setSuggestions([]); return; }
        const timer = setTimeout(async () => {
            const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            try {
                const res = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchVal)}.json?access_token=${token}&limit=5&types=place,address,poi,region,country`
                );
                const data = await res.json();
                setSuggestions(data.features ?? []);
                setShowDropdown(true);
            } catch { /* silently ignore */ }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchVal]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectSuggestion = (feature: GeocodingFeature) => {
        mapRef.current?.flyTo(feature.center[0], feature.center[1]);
        setSearchVal(feature.place_name);
        setShowDropdown(false);
        setSuggestions([]);
    };

    const toggleLayer = useCallback((id: string) => {
        setActiveLayers(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }, []);

    const handleLoadingChange = useCallback((layerId: string, loading: boolean) => {
        setLoadingLayers(prev =>
            loading ? [...prev, layerId] : prev.filter(id => id !== layerId)
        );
    }, []);

    return (
        <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#f4f0e8' }}>

            {/* ── TOPBAR ── */}
            <header
                className="flex items-center gap-4 px-5 flex-shrink-0 z-10 bg-white"
                style={{ height: 58, borderBottom: '1px solid #e8e0d0' }}
            >
                {/* Logo */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div
                        className="w-8 h-8 flex items-center justify-center"
                        style={{ borderRadius: 10, background: '#3d9150' }}
                    >
                        <img src='/favicon-with-background.svg' alt="Icon description" width="50" height="50" />
                    </div>
                    <span className="font-extrabold text-base tracking-tight" style={{ color: '#1c1a17' }}>
                        RWAR
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: '#9c9184' }}>
                        Risk Assessment
                    </span>
                </div>

                {/* Search */}
                <div ref={searchRef} className="relative flex-1 max-w-sm">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                        style={{ width: 14, height: 14, color: '#9c9184' }}
                    />
                    <input
                        value={searchVal}
                        onChange={e => { setSearchVal(e.target.value); setShowDropdown(true); }}
                        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                        placeholder="Search any location…"
                        className="w-full text-sm outline-none"
                        style={{
                            paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                            background: '#f4f0e8', border: '1.5px solid #e8e0d0',
                            borderRadius: 12, color: '#1c1a17',
                        }}
                    />
                    {showDropdown && suggestions.length > 0 && (
                        <ul
                            className="absolute top-full left-0 right-0 mt-1 bg-white overflow-hidden z-50"
                            style={{
                                borderRadius: 12, border: '1px solid #e8e0d0',
                                boxShadow: '0 8px 24px rgba(28,26,23,0.10)',
                            }}
                        >
                            {suggestions.map(feature => (
                                <li key={feature.id}>
                                    <button
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f4f0e8] transition-colors"
                                        style={{ color: '#1c1a17' }}
                                        onMouseDown={() => selectSuggestion(feature)}
                                    >
                                        <span className="font-medium">{feature.place_name.split(',')[0]}</span>
                                        <span className="text-[11px] block truncate" style={{ color: '#9c9184' }}>
                                            {feature.place_name.split(',').slice(1).join(',').trim()}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Stats */}
                <div className="flex gap-1 ml-auto">
                    {[
                        { val: activeLayers.length, label: 'Layers Active' },
                        { val: RISK_LAYERS.length, label: 'Available' },
                    ].map(s => (
                        <div
                            key={s.label}
                            className="text-center"
                            style={{ padding: '6px 14px', background: '#f4f0e8', borderRadius: 10 }}
                        >
                            <div className="text-base font-bold font-mono" style={{ color: '#1c1a17' }}>{s.val}</div>
                            <div className="text-[10px] font-medium" style={{ color: '#9c9184' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Avatar */}
                <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                        width: 34, height: 34, borderRadius: 99,
                        background: '#d6eedb', border: '2px solid #a8d8b0',
                    }}
                >
                    <span className="text-[13px] font-bold" style={{ color: '#2e7340' }}>JD</span>
                </div>
            </header>

            {/* ── BODY ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── LEFT PANEL ── */}
                <aside
                    className="flex flex-col flex-shrink-0 bg-white"
                    style={{ width: 240, borderRight: '1px solid #e8e0d0' }}
                >
                    <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #f4f0e8' }}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: '#9c9184' }}>
                            Risk Layers
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1">
                        {RISK_LAYERS.map(layer => {
                            const isActive = activeLayers.includes(layer.id);
                            const isLoading = loadingLayers.includes(layer.id);
                            const Icon = ICON_MAP[layer.icon as keyof typeof ICON_MAP];

                            return (
                                <button
                                    key={layer.id}
                                    onClick={() => toggleLayer(layer.id)}
                                    className="flex items-center gap-2.5 w-full cursor-pointer transition-all"
                                    style={{
                                        padding: '10px 12px',
                                        background: isActive ? `${layer.colors[1]}28` : 'transparent',
                                        border: isActive ? `1.5px solid ${layer.colors[2]}44` : '1.5px solid transparent',
                                        borderRadius: 12,
                                    }}
                                >
                                    <span
                                        className="flex items-center justify-center flex-shrink-0 transition-all"
                                        style={{
                                            width: 32, height: 32, borderRadius: 9,
                                            background: isActive ? layer.colors[2] : '#e8e0d0',
                                        }}
                                    >
                                        <Icon
                                            style={{ width: 15, height: 15, color: isActive ? 'white' : '#9c9184' }}
                                        />
                                    </span>
                                    <span
                                        className="flex-1 text-left text-[13px] font-medium"
                                        style={{ color: isActive ? '#1c1a17' : '#6b6456' }}
                                    >
                                        {layer.name}
                                    </span>
                                    {isLoading ? (
                                        <Loader2
                                            className="animate-spin flex-shrink-0"
                                            style={{ width: 16, height: 16, color: '#3d9150' }}
                                        />
                                    ) : (
                                        <span
                                            className="relative flex items-center flex-shrink-0 transition-colors"
                                            style={{
                                                width: 36, height: 20, borderRadius: 99,
                                                background: isActive ? '#3d9150' : '#d4c9b4',
                                            }}
                                        >
                                            <span
                                                className="absolute rounded-full bg-white transition-all"
                                                style={{
                                                    width: 14, height: 14,
                                                    left: isActive ? 18 : 3,
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                                                }}
                                            />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Trendlines toggle */}
                    <div style={{ padding: '10px 14px', borderTop: '1px solid #f4f0e8' }}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: '#9c9184' }}>
                            Overlays
                        </p>
                        <button
                            onClick={() => setShowTrendlines(v => !v)}
                            className="flex items-center gap-2.5 w-full cursor-pointer transition-all"
                            style={{
                                padding: '10px 12px',
                                background: showTrendlines ? '#dcfce728' : 'transparent',
                                border: showTrendlines ? '1.5px solid #16a34a44' : '1.5px solid transparent',
                                borderRadius: 12,
                            }}
                        >
                            <span
                                className="flex items-center justify-center flex-shrink-0"
                                style={{
                                    width: 32, height: 32, borderRadius: 9,
                                    background: showTrendlines ? '#16a34a' : '#e8e0d0',
                                }}
                            >
                                <TrendingUp style={{ width: 15, height: 15, color: showTrendlines ? 'white' : '#9c9184' }} />
                            </span>
                            <span className="flex-1 text-left" style={{ color: showTrendlines ? '#1c1a17' : '#6b6456' }}>
                                <span className="text-[13px] font-medium block">Trendlines</span>
                                <span className="text-[10px]" style={{ color: '#9c9184' }}>Show risk trend direction</span>
                            </span>
                            <span
                                className="relative flex items-center flex-shrink-0 transition-colors"
                                style={{
                                    width: 36, height: 20, borderRadius: 99,
                                    background: showTrendlines ? '#3d9150' : '#d4c9b4',
                                }}
                            >
                                <span
                                    className="absolute rounded-full bg-white transition-all"
                                    style={{
                                        width: 14, height: 14,
                                        left: showTrendlines ? 18 : 3,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                                    }}
                                />
                            </span>
                        </button>
                    </div>

                    {/* Legend */}
                    <div style={{ padding: '12px 14px', borderTop: '1px solid #f4f0e8', background: '#faf8f4' }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: '#9c9184' }}>
                            Risk Scale
                        </p>
                        <div className="flex flex-col gap-1.5">
                            {LEGEND.map(({ label, color, range }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <div className="flex-shrink-0" style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                                    <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
                                    <span className="text-[10px] font-mono ml-auto" style={{ color: '#9c9184' }}>{range}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* ── MAP AREA ── */}
                <div className="flex-1 relative overflow-hidden">
                    <ClimateMap
                        ref={mapRef}
                        activeLayers={activeLayers}
                        onLoadingChange={handleLoadingChange}
                        showTrendlines={showTrendlines}
                    />

                    {/* Active layer chips */}
                    {activeLayers.length > 0 && (
                        <div className="absolute bottom-5 left-4 flex flex-wrap gap-1.5 max-w-[480px] pointer-events-none">
                            {activeLayers.map(id => {
                                const layer = RISK_LAYERS.find(l => l.id === id);
                                if (!layer) return null;
                                return (
                                    <div
                                        key={id}
                                        className="flex items-center gap-1.5 bg-white text-[11px] font-semibold"
                                        style={{
                                            padding: '5px 10px', borderRadius: 99,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                                            border: `1.5px solid ${layer.colors[2]}44`,
                                            color: '#1c1a17',
                                        }}
                                    >
                                        <span
                                            className="rounded-full"
                                            style={{ width: 7, height: 7, background: layer.colors[2] }}
                                        />
                                        {layer.name}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Hint */}
                    {activeLayers.length === 0 && (
                        <div
                            className="absolute top-4 right-4 text-[11px] font-medium"
                            style={{
                                background: 'white', borderRadius: 14,
                                padding: '9px 14px', color: '#9c9184',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: '1px solid #e8e0d0',
                            }}
                        >
                            Toggle a layer to see climate risk data
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default Dashboard;
