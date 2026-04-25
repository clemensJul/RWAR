import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Droplets, Flame, Mountain, Sun } from 'lucide-react';

const RISK_FEATURES = [
  { icon: Droplets, label: 'Flood Risk',     color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  { icon: Flame,    label: 'Wildfire',        color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
  { icon: Mountain, label: 'Landslide',       color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  { icon: Sun,      label: 'Drought Index',   color: '#eab308', bg: 'rgba(234,179,8,0.10)'  },
];

const QUICK_LOCATIONS = ['Vienna', 'Berlin', 'Munich', 'Zurich', 'Amsterdam'];

interface GeocodingFeature {
  id: string;
  place_name: string;
  center: [number, number];
}

export default function Hero() {
  const navigate   = useNavigate();
  const searchRef  = useRef<HTMLDivElement>(null);
  const [query, setQuery]             = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingFeature[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected]       = useState<GeocodingFeature | null>(null);

  // Debounced geocoding
  useEffect(() => {
    if (query.trim().length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      try {
        const res  = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&types=place,address,poi,region,country`
        );
        const data = await res.json();
        setSuggestions(data.features ?? []);
        setShowDropdown(true);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = (f: GeocodingFeature) => {
    setSelected(f);
    setQuery(f.place_name);
    setShowDropdown(false);
  };

  const goToDashboard = () => {
    navigate('/dashboard', selected ? { state: { flyTo: selected } } : {});
  };

  const quickSearch = (name: string) => {
    setQuery(name);
    setSelected(null);
  };

  return (
    <div
      className="flex flex-col min-h-screen overflow-hidden"
      style={{ background: '#f4f0e8', fontFamily: 'inherit' }}
    >
      {/* ── TOPBAR ── */}
      <header
        className="flex items-center justify-between px-8 flex-shrink-0"
        style={{ height: 58, background: '#faf8f4', borderBottom: '1px solid #e8e0d0' }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/favicon-with-background.svg" alt="RAWR logo" className="w-8 h-8" />
          <span className="font-extrabold text-base tracking-tight" style={{ color: '#1c1a17' }}>RWAR</span>
          <span className="text-[11px] font-medium" style={{ color: '#9c9184' }}>Risk Assessment</span>
        </div>

        <button
          onClick={goToDashboard}
          className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-75"
          style={{ color: '#3d9150' }}
        >
          Open Dashboard
          <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </header>

      {/* ── HERO BODY ── */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">

        {/* Badge */}
        <div
          className="flex items-center gap-2 px-4 py-1.5 mb-8 text-[12px] font-semibold uppercase tracking-[0.1em]"
          style={{ background: '#d6eedb', color: '#2e7340', borderRadius: 99 }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#3d9150' }}
          />
          Property Risk Intelligence
        </div>

        {/* Heading */}
        <h1
          className="text-5xl md:text-6xl font-extrabold text-center mb-5 leading-tight"
          style={{ color: '#1c1a17', letterSpacing: '-0.03em', maxWidth: 720 }}
        >
          Know your property's{' '}
          <span style={{ color: '#3d9150' }}>climate risk</span>
          {' '}before you commit.
        </h1>

        {/* Subheading */}
        <p
          className="text-center text-lg mb-12"
          style={{ color: '#6b6456', maxWidth: 480 }}
        >
          Search any address worldwide and instantly overlay flood, wildfire,
          drought, and landslide risk data on an interactive map.
        </p>

        {/* Search bar */}
        <div ref={searchRef} className="relative w-full" style={{ maxWidth: 560 }}>
          <div
            className="flex items-center gap-3 bg-white"
            style={{
              borderRadius: 18,
              border: '1.5px solid #e8e0d0',
              boxShadow: '0 12px 32px rgba(28,26,23,0.10), 0 4px 8px rgba(28,26,23,0.06)',
              padding: '8px 8px 8px 18px',
            }}
          >
            <Search style={{ width: 16, height: 16, color: '#9c9184', flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null); setShowDropdown(true); }}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              onKeyDown={e => e.key === 'Enter' && goToDashboard()}
              placeholder="Search any address or location…"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: '#1c1a17' }}
            />
            <button
              onClick={goToDashboard}
              className="flex items-center gap-2 text-sm font-semibold text-white transition-opacity hover:opacity-85 flex-shrink-0"
              style={{
                background: '#3d9150', borderRadius: 12,
                padding: '10px 20px',
                boxShadow: '0 4px 12px rgba(61,145,80,0.30)',
              }}
            >
              Assess
              <ArrowRight style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <ul
              className="absolute top-full left-0 right-0 mt-2 bg-white overflow-hidden z-50"
              style={{
                borderRadius: 14, border: '1px solid #e8e0d0',
                boxShadow: '0 8px 24px rgba(28,26,23,0.10)',
              }}
            >
              {suggestions.map(f => (
                <li key={f.id}>
                  <button
                    className="w-full text-left px-5 py-3 text-sm transition-colors hover:bg-[#f4f0e8]"
                    style={{ color: '#1c1a17' }}
                    onMouseDown={() => selectSuggestion(f)}
                  >
                    <span className="font-medium">{f.place_name.split(',')[0]}</span>
                    <span className="text-[11px] block truncate" style={{ color: '#9c9184' }}>
                      {f.place_name.split(',').slice(1).join(',').trim()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {QUICK_LOCATIONS.map(name => (
            <button
              key={name}
              onClick={() => quickSearch(name)}
              className="text-[12px] font-medium px-3.5 py-1.5 transition-colors hover:bg-[#e8e0d0]"
              style={{
                color: '#6b6456', background: '#ede8df',
                borderRadius: 99, border: '1px solid #d4c9b4',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* ── FEATURE STRIP ── */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: '1px solid #e8e0d0', background: 'white', padding: '28px 40px' }}
      >
        <p
          className="text-center text-[11px] font-bold uppercase tracking-[0.12em] mb-6"
          style={{ color: '#9c9184' }}
        >
          Risk layers covered
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {RISK_FEATURES.map(({ icon: Icon, label, color, bg }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 px-4 py-2.5"
              style={{
                background: bg, borderRadius: 12,
                border: `1.5px solid ${color}30`,
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 28, height: 28, borderRadius: 8, background: color }}
              >
                <Icon style={{ width: 14, height: 14, color: 'white' }} />
              </div>
              <span className="text-[13px] font-semibold" style={{ color: '#1c1a17' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Stat row */}
        <div className="flex flex-wrap justify-center gap-8 mt-8">
          {[
            { val: '4',     label: 'Risk Layers'     },
            { val: 'Live',  label: 'Data Updates'    },
            { val: 'Global',label: 'Coverage'        },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-extrabold font-mono" style={{ color: '#1c1a17' }}>{val}</div>
              <div className="text-[11px] font-medium mt-0.5" style={{ color: '#9c9184' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
