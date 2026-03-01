# Colorado Moose Habitat Analysis & Visualization Engine

A full-stack Geospatial ETL (Extract, Transform, Load) pipeline and interactive web application designed to identify, enrich, and visualize critical Moose habitats across Colorado. This project demonstrates high-level spatial data engineering, PostGIS integration, and responsive web mapping.



## 🛠 Tech Stack

* **Language:** Python 3.13 (Data Science & ETL)
* **Database:** PostgreSQL 16 + PostGIS 3.4 (Spatial Analysis Engine)
* **GIS Libraries:** GeoPandas, Shapely, PyProj, SQLAlchemy, GeoAlchemy2
* **Frontend:** Leaflet.js, HTML5, CSS3 (Modern UI/UX with Backdrop Blurs)
* **Data Source:** CPW (Colorado Parks and Wildlife) Open Data

---

## 🏗 Data Pipeline Architecture

The system is architected into four distinct stages to maintain modularity and allow for scalable data updates.

### 01. API Data Extraction (`01_extract_moose_api.py`)
* **Purpose:** Automated data acquisition from remote biological databases.
* **Function:** Communicates with the CPW ArcGIS REST API to pull the most recent GeoJSON datasets for moose ranges and management boundaries.
* **Outcome:** Populates the `data/raw/moose/` directory with local, versioned geometry files.

### 02. Spatial Environment Setup (`02_setup_postgis.py`)
* **Purpose:** Bootstraps the local environment for high-performance spatial operations.
* **Action:** Establishes a connection to the PostgreSQL instance and initializes the **PostGIS extension**.
* **Technical Note:** Sets up the geometry columns and spatial indexing required for coordinate-aware queries.

### 03. PostGIS Data Ingestion (`03_load_moose_to_postgis.py`)
* **Purpose:** Normalizes disparate source files into a centralized relational repository.
* **Action:** Ingests raw GeoJSON data (Habitat, DAUs, GMUs), enforces a global Coordinate Reference System (**EPSG:4326**), and persists the data as spatial tables.
* **Optimization:** Utilizes a standard ingestion pattern to ensure the pipeline remains idempotent and easy to re-run with updated source files.

### 04. Spatial Enrichment & Intelligence (`04_moose_dau_gmu_identifier.py`)
* **Purpose:** The "Core Intelligence" layer of the application.
* **Nearest-Neighbor Spatial Join:** Implements `sjoin_nearest` to reconcile habitat polygons with GMU boundaries. This solves the "slivers" problem where map boundaries don't align perfectly, ensuring 100% data coverage.

* **Heuristic Classification:** A text-mining algorithm scans metadata for keywords (*Willow, Riparian, Winter, Concentration*) to classify habitats into **Excellent** or **High Quality** tiers.
* **Quantile Ranking:** Incorporates a statistical fallback that identifies significant habitat areas based on area-weighted significance (Top 15% by size) when metadata is unavailable.

---

## 🗺 Visualization Features

* **Layer Depth Management (Panes):** Custom Leaflet panes manage the visual hierarchy, ensuring high-contrast labels and boundaries remain legible over semi-transparent habitat fills.
* **Schema-Agnostic Popups:** The frontend uses an "Attribute Scanner" in JavaScript to find and display unit data, making the UI resilient to backend column changes or prefixes like `gmu_code_right`.
* **Responsive UI:** Integrated locate controls, custom SVG icons, and a backdrop-filter blur for a professional, modern application feel.
* **Dynamic Legend:** A reactive legend widget that conditionally displays symbology based on which layers are currently active in the view.

---

## 🚀 Getting Started

### Prerequisites
* PostgreSQL 16+ with PostGIS installed.
* Python 3.13 environment with `geopandas`, `sqlalchemy`, and `psycopg2`.

### Execution Order
1.  **Extract Data:** `python scripts/01_extract_moose_api.py`
2.  **Initialize DB:** `python scripts/02_setup_postgis.py`
3.  **Load PostGIS:** `python scripts/03_load_moose_to_postgis.py`
4.  **Enrich Habitat:** `python scripts/04_moose_dau_gmu_identifier.py`
5.  **View Map:** Open `index.html` via a local live server.

---

**Developed by:** [Your Name]  
**Project Goal:** To bridge the gap between raw biological data and actionable hunter intelligence.