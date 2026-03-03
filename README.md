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