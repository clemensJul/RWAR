export interface RiskLayerDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** [low, medium, high, extreme] */
  colors: [string, string, string, string];
  apiType: string;
}

export const RISK_LAYERS: RiskLayerDef[] = [
  {
    id: 'flood',
    name: 'Flood Risk',
    description: 'Areas at risk from river flooding, surface water, or sea-level rise',
    icon: 'Droplets',
    colors: ['#bfdbfe', '#3b82f6', '#1d4ed8', '#1e3a5f'],
    apiType: 'flood',
  },
  {
    id: 'landslide',
    name: 'Landslide Risk',
    description: 'Terrain susceptible to landslides and debris flows',
    icon: 'Mountain',
    colors: ['#fef08a', '#f59e0b', '#b45309', '#78350f'],
    apiType: 'landslide',
  },
  {
    id: 'wildfire',
    name: 'Wildfire Risk',
    description: 'Vegetation fire probability based on climate and land cover',
    icon: 'Flame',
    colors: ['#fed7aa', '#f97316', '#c2410c', '#7c2d12'],
    apiType: 'wildfire',
  },
  {
    id: 'drought',
    name: 'Drought Index',
    description: 'Soil moisture deficit and long-term water stress indicators',
    icon: 'Sun',
    colors: ['#fef9c3', '#eab308', '#a16207', '#713f12'],
    apiType: 'drought',
  },
  {
    id: 'extreme_weather',
    name: 'Extreme Weather',
    description: 'Likelihood of extreme weather events including storms and heatwaves',
    icon: 'CloudLightning',
    colors: ['#f3e8ff', '#a855f7', '#7e22ce', '#4c1d95'],
    apiType: 'extreme_weather',
  },
];
