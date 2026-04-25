import 'mapbox-gl/dist/mapbox-gl.css';
import ClimateMap from '../components/ClimateMap';
import { Sheet } from 'lucide-react';
import { ExampleSheet } from '../components/ExampleSheet';

function Dashboard() {
    return (
        // "relative" allows us to overlay buttons/panels on top of the map
        <div className="relative w-screen h-screen bg-slate-950">

            <div className="absolute top-4 left-4 z-10 w-72 p-4 bg-white/80 backdrop-blur-md rounded-xl shadow-2xl border border-white/20">
                <ExampleSheet></ExampleSheet>
            </div>

            <ClimateMap>

            </ClimateMap>
        </div>
    )
};

export default Dashboard;
