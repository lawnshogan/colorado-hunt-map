# Colorado Moose Finder: From Draw Results to Data-Driven Scouting

### The Hunter’s Story: First Time in Unit 16
After eleven years of applying, the email Drew Kellerman had been waiting for finally arrived. [cite_start]The subject line read **"SUCCESSFUL"**—he had finally drawn a Colorado moose tag[cite: 8, 13]. The assignment: **Unit 16** in Jackson County.

Drew had never set foot in the unit. [cite_start]Faced with the daunting task of scouting several hundred square miles of unfamiliar backcountry in just four months, he pulled up the **Colorado Moose Finder**[cite: 11, 12]. 

He searched "16" in the unit panel, and the map immediately centered on the North Park region. [cite_start]Within seconds, Drew had answers that would have previously taken dozens of hours of manual research[cite: 33, 36]:

* **Legality & Management**: A green **"Moose" species chip** lit up, confirming the unit is actively managed under a CPW Data Analysis Unit (DAU).
* **Harvest Success**: The **2024 Harvest Card** loaded an 82% success rate—categorized as "High Success" based on real-time percentile calculations against the 79% statewide average.
* **The "Honey Holes"**: By toggling the **NHD Water Layer**, Drew visualized the intersection of Excellent-rated riparian habitat and beaver ponds, identifying prime willow flats where moose concentrate.
* **Public Access**: A spatial coverage analysis revealed that 79% of the unit is federal land, with 61% of the best habitat sitting within 10 miles of a public trailhead.

By the time he finished his first cup of coffee, Drew had moved from "clueless" to having three high-priority drainage confluences marked for his first scouting trip.

---

### Project Technical Overview
[cite_start]**Colorado Moose Finder** is a full-stack geospatial application designed to turn fragmented biological data into actionable hunting intelligence[cite: 9, 10]. [cite_start]It demonstrates a scalable, programmatic approach to data sourcing and spatial enrichment[cite: 15, 22].

#### Methods & Automation
* [cite_start]**Automated Data Pipeline**: Built a Python ETL pipeline to extract GeoJSON from the **CPW ArcGIS REST API**[cite: 18, 22].
* [cite_start]**Spatial Normalization**: Used **PostGIS** (`sjoin_nearest`) to resolve "sliver" overlaps between administrative GMU lines and biological habitat polygons[cite: 21, 23, 28].
* [cite_start]**Data Standardization**: Addressed inconsistent schemas by normalizing habitat quality through a keyword-scan heuristic (e.g., willow, riparian, winter) to create a unified classification system[cite: 23, 29].
* [cite_start]**Client-Side Analytics**: Engineered a **ray-casting point-in-polygon algorithm** that runs a 441-point grid analysis on the fly, providing land-use breakdowns in **<150ms** without a backend server[cite: 34, 38].
* **Hydraulic Integration**: Dynamically queries the **USGS National Hydrography Dataset (NHD)** to provide stream mileage and lake acreage—essential for semi-aquatic species like moose.



#### Key Insights & Performance
* [cite_start]**Standardized Success**: Automated the parsing of CPW harvest PDFs into a JSON lookup, allowing the app to compute statewide distribution tiers (High/Medium/Low) at script runtime[cite: 18, 22].
* [cite_start]**Lightweight UX**: Built with **Vanilla JS and Leaflet.js** (no frameworks) to ensure the map remains high-performance on mobile devices in low-connectivity backcountry environments[cite: 33, 40].
* [cite_start]**Management Validation**: Leveraged the `MOOSEDAU` attribute as a non-trivial validator to confirm active species management before a user commits to a hunt[cite: 41].

#### Benefit to an Angler New to the Area
[cite_start]While optimized for hunters, the app offers immediate value to a newcomer **angler**[cite: 36]:
1. [cite_start]**Water Density**: The NHD integration allows anglers to instantly see stream density and named water features within a unit[cite: 34].
2. [cite_start]**Access Security**: Trailhead access zones (pre-processed via **ST_Buffer**) identify which riparian corridors are reachable by foot vs. those requiring a multi-day pack trip[cite: 12, 28].
3. **Habitat Proxies**: "Excellent" moose habitat quality serves as an indicator for healthy, productive riparian ecosystems—perfect for locating pristine fishing spots.

---
**Tech Stack:** Please view the README in my repository for full technical details.