from sentinelhub import (
    DataCollection, 
    MimeType, 
    SentinelHubRequest, 
    SHConfig, 
    BBox, 
    CRS,
    ResamplingType,
    SentinelHubSession,

)
import numpy as np
import cv2
import os
from dotenv import load_dotenv

load_dotenv()

config = SHConfig()
config.sh_client_id = os.environ.get("SH_CLIENT_ID")
config.sh_client_secret = os.environ.get("SH_CLIENT_SECRET")
config.sh_token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
config.sh_base_url = "https://sh.dataspace.copernicus.eu"

evalscript = """
function setup() {
    return {
        input: ["DEM"],
        output: { bands: 1, sampleType: "FLOAT32" }
    };
}
function evaluatePixel(sample) {
    return [sample.DEM];
}
"""

bbox = BBox(bbox=[12.44, 41.87, 12.54, 41.92], crs=CRS.WGS84)
data_collection = DataCollection.DEM_COPERNICUS_30.define_from(
    name="DEM_30_CDSE",  # ← any unique name
    service_url="https://sh.dataspace.copernicus.eu"
)

request = SentinelHubRequest(
    evalscript=evalscript,
    input_data=[
        SentinelHubRequest.input_data(
            data_collection=data_collection,
        )
    ],
    responses=[
        SentinelHubRequest.output_response('default', MimeType.TIFF)
    ],
    bbox=bbox,
    size=(512, 512),
    config=config
)

# 3. Get Data
data = request.get_data()
# 'data' is the list of arrays returned by request.get_data()
raw_data = data[0]

# 1. Handle potential NaN values (common in DEMs)
raw_data = np.nan_to_num(raw_data)

# 2. Normalize the data to 0-255 (Greyscale)
# This maps the lowest point in your data to black and highest to white
min_val = np.min(raw_data)
max_val = np.max(raw_data)

if max_val != min_val:
    grayscale = ((raw_data - min_val) / (max_val - min_val) * 255).astype(np.uint8)
else:
    grayscale = np.zeros(raw_data.shape, dtype=np.uint8)

# 3. Save using OpenCV
cv2.imwrite('elevation_map.png', grayscale)

print(f"Image saved! Elevation range: {min_val}m to {max_val}m")