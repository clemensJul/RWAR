import Map from 'react-map-gl/mapbox';

function ClimateMap() {
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    return (
        <>
            <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{ longitude: -122.4, latitude: 37.8, zoom: 14 }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/outdoors-v12"
            />
        </>
    );
}

export default ClimateMap;