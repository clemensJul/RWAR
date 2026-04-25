import { Search, MapPin } from 'lucide-react';

export default function Hero() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
      
      {/* 1. Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />

      {/* 2. Hero Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
          Climate Security <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">for Your Home</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-xl mx-auto">
          Search for your property
        </p>

        {/* 3. Search Bar Container */}
        <div className="relative group max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
          </div>
          
          <input
            type="text"
            placeholder="Search for a city, coordinate, or landmark..."
            className="w-full h-16 pl-14 pr-32 bg-slate-900/50 backdrop-blur-xl border border-white/10 text-white rounded-2xl 
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 
                       placeholder:text-slate-500 text-lg transition-all shadow-2xl"
          />

          <button className="absolute right-3 top-3 bottom-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Locate</span>
          </button>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {['New York', 'Tokyo', 'London', 'Berlin'].map((city) => (
            <button key={city} className="text-sm text-slate-500 hover:text-blue-400 transition-colors bg-slate-900/30 px-3 py-1 rounded-full border border-white/5">
              {city}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}