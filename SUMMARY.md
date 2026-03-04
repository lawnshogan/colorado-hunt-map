# Colorado Moose Finder — Project Summary
## A Hunter's Story: First Time in Unit 14

---

### Background

Drew Kellerman has been applying for a Colorado moose tag for eleven years. When the draw results land in his inbox on a Thursday morning in April, the word "SUCCESSFUL" in the subject line makes his hands shake. Unit 14. He's never set foot in it. He has four months to figure it out.

He opens Colorado Moose Finder on his laptop that same night.

---

### The Map Loads

The first thing Drew notices is that the map comes up clean — no clutter, just Colorado. The GMU boundaries are labeled with their unit numbers, and two layers are already on: a green-shaded habitat quality layer and a purple gradient showing year-round range. He can see immediately that Unit 14, in the north-central part of the state, is saturated with both. That's a good sign.

He searches "14" in the **Unit Number search bar** in the top-left panel. The autocomplete drops a suggestion — *Unit 14* — and he clicks it. The map smoothly fits to the unit boundary, and the slide-up info dock appears at the bottom of the screen.

---

### The Species Chip Confirms What Matters

At the top of the popup, under **Huntable Species**, Drew sees six chips arranged in a grid: Elk, Deer, Pronghorn, Moose, Bear, and Lion. Five of them are green with a filled dot — but the one that matters, **Moose**, is green and lit up like a confirmation.

This isn't decoration. The map reads a field called `MOOSEDAU` directly out of CPW's GMU boundary dataset. If that field contains a real DAU code — not a zero, not a placeholder — it means CPW has an active Data Analysis Unit assigned to moose in this unit. Unit 14 has one. Drew's tag is real and this land is managed for it.

He also notices Elk and Deer are green. That tells him the habitat supporting moose in this unit also supports other big game — a good sign for a healthy, productive landscape.

---

### The Harvest Card Tells the Story

Below the species chips, the **2024 Harvest Statistics** card loads with a green badge: **High Success Rate**.

The numbers tell the story:

| Stat | Value |
|---|---|
| Licenses Issued | 39 |
| Hunters | 39 |
| Harvested | 32 |
| Success Rate | **82%** |
| Avg. Hunt Duration | 6.7 days |
| Statewide Average | 79% |

Unit 14 sits three points above the Colorado statewide average. That 82% success rate didn't come from luck — it reflects the density and quality of moose habitat in this unit and the relatively concentrated geography that keeps hunters on animals. The average hunt is under a week. Drew knows from talking to other hunters that anything above 75% in a Colorado moose unit is considered excellent.

This data came directly from CPW's official 2024 harvest report, typed unit-by-unit into a processing script that computed statewide percentile thresholds on the fly. High, Medium, and Low success tier labels reflect where each unit falls in that distribution — not arbitrary cutoffs.

---

### The Coverage Analysis Fills In the Details

While the harvest card loaded instantly from cached JSON, the map ran a **spatial coverage analysis** in the background — a 20×20 grid of sample points laid over Unit 14, each one tested against every loaded layer using a pure JavaScript ray-casting algorithm. Within about 100 milliseconds the coverage cards populate:

**Habitat Quality**
- Excellent: 38%
- Good: 44%
- Moderate: 11%
- Low/Other: 7%

Over 80% of Unit 14 is Excellent or Good moose habitat. Drew zooms into the dark green polygons on the map and clicks one. A popup appears with a **Hunter Note**: *Focus glassing effort on Excellent-rated riparian corridors at dawn and dusk. Moose feed heavily on aquatic vegetation — ponds and willow flats inside Excellent zones are prime ambush sites.*

**Year-Round Range**
- Primary: 29%
- Secondary: 41%
- Remnant: 12%

Nearly a third of the unit is classified as Primary year-round range — the highest tier, ≥5,000 contiguous acres of core multi-season moose habitat. Drew clicks a purple polygon and reads the popup: the seasonal overlap index is high, meaning moose use this area in both summer and winter. His rifle tag falls in early October, right as bulls are moving through transition habitat between summer and fall ranges.

**Federal Lands**
- USFS: 71%
- BLM: 8%
- NPS: 0%

Over 79% of Unit 14 is public land. Access isn't going to be a problem.

**State Lands**
- SWA: 6%
- State Park: 0%

Additional public land to work with. Small State Wildlife Areas could be overlooked by other hunters.

---

### The Water Layer Changes His Mental Map

Drew toggles on the **NHD Streams & Lakes** layer from the new Water Sources group at the bottom of the layer list. Suddenly the landscape makes more sense. A network of blue threads fills the unit — creeks, beaver ponds, small lakes. He zooms into the overlap between the Excellent habitat polygons and the water network. They align almost perfectly.

He already knew moose were semi-aquatic. He knew they waded into ponds to feed on aquatic vegetation and used water to regulate their body temperature through warm September days. Now he can see exactly which drainages concentrate that combination of dark willow cover, riparian corridor, and standing water.

He marks three areas mentally. One sits at the confluence of two creeks inside a Primary year-round range polygon, rated Excellent habitat. That's his first choice.

---

### The Trailhead Access Card Tells Him What He's In For

**Trailhead Access Coverage: 61%**

Just over half of Unit 14 is within 10 miles of a public trailhead. That's good news — Drew can reach most of the best habitat without a pack string. But 39% of the unit, including some of the darkest green habitat polygons he's been eyeing, sits beyond that 10-mile radius.

He clicks a trailhead in the **Nearby Trailheads** list. The map zooms to it and drops a marker. He cross-references it against the Excellent habitat polygon he's been studying. It's 7 miles in by trail. Doable with a solo spike camp on day two.

He clicks the Access Zone polygon that covers that trailhead. The popup opens with a Hunter Note: *Habitat quality that falls outside these zones means a multi-day spike camp or stock operation — often far less hunting pressure and larger, un-bumped bulls.* Drew reads that twice.

---

### The Moose DAU Layer Confirms the Management Framework

He toggles on the **Moose DAUs** layer. Red dashed outlines appear over the unit, each representing a CPW Data Analysis Unit — the management zones CPW uses to track population, set harvest quotas, and issue licenses. Unit 14 sits inside a DAU boundary that corresponds to the same code he saw in the `MOOSEDAU` attribute from the GMU data. The overlap is complete. His tag, the DAU, and the habitat all point to the same terrain.

---

### What Drew Walks Away With

In under an hour with the Colorado Moose Finder, Drew Kellerman has answered every question he needed to ask before his first scouting trip:

- **Can moose be hunted in Unit 14?** Yes — confirmed by the `MOOSEDAU` DAU-ID attribute in the CPW GMU boundary dataset, displayed as a green chip in the unit popup.
- **Is it a good unit?** 82% success rate, well above the 79% statewide average, categorized as High — confirmed by 2024 CPW harvest data processed from the official annual report.
- **Where do the moose live?** 82% of the unit is Excellent or Good habitat; Primary year-round range covers 29% of the unit; it aligns with the NHD water network.
- **Can he get there on public land?** 79% federal land, most within 10 miles of a trailhead.
- **What's the spike camp target?** The creek confluence inside the Primary range polygon and the Excellent habitat polygon, 7 miles from the nearest trailhead.

He books his campsite and starts packing.

---

### Technical Summary

**Colorado Moose Finder** is a full-stack geospatial application built without a framework, demonstrating a complete workflow from API data extraction through PostGIS spatial analysis to an interactive browser-based map.

**Stack:** Python · SQL/PostGIS · JavaScript (ES2020) · Leaflet.js · HTML5/CSS3

**Data:** CPW ArcGIS REST API (moose DAUs, GMUs, habitat, ranges, trailheads) · USGS NHD tile service · CPW 2024 harvest report · BLM federal lands · CO TREX

**Spatial analysis:** Client-side ray-casting point-in-polygon (20×20 grid, ~100 ms/GMU) · Haversine trailhead proximity · PostGIS ST_Buffer access zone pre-processing · sjoin_nearest habitat-GMU spatial join

**Key engineering decisions:**
- Modular vanilla JS (`config → map → ui → popup → layers`) — no build toolchain required
- DAU layer fetches live from CPW ArcGIS REST API with automatic fallback to local GeoJSON
- Harvest data encoded from PDF report into a JSON lookup with percentile-tiered success ratings computed at script runtime
- Species huntability read directly from CPW GMU boundary attributes (`MOOSEDAU`, `ELKDAU`, etc.) — a non-trivial DAU code confirms active management for that species in that unit
- NHD water rendered as a tile layer (zero memory overhead vs. GeoJSON vector)
- 2024 statewide totals: 670 licenses · 501 harvested · 79% overall success rate
