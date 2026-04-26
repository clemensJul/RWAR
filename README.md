# RAWR — Climate Risk Assessment for Real Estate

> **Cassini Hackathon Submission** — Building the holistic operating system for climate-resilient property assessment.

---

## What is RAWR?

RAWR transforms static spatial data into an **interactive, 3D-visualized decision-making platform** that combines today's hazard data with tomorrow's climate scenarios (2030, 2050, 2080).

Real estate purchasing decisions are still made using outdated 2D hazard maps and gut feeling. RAWR changes that — giving project developers, banks, insurers, and private buyers a single tool to understand, visualize, and act on climate risk before they sign.

---

## The Problem

During the critical **due diligence phase** of plot acquisition, the current process is slow, expensive, and fragmented:

- **Outdated 2D authority maps** (eHORA, WISA, ZÜRS Geo) show only historical data with no climate projections
- **Slow & expensive external consultants** — geological assessments take weeks and cost thousands
- **Abstract ESG scores** (e.g. "Flood Risk: Medium") offer no spatial guidance on where water actually pools

---

## Our Solution

RAWR is a **3D Digital Twin** of any property, overlaid with climate risk data layers:

| Layer | What it shows |
|---|---|
| **Hydro-Check** | Flood risk & heavy rain runoff — HQ100/300 maps, surface flow simulation |
| **Geo-Hazard** | Landslide & rockfall risk — slope analysis, historical events, soil conditions |
| **Aquifer-Monitor** | Groundwater levels, drought risk, well viability |
| **Future-Trend** | IPCC climate projections (RCP 4.5/8.5) for 2030, 2050, 2080 |
| **Actionable Advice** | Concrete recommendations (e.g. "Install backwater valve — budget €50k") |

---

## MVP Features

- Automated data pipeline (backend) — ingesting, cleaning, and merging fragmented geodata sources
- 3D property visualization (Digital Twin base layer)
- Hydro-Check: surface runoff & heavy rain simulation
- Future-Trend: IPCC scenario integration
- Actionable recommendations for buyers and developers

---

## Who It's For

**Primary: B2B real estate development (DACH region)**

- Corporate developers (STRABAG Real Estate, UBM, CA Immo) facing strict EU Taxonomy compliance requirements
- Mid-sized regional builders constantly acquiring plots near challenging topographies
- Specialized brownfield developers where subsurface risks are major cost factors

**Also:** Insurance companies, municipalities, private buyers

---

## Business Model

- **B2B SaaS** — monthly/annual subscription for high-frequency users
- **Credit / Pay-per-Plot** — flexible bundles for mid-sized developers with irregular acquisition cycles
- **API & Data-as-a-Service** — raw climate risk data for banks and insurers to integrate into internal models

---

## Stack

```
rawr/
├── frontend/    # Web app & 3D visualization
└── backend/     # Data pipeline & API
```

---

*Built at the Cassini Hackathon. Climate risk data powered by open satellite and geodata sources.*
