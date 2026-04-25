import math
import random
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv(Path(__file__).parent / ".env")
sentinel_hub ='https://services.sentinel-hub.com/api/v1/catalog/1.0.0/'

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return response


# ---------------------------------------------------------------------------
# Risk computation
# ---------------------------------------------------------------------------

VALID_TYPES = {"flood", "landslide", "wildfire", "drought"}


def _deterministic_noise(lng: float, lat: float, salt: int = 0) -> float:
    """Return a repeatable pseudo-random float in [0, 1] for a given cell."""
    seed = int((lng * 1000 + lat * 1000 + salt) * 7919) % 100003
    rng = random.Random(seed)
    return rng.random()


def _compute_risk(lng: float, lat: float, risk_type: str) -> float:
    noise  = _deterministic_noise(lng, lat)
    noise2 = _deterministic_noise(lng, lat, salt=1)

    if risk_type == "landslide":
        # Terrain-roughness proxy via trig variation — spatially diverse globally
        roughness = abs(math.sin(lat * 7.3)) * abs(math.cos(lng * 5.1))
        return min(1.0, roughness * 0.6 + noise * 0.4)

    if risk_type == "wildfire":
        # Higher risk in subtropical bands (~30-45°N/S), modulated by noise
        lat_band = max(0.0, 1.0 - abs(lat - 38) / 25)
        return min(1.0, lat_band * 0.5 + noise * 0.3 + noise2 * 0.2)

    if risk_type == "drought":
        # Higher risk in drier subtropical belt (~20-40°N/S)
        lat_band = max(0.0, 1.0 - abs(lat - 30) / 28)
        return min(1.0, lat_band * 0.4 + noise * 0.35 + noise2 * 0.25)

    if risk_type == "flood":
        # Higher risk near low-lying areas and river corridors (trig proxy)
        low_lying = max(0.0, 1.0 - abs(math.sin(lat * 12.7) * math.cos(lng * 9.3)))
        return min(1.0, low_lying * 0.55 + noise * 0.25 + noise2 * 0.20)

    return noise

def _risk_category(level: float) -> str:
    if level < 0.25:
        return "Low"
    if level < 0.50:
        return "Medium"
    if level < 0.75:
        return "High"
    return "Extreme"




def _grid_size(lng_span: float, lat_span: float) -> tuple[int, int]:
    """Choose grid dimensions so each cell is ~0.001° (~100 m), capped at 500."""
    target = 0.001
    cols = max(50, min(500, int(lng_span / target)))
    rows = max(50, min(500, int(lat_span / target)))
    return cols, rows


def generate_risk_geojson(
    bbox: tuple[float, float, float, float],
    risk_type: str,
) -> dict:
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
                    "risk_level": round(risk, 3),
                    "risk_category": _risk_category(risk),
                    "risk_type": risk_type,
                },
            })

    return {"type": "FeatureCollection", "features": features}


def get_flood_geojson(bbox: tuple[float, float, float, float]) -> dict:
    return generate_risk_geojson(bbox, "flood")

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
        bbox = tuple(parts)  # (minLng, minLat, maxLng, maxLat)
    except ValueError:
        return jsonify(error="'bbox' must be four comma-separated floats: minLng,minLat,maxLng,maxLat"), 400

    # Guard against unreasonably large bounding boxes
    lng_span = abs(bbox[2] - bbox[0])
    lat_span = abs(bbox[3] - bbox[1])
    if lng_span > 30 or lat_span > 30:
        return jsonify(error="bbox span too large (max 30° per axis)"), 400

    if risk_type == "flood":
        geojson = get_flood_geojson(bbox)
    else:
        geojson = generate_risk_geojson(bbox, risk_type)
    return jsonify(geojson)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
