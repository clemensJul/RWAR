import { Droplets, Mountain, Flame, Sun, Loader2 } from 'lucide-react';
import { RISK_LAYERS } from '../data/riskLayers';

const ICONS = {
  Droplets,
  Mountain,
  Flame,
  Sun,
} as const;

interface LayerPanelProps {
  activeLayers: string[];
  loadingLayers: string[];
  onToggle: (layerId: string) => void;
}

export function LayerPanel({ activeLayers, loadingLayers, onToggle }: LayerPanelProps) {
  return (
    <div className="absolute top-4 right-4 z-10 w-64 rounded-xl shadow-2xl overflow-hidden border border-white/20">
      <div className="px-4 py-3 bg-slate-900/95 backdrop-blur-md">
        <p className="text-white text-sm font-semibold">Climate Risk Layers</p>
        <p className="text-slate-400 text-xs mt-0.5">Click a layer to toggle it on/off</p>
      </div>

      <div className="divide-y divide-slate-100 bg-white/95 backdrop-blur-md">
        {RISK_LAYERS.map(layer => {
          const isActive = activeLayers.includes(layer.id);
          const isLoading = loadingLayers.includes(layer.id);
          const Icon = ICONS[layer.icon as keyof typeof ICONS];

          return (
            <button
              key={layer.id}
              onClick={() => onToggle(layer.id)}
              className={`w-full text-left p-3 transition-colors cursor-pointer ${
                isActive ? 'bg-green-50' : 'hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                    isActive ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isActive ? 'text-green-800' : 'text-slate-600'}`}>
                    {layer.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate leading-tight mt-0.5">
                    {layer.description}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 text-green-500 animate-spin" />
                  ) : (
                    <div
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        isActive ? 'bg-green-600' : 'bg-slate-200'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          isActive ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {isActive && (
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 w-6">Low</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden flex">
                    {layer.colors.map((color, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 w-8 text-right">High</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
