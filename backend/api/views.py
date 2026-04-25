from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
import random # Nur für Mockup-Zwecke am Wochenende

class ClimateAnalysisView(APIView):
    def get(self, request):
        # Wir holen uns lat/lon aus der Browser-Zeile, z.B. ?lat=48.2&lon=16.3
        lat = request.query_params.get('lat', '0')
        lon = request.query_params.get('lon', '0')
        
        # Hier simulieren wir die Logik für den Hackathon:
        # In echt würden hier Copernicus/Galileo Daten abgefragt
        data = {
            "status": "success",
            "coordinates": {"lat": lat, "lon": lon},
            "resilience_data": {
                "flood_risk": random.uniform(0.1, 0.9), # Zufallswerte für den Mockup
                "landslide_probability": "High" if float(lat) > 45 else "Low",
                "groundwater_level": "8.5m",
                "future_trend_2050": {
                    "temp_increase": "+2.2°C",
                    "dry_periods": "Increase by 15%"
                }
            },
            "recommendations": [
                "Install solar panels",
                "Rainwater harvesting highly recommended"
            ]
        }
        
        return Response(data)