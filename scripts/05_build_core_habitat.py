"""
build_core_habitat.py
─────────────────────────────────────────────────────────────────────────────
Moose Year-Round Core Habitat Analysis
Intersects Moose_Summer_Range and Moose_Winter_Range to identify areas where
moose persist across both seasons — the highest-value refugia on the landscape.

Enrichment added per intersection polygon:
  • area_acres       – patch size in acres
  • habitat_tier     – "Large Core" / "Medium Core" / "Small Core" (by area)
  • pct_of_summer    – what % of original summer range this patch represents
  • pct_of_winter    – what % of original winter range this patch represents
  • overlap_index    – normalised score 0–1 (area / max_patch_area); useful
                       for symbology or further analysis

Requirements:
  pip install geopandas shapely

Run from any directory:
  python build_core_habitat.py

Output:
  C:/Users/logans1/Documents/colorado-hunt-map/data/processed/Moose_Core_Habitat.geojson
─────────────────────────────────────────────────────────────────────────────
"""

import json
import math
import sys
from pathlib import Path

# ── Dependency check ──────────────────────────────────────────────────────────
try:
    import geopandas as gpd
    from shapely.ops import unary_union
except ImportError:
    sys.exit(
        "\n[ERROR] Required libraries not found.\n"
        "Install them with:  pip install geopandas shapely\n"
        "Then re-run this script.\n"
    )

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE = Path(r"C:\Users\logans1\Documents\colorado-hunt-map\data\processed")
SUMMER_PATH = BASE / "Moose_Summer_Range.geojson"
WINTER_PATH = BASE / "Moose_Winter_Range.geojson"
OUTPUT_PATH = BASE / "Moose_Core_Habitat.geojson"

# ── Habitat tier thresholds (acres) ──────────────────────────────────────────
TIER_LARGE  = 5_000   # >= 5,000 acres  → Large Core
TIER_MEDIUM = 1_000   # >= 1,000 acres  → Medium Core
                      # <  1,000 acres  → Small Core

ACRES_PER_SQ_METER = 0.000247105


def load_and_project(path: Path, crs_utm: str = "EPSG:26913") -> gpd.GeoDataFrame:
    """Load a GeoJSON and reproject to a metres-based CRS for area calculations."""
    print(f"  Loading {path.name} …")
    gdf = gpd.read_file(path)
    print(f"    {len(gdf)} features, original CRS: {gdf.crs}")
    gdf_proj = gdf.to_crs(crs_utm)
    return gdf_proj


def main():
    print("\n━━━ Moose Year-Round Core Habitat Analysis ━━━\n")

    # 1. Load layers
    summer = load_and_project(SUMMER_PATH)
    winter = load_and_project(WINTER_PATH)

    # 2. Dissolve each to a single geometry (union of all polygons per layer)
    print("\n  Dissolving summer range …")
    summer_union = unary_union(summer.geometry)
    print("  Dissolving winter range …")
    winter_union = unary_union(winter.geometry)

    # 3. Compute total areas for pct calculations
    summer_total_acres = summer_union.area * ACRES_PER_SQ_METER
    winter_total_acres = winter_union.area * ACRES_PER_SQ_METER
    print(f"\n  Summer range total: {summer_total_acres:,.0f} acres")
    print(f"  Winter range total: {winter_total_acres:,.0f} acres")

    # 4. Intersection
    print("\n  Computing intersection …")
    core_geom = summer_union.intersection(winter_union)

    if core_geom.is_empty:
        sys.exit("\n[ERROR] Intersection is empty — the two layers do not overlap "
                 "in the projected CRS. Check that both files cover Colorado.\n")

    # 5. Explode to individual polygons (MultiPolygon → individual Polygon rows)
    core_gdf = gpd.GeoDataFrame(geometry=[core_geom], crs="EPSG:26913")
    core_gdf = core_gdf.explode(index_parts=False).reset_index(drop=True)
    # Remove any degenerate geometry (lines, points from touching edges)
    core_gdf = core_gdf[core_gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])]
    core_gdf = core_gdf[core_gdf.geometry.area > 1].reset_index(drop=True)

    print(f"  Intersection produced {len(core_gdf)} core patches")

    # 6. Enrich each patch
    core_gdf["area_acres"]    = (core_gdf.geometry.area * ACRES_PER_SQ_METER).round(1)
    core_gdf["pct_of_summer"] = ((core_gdf["area_acres"] / summer_total_acres) * 100).round(2)
    core_gdf["pct_of_winter"] = ((core_gdf["area_acres"] / winter_total_acres) * 100).round(2)

    max_area = core_gdf["area_acres"].max()
    core_gdf["overlap_index"] = (core_gdf["area_acres"] / max_area).round(4)

    def assign_tier(acres):
        if acres >= TIER_LARGE:
            return "Large Core"
        elif acres >= TIER_MEDIUM:
            return "Medium Core"
        else:
            return "Small Core"

    core_gdf["habitat_tier"] = core_gdf["area_acres"].apply(assign_tier)

    # 7. Summary stats
    tier_counts = core_gdf["habitat_tier"].value_counts()
    total_core_acres = core_gdf["area_acres"].sum()
    print(f"\n  ── Enrichment Summary ──")
    print(f"  Total core habitat: {total_core_acres:,.0f} acres")
    print(f"  % of summer range:  {(total_core_acres / summer_total_acres * 100):.1f}%")
    print(f"  % of winter range:  {(total_core_acres / winter_total_acres * 100):.1f}%")
    print(f"  Tier breakdown:")
    for tier, count in tier_counts.items():
        print(f"    {tier}: {count} patches")

    # 8. Reproject back to WGS84 for GeoJSON output
    print(f"\n  Reprojecting to WGS84 …")
    core_wgs84 = core_gdf.to_crs("EPSG:4326")

    # 9. Export
    print(f"  Writing → {OUTPUT_PATH}")
    core_wgs84.to_file(OUTPUT_PATH, driver="GeoJSON")
    print(f"\n✅ Done. {len(core_wgs84)} core habitat patches exported.\n")


if __name__ == "__main__":
    main()
