import math
import random
import os

import numpy as np
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from sentinelhub import (
    DataCollection,
    MimeType,
    SentinelHubRequest,
    SHConfig,
    BBox,
    CRS,
)

load_dotenv()

# Module-level SentinelHub setup — matches test.py exactly
config = SHConfig()
config.sh_client_id     = os.environ.get("SH_CLIENT_ID")
config.sh_client_secret = os.environ.get("SH_CLIENT_SECRET")
config.sh_token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
config.sh_base_url  = "https://sh.dataspace.copernicus.eu"

DEM_COLLECTION = DataCollection.DEM_COPERNICUS_30.define_from(
    name="DEM_30_CDSE",
    service_url="https://sh.dataspace.copernicus.eu",
)

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return response


# ---------------------------------------------------------------------------
# SentinelHub helpers
# ---------------------------------------------------------------------------

DEM_EVALSCRIPT = """
function setup() {
    return { input: ["DEM"], output: { bands: 1, sampleType: "FLOAT32" } };
}
function evaluatePixel(sample) { return [sample.DEM]; }
"""


def _fetch_dem(bbox: tuple[float, float, float, float], size: tuple[int, int] = (256, 256)) -> np.ndarray:
    """Fetch Copernicus 30 m DEM for *bbox*. Returns a 2-D float32 array (rows, cols)."""
    req = SentinelHubRequest(
        evalscript=DEM_EVALSCRIPT,
        input_data=[SentinelHubRequest.input_data(data_collection=DEM_COLLECTION)],
        responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
        bbox=BBox(bbox=bbox, crs=CRS.WGS84),
        size=size,
        config=config,
    )
    arr = np.array(req.get_data()[0], dtype=np.float32)
    if arr.ndim == 3:
        arr = arr[:, :, 0]
    return arr


# ---------------------------------------------------------------------------
# Risk computation — DEM-based (flood & landslide)
# ---------------------------------------------------------------------------

def _dem_to_geojson(risk_grid: np.ndarray, bbox: tuple, risk_type: str) -> dict:
    """Convert a 2-D risk grid [0,1] into a GeoJSON FeatureCollection."""
    min_lng, min_lat, max_lng, max_lat = bbox
    rows, cols = risk_grid.shape
    lng_step = (max_lng - min_lng) / cols
    lat_step = (max_lat - min_lat) / rows

    features = []
    for r in range(rows):
        for c in range(cols):
            risk = float(risk_grid[r, c])
            if risk < 0.10:
                continue
            lng1 = min_lng + c * lng_step
            lat2 = max_lat - r * lat_step        # rasters are top-down
            lat1 = lat2 - lat_step
            lng2 = lng1 + lng_step
            center_lng = (lng1 + lng2) / 2
            center_lat = (lat1 + lat2) / 2
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [lng1, lat1], [lng2, lat1],
                        [lng2, lat2], [lng1, lat2],
                        [lng1, lat1],
                    ]],
                },
                "properties": {
                    "risk_level":    round(risk, 3),
                    "risk_category": _risk_category(risk),
                    "risk_type":     risk_type,
                    "trend":         _compute_trend(center_lng, center_lat),
                },
            })
    return {"type": "FeatureCollection", "features": features}


def get_flood_geojson(bbox: tuple[float, float, float, float]) -> dict:
    """Low elevation → high flood risk (normalised, inverted DEM)."""
    dem = _fetch_dem(bbox)
    dem = np.nan_to_num(dem, nan=float(np.nanmean(dem)))
    lo, hi = dem.min(), dem.max()
    if hi == lo:
        risk_grid = np.zeros_like(dem, dtype=np.float32)
    else:
        risk_grid = 1.0 - (dem - lo) / (hi - lo)
    return _dem_to_geojson(risk_grid, bbox, "flood")


def get_landslide_geojson(bbox: tuple[float, float, float, float]) -> dict:
    """Steep gradient → high landslide risk.
    Bbox is expanded by 1 pixel on every side before fetching so that
    the gradient at the original boundary is computed from real neighbours.
    """
    size = (256, 256)
    cols, rows = size
    min_lng, min_lat, max_lng, max_lat = bbox
    lng_step = (max_lng - min_lng) / cols
    lat_step = (max_lat - min_lat) / rows

    # Expand by exactly 1 pixel on each side
    exp_bbox = (
        min_lng - lng_step,
        min_lat - lat_step,
        max_lng + lng_step,
        max_lat + lat_step,
    )
    dem = _fetch_dem(exp_bbox, size=(cols + 2, rows + 2))
    dem = np.nan_to_num(dem, nan=float(np.nanmean(dem)))

    grad_y, grad_x = np.gradient(dem)
    magnitude = np.sqrt(grad_x ** 2 + grad_y ** 2)

    # Trim the 1-pixel border back to original size
    magnitude = magnitude[1:-1, 1:-1]
    hi = magnitude.max()
    risk_grid = np.clip(magnitude / hi, 0.0, 1.0).astype(np.float32) if hi > 0 else np.zeros_like(magnitude, dtype=np.float32)

    return _dem_to_geojson(risk_grid, bbox, "landslide")


# ---------------------------------------------------------------------------
# Risk computation — synthetic (wildfire, drought, extreme_weather)
# ---------------------------------------------------------------------------

VALID_TYPES = {"flood", "landslide", "wildfire", "drought", "extreme_weather"}


def _deterministic_noise(lng: float, lat: float, salt: int = 0) -> float:
    seed = int((lng * 1000 + lat * 1000 + salt) * 7919) % 100003
    return random.Random(seed).random()


def _compute_risk(lng: float, lat: float, risk_type: str) -> float:
    noise  = _deterministic_noise(lng, lat)
    noise2 = _deterministic_noise(lng, lat, salt=1)

    if risk_type == "wildfire":
        lat_band = max(0.0, 1.0 - abs(lat - 38) / 25)
        return min(1.0, lat_band * 0.5 + noise * 0.3 + noise2 * 0.2)

    if risk_type == "drought":
        lat_band = max(0.0, 1.0 - abs(lat - 30) / 28)
        return min(1.0, lat_band * 0.4 + noise * 0.35 + noise2 * 0.25)

    if risk_type == "extreme_weather":
        tropical  = max(0.0, 1.0 - abs(lat - 15) / 40)
        roughness = abs(math.sin(lat * 5.1)) * abs(math.cos(lng * 3.7))
        return min(1.0, tropical * 0.4 + roughness * 0.3 + noise * 0.2 + noise2 * 0.1)

    return noise


def _compute_trend(lng: float, lat: float) -> float:
    noise = _deterministic_noise(lng, lat, salt=99)
    return round(noise * 2 - 1, 3)


def _risk_category(level: float) -> str:
    if level < 0.25: return "Low"
    if level < 0.50: return "Medium"
    if level < 0.75: return "High"
    return "Extreme"


def _grid_size(lng_span: float, lat_span: float) -> tuple[int, int]:
    target = 0.001
    cols = max(50, min(500, int(lng_span / target)))
    rows = max(50, min(500, int(lat_span / target)))
    return cols, rows


def generate_risk_geojson(bbox: tuple[float, float, float, float], risk_type: str) -> dict:
    min_lng, min_lat, max_lng, max_lat = bbox
    lng_span = max_lng - min_lng
    lat_span = max_lat - min_lat
    cols, rows = _grid_size(lng_span, lat_span)
    lng_step = lng_span / cols
    lat_step = lat_span / rows

    features = []
    for i in range(cols):
        for j in range(rows):
            lng1 = min_lng + i * lng_step
            lat1 = min_lat + j * lat_step
            lng2 = lng1 + lng_step
            lat2 = lat1 + lat_step
            center_lng = (lng1 + lng2) / 2
            center_lat = (lat1 + lat2) / 2

            risk = _compute_risk(center_lng, center_lat, risk_type)
            if risk < 0.10:
                continue

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [lng1, lat1], [lng2, lat1],
                        [lng2, lat2], [lng1, lat2],
                        [lng1, lat1],
                    ]],
                },
                "properties": {
                    "risk_level":    round(risk, 3),
                    "risk_category": _risk_category(risk),
                    "risk_type":     risk_type,
                    "trend":         _compute_trend(center_lng, center_lat),
                },
            })

    return {"type": "FeatureCollection", "features": features}


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@app.route("/api/risk-data")
def risk_data():
    risk_type = request.args.get("type", "flood").lower()
    if risk_type not in VALID_TYPES:
        return jsonify(error=f"'type' must be one of {sorted(VALID_TYPES)}"), 400

    bbox_raw = request.args.get("bbox", "-124,36,-120,39")
    try:
        parts = [float(x) for x in bbox_raw.split(",")]
        if len(parts) != 4:
            raise ValueError
        bbox = tuple(parts)
    except ValueError:
        return jsonify(error="'bbox' must be four comma-separated floats: minLng,minLat,maxLng,maxLat"), 400

    lng_span = abs(bbox[2] - bbox[0])
    lat_span = abs(bbox[3] - bbox[1])
    if lng_span > 30 or lat_span > 30:
        return jsonify(error="bbox span too large (max 30° per axis)"), 400

    if risk_type == "flood":
        geojson = get_flood_geojson(bbox)
    elif risk_type == "landslide":
        geojson = get_landslide_geojson(bbox)
    else:
        geojson = generate_risk_geojson(bbox, risk_type)

    return jsonify(geojson)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
