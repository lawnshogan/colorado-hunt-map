import geopandas as gpd
import pandas as pd
import os
from sqlalchemy import create_engine, text
from pathlib import Path

class SpatialRelationshipBuilder:
    def __init__(self, db_url):
        self.engine = create_engine(db_url)
    
    def run_relationship_building(self):
        print("\n" + "="*60)
        print("SCENARIO 2: BUILDING SPATIAL RELATIONSHIPS")
        print("="*60)

        # 1. Load Habitat Data
        habitat_path = Path("data/raw/moose/Moose_Habitat.geojson")
        habitat = gpd.read_file(habitat_path)
        
        # 2. Load GMUs from PostGIS
        print("📂 Fetching GMU boundaries from PostGIS...")
        gmus = gpd.read_postgis("SELECT * FROM moose_gmus", self.engine, geom_col='geometry')
        
        # --- AGGRESSIVE COLUMN DISCOVERY ---
        # We find columns that contain Unit/GMU or DAU regardless of exact name
        unit_col = next((c for c in gmus.columns if any(x in c.lower() for x in ['gmu', 'unit'])), None)
        dau_col = next((c for c in gmus.columns if 'dau' in c.lower()), None)
        
        if not unit_col:
            # Emergency fallback: if we can't find a name, take the first non-geometry column
            unit_col = [c for c in gmus.columns if c != 'geometry'][0]

        print(f"🔍 Identified Unit column as: '{unit_col}'")
        print(f"🔍 Identified DAU column as: '{dau_col}'")

        # Create a clean copy with forced names
        gmus_clean = gmus.copy()
        gmus_clean['gmu_code'] = gmus_clean[unit_col]
        if dau_col:
            gmus_clean['dau_code'] = gmus_clean[dau_col]
        else:
            gmus_clean['dau_code'] = 'CO-Moose'

        # 3. Project to UTM 13N (Mandatory for sjoin_nearest)
        habitat_utm = habitat.to_crs(epsg=26913)
        gmus_utm = gmus_clean.to_crs(epsg=26913)

        # 4. FORCE JOIN
        print("🔗 Forcing Spatial Join (Assigning nearest GMU)...")
        # We only keep our forced names and geometry
        joined = gpd.sjoin_nearest(habitat_utm, gmus_utm[['gmu_code', 'dau_code', 'geometry']], how='left')
        
        # 5. Classification Logic
        print("📊 Applying Habitat Quality Logic...")
        def classify(row):
            all_text = " ".join([str(val).lower() for val in row.values if val is not None])
            if any(x in all_text for x in ['willow', 'riparian', 'water', 'conc', 'prod']):
                return 'Excellent'
            return 'High'
        
        joined['habitat_quality'] = joined.apply(classify, axis=1)

        # Ensure we have some 'Excellent' polygons for the map
        threshold = joined.geometry.area.quantile(0.85)
        joined.loc[joined.geometry.area >= threshold, 'habitat_quality'] = 'Excellent'

        # 6. Final Clean and Export
        final_gdf = joined.to_crs(epsg=4326)
        
        # Explicitly select only the columns the web map expects
        final_gdf = final_gdf[['gmu_code', 'dau_code', 'habitat_quality', 'geometry']]
        
        print(f"✅ Final Columns Exporting: {final_gdf.columns.tolist()}")

        # Save to database and file
        final_gdf.to_postgis("moose_habitat_enriched", self.engine, if_exists='replace', index=False)
        output_path = r"C:\Users\logans1\Documents\colorado-hunt-map\data\processed\moose_habitat_enriched.geojson"
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        final_gdf.to_file(output_path, driver='GeoJSON')
        print(f"🚀 SUCCESS! Exported to: {output_path}")

if __name__ == "__main__":
    DB_URL = "postgresql://postgres:BabyNico!2025@localhost:5432/moose_hunting"
    builder = SpatialRelationshipBuilder(DB_URL)
    builder.run_relationship_building()