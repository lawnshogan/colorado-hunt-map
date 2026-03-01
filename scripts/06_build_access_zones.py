import geopandas as gpd
import os
from pathlib import Path
from shapely.ops import unary_union

def main():
    # 1. Setup Paths
    base_dir = Path(__file__).resolve().parent.parent
    input_file = base_dir / "data" / "processed" / "CPW_State_Wildlife_Areas_And_State_Parks_CO.geojson"
    output_file = base_dir / "data" / "processed" / "Moose_Trailhead_Access_Zones.geojson"
    
    os.makedirs(output_file.parent, exist_ok=True)

    print("\n" + "="*60)
    print("GENERATING MOOSE ACCESS ENVELOPE")
    print("="*60)

    # 2. Check if source exists
    if not input_file.exists():
        print(f"❌ Error: Could not find {input_file}")
        return

    print(f"📂 Reading Access Data: {input_file.name}")
    gdf = gpd.read_file(input_file)

    # 3. Spatial Processing
    # We buffer 5 miles (8046 meters) around public land to show the "Huntable Reach"
    print("🔍 Calculating 5-mile hunting envelopes around Access Points...")
    
    # Project to UTM 13N (meters) for accurate buffering
    gdf_proj = gdf.to_crs(epsg=26913)
    
    # Buffer and Dissolve
    # We use Centroids to represent "Entry Points" for the Access Envelope logic
    buffered_geoms = gdf_proj.centroid.buffer(8046) 
    
    print("🧩 Dissolving buffers into a unified access surface...")
    dissolved = unary_union(buffered_geoms)

    # 4. Create Export Layer
    # Convert back to WGS84 (4326) for the web map
    final_gdf = gpd.GeoDataFrame(
        {'name': ['Primary Moose Access Envelope'], 
         'description': ['5-mile realistic travel radius from known public access points']},
        geometry=[dissolved],
        crs="EPSG:26913"
    ).to_crs(epsg=4326)

    # 5. Export
    final_gdf.to_file(output_file, driver='GeoJSON')
    
    print(f"✨ SUCCESS: Access Zones created!")
    print(f"📍 Location: {output_file}")
    print("="*60)

if __name__ == "__main__":
    main()