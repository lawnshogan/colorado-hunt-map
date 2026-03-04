# Colorado Moose Finder

**An interactive hunting intelligence map for Colorado moose unit planning.**

Built for a hunter drawing a Colorado moose tag for the first time — combines habitat data, land ownership, access infrastructure, and regulations into a single browser-based map with no account or software required.

---

## Live Map

Open `index.html` in a browser. All data is loaded from local GeoJSON files (in `data/processed/`) and one live API endpoint (CPW COTREX trailheads). No server required.

---

## Project Structure

```
colorado-hunt-map/
├── index.html                  # Entry point
├── css/
│   └── styles.css              # All map styles
├── js/
│   ├── config.js               # Data paths, API endpoints, color constants
│   ├── map.js                  # Map init, panes, layer groups, GPS, extent history
│   ├── ui.js                   # Panel controls, search, layer checkboxes, basemap switcher
│   ├── popup.js                # Unit info dock, spatial coverage analysis, GMU popup builder
│   └── layers.js               # All data loaders, zoom-to-unit, initialization
├── css/styles.css
├── data/
│   ├── raw/                    # Original source downloads (not committed)
│   └── processed/              # Map-ready GeoJSON outputs
│       ├── CPW_GMU_Boundary_BigGame_CO.geojson
│       ├── moose_habitat_enriched.geojson
│       ├── Moose_Core_Habitat.geojson
│       ├── Moose_DAUs.geojson
│       ├── Moose_GMUs.geojson
│       ├── Moose_Summer_Range.geojson
│       ├── Moose_Winter_Range.geojson
│       ├── Moose_Migration_Corridors.geojson
│       ├── Moose_Trailhead_Access_Zones.geojson
│       ├── surface_management_agency_CO.geojson
│       ├── CPW_State_Wildlife_Areas_And_State_Parks_CO.geojson
│       └── county_co_CO.geojson
├── scripts/
│   ├── 01_extract_moose_api.py
│   ├── 02_setup_postgis.py
│   ├── 03_load_moose_to_postgis.py
│   ├── 04_moose_dau_gmu_identifier.py
│   ├── 05_build_core_habitat.py
│   └── 06_build_access_zones.py
├── docs/
│   └── brochure_2026.pdf
├── SUMMARY.md                  # Project summary one-pager
└── README.md
```

---

## Data Pipeline

All processing is automated. Run scripts in order from the `scripts/` directory.

**Requirements:** Python 3.9+, PostgreSQL with PostGIS, `psycopg2`, `requests`, `shapely`, `geopandas`

```bash
pip install psycopg2 requests shapely geopandas
```

| Script | What It Does |
|--------|-------------|
| `01_extract_moose_api.py` | Fetches moose habitat and range layers from CPW ArcGIS REST API. Handles pagination and normalizes field names across endpoints. |
| `02_setup_postgis.py` | Creates a PostGIS-enabled PostgreSQL database and spatial schema. |
| `03_load_moose_to_postgis.py` | Loads all source GeoJSONs into PostGIS, reprojects to EPSG:26913 (UTM Zone 13N) for accurate metric calculations. |
| `04_moose_dau_gmu_identifier.py` | Runs `ST_Intersects` to spatially join GMU boundaries to Moose Data Analysis Units. Resolves a many-to-one relationship not present in either source schema. |
| `05_build_core_habitat.py` | Uses `ST_Intersection` to compute year-round overlap between summer and winter range. Derives `area_acres`, `overlap_index`, and `habitat_tier` (Primary / Secondary / Remnant) in SQL. |
| `06_build_access_zones.py` | Fetches COTREX trailheads from CPW API, buffers at 10 miles (`ST_Buffer`), and dissolves overlapping zones (`ST_Union`) into a single access surface. |

---

## Map Layers

| Layer | Source | Description |
|-------|--------|-------------|
| GMU Boundaries | CPW ArcGIS REST | Official game management unit polygons. Click any unit for a full intelligence popup. |
| Habitat Quality | CPW / Script 01 | Four-tier moose habitat suitability (Excellent → Low). Guides where to spend scouting time. |
| Year-Round Range | Scripts 03–05 | ST_Intersection of summer and winter range. Tiered by patch size. Primary areas (≥5,000 ac) are highest-probability moose locations in any season. |
| Summer Range | CPW | Seasonal range relevant to archery season (September). |
| Winter Range | CPW | Seasonal range relevant to rifle season (October–November). |
| Migration Corridors | CPW | Transition zones between seasonal ranges — high-value ambush locations in early October. |
| Moose DAUs | CPW / Script 04 | Population management units joined to GMUs via spatial query. Provides herd-level context. |
| Moose GMUs | CPW | CPW-specific moose management unit overlays. |
| Federal Lands | USGS/BLM SMA | USFS, BLM, NPS ownership. USFS and BLM are open to hunting; NPS is generally prohibited. |
| SWAs & State Parks | CPW | State Wildlife Areas (require habitat stamp) and State Parks (mostly prohibit hunting). |
| Trailhead Access Zones | COTREX / Script 06 | 10-mile buffer from all trailheads. Shows what portion of a unit is realistically reachable from a road. |
| Trailheads | CPW COTREX API (live) | Point locations with name, managing agency, access type, and parking info. |
| County Lines | Colorado GeoData Hub | Reference layer for geographic orientation. |

---

## Map Features

- **Unit Intelligence Popup** — Click any GMU to open a slide-up panel with: species presence grid, habitat quality coverage, year-round range coverage, federal/state land breakdown, trailhead access percentage, and a sorted list of nearby trailheads with click-to-zoom
- **Spatial Coverage Analysis** — Client-side 20×20 point grid with ray-casting point-in-polygon algorithm computes coverage percentages per unit with ±3% accuracy
- **GMU Search** — Autocomplete search with keyboard navigation zooms directly to any unit
- **GPS Locate** — Plots your position with coordinate, accuracy, and elevation readout
- **Extent History** — Previous/next/home navigation for the map view
- **Basemap Toggle** — Street (OSM), Satellite (Esri), Terrain/Hillshade (USGS)
- **Layer Panel** — 13 togglable layers in grouped, collapsible categories

---

## Data Sources

| Dataset | Source | URL |
|---------|--------|-----|
| GMU Boundaries | Colorado Parks & Wildlife | cpw.state.co.us |
| Moose Habitat & Range | CPW ArcGIS REST API | services.arcgis.com |
| Moose DAUs | CPW GIS Portal | cpw.state.co.us/gis |
| Federal Land Ownership | USGS/BLM Surface Management Agency | navigator.blm.gov |
| State Wildlife Areas | CPW | cpw.state.co.us/gis |
| Trailheads | CO TREX (CPW ArcGIS API) | cotrex.org |
| County Boundaries | Colorado GeoData Hub | data.colorado.gov |
| Hillshade Basemap | USGS National Map | basemap.nationalmap.gov |

---

## 2026 Moose Regulations (Colorado)

| Season | Dates |
|--------|-------|
| Archery | Sep 5 – Oct 3, 2026 |
| Rifle | Oct 4 – Nov 1, 2026 |

- License type: Limited Draw only — no over-the-counter tags
- Legal animals: Any bull or antlerless (unit-specific)
- Blaze orange: 500 sq in required during rifle season
- Shooting hours: 30 min before sunrise to 30 min after sunset

Full regulations: [cpw.state.co.us/rules-and-regulations](https://cpw.state.co.us/rules-and-regulations)

---

## Requirements

- Modern browser (Chrome, Firefox, Edge, Safari)
- Local web server or direct file access (some browsers block local fetch requests — use VS Code Live Server or `python -m http.server`)
- PostgreSQL + PostGIS (for running processing scripts only)

---

*Built as a Senior Geospatial Analyst candidate project. Species focus: Shiras moose (Alces alces shirasi).*













# Colorado Moose Finder
### Geospatial Hunt-Unit Intelligence Platform · Colorado Parks & Wildlife Data

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Data Source](https://img.shields.io/badge/data-CPW%20ArcGIS%20REST%20API-orange.svg)](https://services5.arcgis.com/ttNGmDvKQA7oeDQ3/)
[![Built With](https://img.shields.io/badge/built%20with-Leaflet%201.9.4-green.svg)](https://leafletjs.com/)

---

## Overview

**Colorado Moose Finder** is an interactive, browser-based GIS application designed to help hunters research Colorado moose hunting units before and during the field season. The platform integrates live and pre-processed spatial datasets from Colorado Parks & Wildlife (CPW), the USGS National Hydrography Dataset, and the CO TREX trail network to deliver unit-level hunting intelligence in a single, fast, mobile-capable interface.

The application was built to demonstrate a complete data engineering and GIS development workflow: automated REST API extraction, PostGIS spatial analysis, Python geoprocessing, and a modular vanilla JavaScript web map — without any build toolchain or framework dependency.

---

## Key Features

| Feature | Description |
|---|---|
| **Interactive GMU Map** | All Colorado Game Management Units rendered as clickable polygons with permanent unit-number labels |
| **Species Huntability Chips** | Each GMU popup reads DAU-ID attributes (`ELKDAU`, `DEERDAU`, `MOOSEDAU`, etc.) from the CPW boundary dataset — a populated ID confirms active management for that species in that unit |
| **2024 Harvest Statistics Card** | Unit-level harvest data (licenses, hunters, harvest count, success rate) sourced from CPW's 2024 annual report and processed into a queryable JSON lookup with statewide percentile tiers |
| **Habitat Quality Layer** | 4-class suitability ramp (Excellent → Low) derived from CPW moose habitat model, enriched with GMU/DAU join via PostGIS spatial operations |
| **Year-Round Range Layer** | CPW moose core habitat tier polygons (Primary/Secondary/Remnant) with seasonal overlap index |
| **NHD Water Layer** | USGS National Hydrography Dataset streams, rivers, lakes, and ponds via tile service — zero memory overhead |
| **Spatial Coverage Analysis** | Client-side 20×20 point-grid, ray-casting point-in-polygon algorithm estimates what % of each GMU is covered by habitat, federal lands, SWAs, and trailhead access zones |
| **Trailhead Access Zones** | 10-mile buffers around CO TREX trailheads, pre-computed with PostGIS (`ST_Buffer`), showing how much of each GMU is realistically reachable on foot |
| **Live Trailhead API** | Real-time fetch from CPW ArcGIS Feature Service with click-to-zoom |
| **Extent History Navigation** | Browser-style ← → extent history with home button |
| **GPS Locate** | Device geolocation with coordinate, accuracy, and elevation display |
| **Mobile Responsive** | Full layout reflow for phones and tablets: collapsed panels, centered title, layer list integrated into left panel |

---

## Technology Stack

### Languages
| Language | Role |
|---|---|
| **Python 3.11** | Data extraction, PostGIS ETL, spatial geoprocessing, harvest data processing |
| **SQL / PostGIS** | Spatial joins, buffers, relationship building inside PostgreSQL |
| **JavaScript (ES2020)** | All client-side map logic, spatial analysis, UI controllers |
| **HTML5** | Application shell and UI structure |
| **CSS3** | Responsive layout, animations, custom UI components |

### Libraries & Frameworks
| Tool | Version | Purpose |
|---|---|---|
| **Leaflet.js** | 1.9.4 | Interactive tile/vector map engine |
| **GeoPandas** | 0.14+ | Python geospatial data manipulation |
| **Shapely** | 2.0+ | Geometry operations in Python |
| **psycopg2 / SQLAlchemy** | latest | PostgreSQL + PostGIS Python connector |
| **Requests** | 2.31+ | CPW REST API data extraction with retry/pagination |

### Databases & Spatial Infrastructure
| Tool | Purpose |
|---|---|
| **PostgreSQL 15** | Relational database backend |
| **PostGIS 3.4** | Spatial extension — `ST_Buffer`, `ST_Intersects`, `sjoin_nearest`, spatial indexing |

### External Data Services
| Service | Data |
|---|---|
| CPW ArcGIS Feature Server (`CPWSpeciesData`) | Moose DAUs (L80), Moose GMUs (L81), Habitat, Seasonal Range, Migration Corridors |
| CPW ArcGIS Feature Server (`CPWAdminData`) | CO TREX Trailheads (L14) |
| USGS NHD Map Server | Streams, rivers, lakes, ponds (tile service) |
| OpenStreetMap / Esri World Imagery / USGS Hillshade | Base tile layers |

---

## Repository Structure

```
colorado-hunt-map/
├── index.html                  # Application shell (HTML entry point)
├── css/
│   └── styles.css              # Full application stylesheet
├── js/
│   ├── config.js               # Constants, API endpoints, colour helpers
│   ├── map.js                  # Leaflet init, panes, layer groups, state, GPS
│   ├── ui.js                   # Panel toggles, autocomplete, basemap, checkbox wiring
│   ├── popup.js                # Dock controller, hover/select, PIP coverage, popup builders
│   └── layers.js               # All data loaders, DAU live API + fallback, INIT sequence
├── css/
│   └── styles.css
├── scripts/
│   ├── 01_extract_moose_api.py          # CPW REST API extractor with pagination
│   ├── 02_setup_postgis.py              # PostgreSQL + PostGIS schema setup
│   ├── 03_load_moose_to_postgis.py      # Load raw GeoJSON into PostGIS
│   ├── 04_moose_dau_gmu_identifier.py   # Spatial join: habitat ↔ GMUs, DAU assignment
│   ├── 05_build_core_habitat.py         # Year-round range tier classification
│   ├── 06_build_access_zones.py         # 10-mile trailhead buffer geoprocessing
│   └── process_harvest_data.py          # 2024 CPW harvest report → JSON lookup
└── data/
    ├── raw/
    │   └── moose/                       # Extracted GeoJSON + Shapefiles from CPW API
    └── processed/
        ├── CPW_GMU_Boundary_BigGame_CO.geojson
        ├── moose_habitat_enriched.geojson
        ├── Moose_Core_Habitat.geojson
        ├── Moose_DAUs.geojson
        ├── Moose_GMUs.geojson
        ├── Moose_Summer_Range.geojson
        ├── Moose_Winter_Range.geojson
        ├── Moose_Migration_Corridors.geojson
        ├── Moose_Trailhead_Access_Zones.geojson
        ├── county_co_CO.geojson
        ├── surface_management_agency_CO.geojson
        ├── CPW_State_Wildlife_Areas_And_State_Parks_CO.geojson
        └── moose_harvest_2024.json      ← generated by process_harvest_data.py
```

---

## Data Pipeline

```
CPW ArcGIS REST API
        │
        ▼
01_extract_moose_api.py   ──── pagination + retry ──── data/raw/moose/*.geojson
        │
        ▼
02_setup_postgis.py        ──── PostgreSQL + PostGIS schema
        │
        ▼
03_load_moose_to_postgis.py ─── load GeoJSON → spatial tables
        │
        ▼
04_moose_dau_gmu_identifier.py
   • sjoin_nearest (UTM 13N)
   • habitat quality classification
   • GMU/DAU code assignment
        │
        ▼
05_build_core_habitat.py   ──── tier classification → Moose_Core_Habitat.geojson
        │
        ▼
06_build_access_zones.py   ──── ST_Buffer (10 mi) → Moose_Trailhead_Access_Zones.geojson
        │
        ▼
process_harvest_data.py    ──── 2024 CPW PDF → moose_harvest_2024.json
        │
        ▼
  Web Map (Leaflet)         ──── client-side PIP coverage analysis → GMU popup
```

---

## Setup & Running Locally

### Prerequisites
- Python 3.11+
- PostgreSQL 15 + PostGIS 3.4
- Any HTTP server (Python built-in works fine)

### Python dependencies
```bash
pip install requests geopandas shapely psycopg2-binary sqlalchemy
```

### Data pipeline (run once)
```bash
python scripts/01_extract_moose_api.py
python scripts/02_setup_postgis.py
python scripts/03_load_moose_to_postgis.py
python scripts/04_moose_dau_gmu_identifier.py
python scripts/05_build_core_habitat.py
python scripts/06_build_access_zones.py
python scripts/process_harvest_data.py        # generates moose_harvest_2024.json
```

### Serve the map
```bash
# From project root
python -m http.server 8000
# Open http://localhost:8000
```

### Mobile testing (same WiFi)
```bash
python -m http.server 8000 --bind 0.0.0.0
# Navigate to http://<your-local-ip>:8000 on phone
```

---

## Data Sources & Attribution

| Dataset | Source | License |
|---|---|---|
| GMU Boundaries | Colorado Parks & Wildlife | Public domain |
| Moose DAUs / GMUs / Ranges | CPW ArcGIS REST API (`CPWSpeciesData`) | Public domain |
| Trailheads | CO TREX via CPW ArcGIS (`CPWAdminData`) | Public domain |
| Federal Lands | BLM Surface Management Agency | Public domain |
| State Wildlife Areas | CPW | Public domain |
| County Boundaries | Colorado state GIS | Public domain |
| NHD Streams & Lakes | USGS National Hydrography Dataset | Public domain |
| Satellite Imagery | Esri World Imagery | Esri/DigitalGlobe |
| Street Map | OpenStreetMap | ODbL |
| 2024 Harvest Statistics | CPW 2024 Moose Harvest Report (PDF) | Public domain |

---

## Architecture Notes

**Why no framework?** The application uses vanilla JavaScript in a modular multi-file structure (`config → map → ui → popup → layers`) to demonstrate core GIS and JavaScript competency without build-toolchain abstraction. Every spatial operation (point-in-polygon, Haversine distance, ray casting) is implemented from scratch.

**Client-side spatial analysis** — the 20×20 grid coverage estimator samples 441 points per GMU through a pure-JavaScript ray-casting PIP algorithm, completing in 50–150 ms with ±3% accuracy. This avoids a backend server requirement entirely.

**DAU layer resilience** — the Moose DAU and GMU layers attempt a live fetch from the CPW ArcGIS REST API first; if the API is unavailable or returns empty, the loader automatically falls back to the pre-processed local GeoJSON. Field names are resolved dynamically across every known CPW attribute variant.

**Species huntability detection** — CPW's GMU boundary GeoJSON includes DAU-ID attributes for each major big-game species (`ELKDAU`, `DEERDAU`, `MOOSEDAU`, `ANTDAU`, `BEARDAU`, `LIONDAU`). A non-trivial value (length ≥ 2, not `"0"`, not a `"99…"` placeholder) indicates that CPW has an active Data Analysis Unit assigned to that species in that GMU — confirming it is an officially managed hunting unit for that animal.

---

## 2024 Harvest Data Methodology

The `process_harvest_data.py` script encodes the full CPW 2024 Moose Harvest Report (all license types combined: rifle, archery, muzzleloader, season choice, RFW, auction/raffle). For each unit the script stores:

- Licenses issued, hunter total, harvest total
- Overall success percentage
- Average hunt duration (days)
- **Success tier** (High / Medium / Low) — assigned by statewide percentile thresholds computed at runtime from the full dataset distribution

The statewide totals: **670 licenses · 633 hunters · 501 harvested · 79% overall success rate**.

---

## License

MIT License — see `LICENSE` for details.

Data sourced from Colorado Parks & Wildlife and USGS is in the public domain.

---

*Built for the 2026 Colorado moose draw season.*