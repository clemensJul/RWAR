import Map from 'react-map-gl/mapbox';

function ClimateMap() {
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    return (
        <>
            <h2>Hi</h2>
            <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{ longitude: -122.4, latitude: 37.8, zoom: 14 }}
                style={{ width: '100%', height: '100%' }} // Map fills the Tailwind wrapper
                mapStyle="mapbox://styles/mapbox/dark-v11"
            />
        </>
    );
}

export default ClimateMap;