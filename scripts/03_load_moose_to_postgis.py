# Right now, your tables are empty shells. They have the correct "skeleton" (columns), but no actual "meat" (the elk/moose polygons).

# Here is the Moose Data Loader. This script takes the GeoJSONs created by your first script and "pours" them into your PostGIS database.




import geopandas as gpd
from sqlalchemy import create_engine, text
import os
from geoalchemy2 import Geometry

# Database Connection
db_url = "postgresql://postgres:BabyNico!2025@localhost:5432/moose_hunting"
engine = create_engine(db_url)

def load_moose_geojson(file_path, table_name):
    # 1. Existence Check
    if not os.path.exists(file_path):
        print(f"❌ FILE NOT FOUND: {file_path}. Please check your data/raw/moose/ folder.")
        return

    print(f"--- 🔄 Processing {table_name} ---")
    try:
        # 2. Read and Validate
        gdf = gpd.read_file(file_path)
        
        if gdf.empty:
            print(f"⚠️  SKIPPING: {file_path} contains no data.")
            return

        # Standardize Projection to WGS84
        if gdf.crs != "EPSG:4326":
            gdf = gdf.to_crs("EPSG:4326")
        
        # 3. Spatial Load to PostGIS
        # We use ST_Multi to ensure all geometries are stored as MultiPolygons/MultiLineStrings
        # This prevents "Geometry Type Mismatch" errors in pgAdmin/QGIS
        gdf.to_postgis(
            table_name, 
            engine, 
            if_exists='replace', 
            index=True,
            dtype={'geometry': Geometry('GEOMETRY', srid=4326)}
        )
        
        # 4. Optimization: Index and Analyze immediately
        with engine.connect() as conn:
            conn.execute(text(f"ANALYZE {table_name};"))
            conn.commit()
            
        print(f"✅ SUCCESS: Loaded {len(gdf)} rows into '{table_name}'")
        
    except Exception as e:
        print(f"❌ DATABASE ERROR for {table_name}: {e}")

if __name__ == "__main__":
    # Define the mapping of File -> Table Name
    # ENSURE THESE FILE NAMES MATCH YOUR FOLDER EXACTLY
    moose_layers = {
        'Moose_DAUs.geojson': 'moose_daus',
        'Moose_GMUs.geojson': 'moose_gmus',
        'Moose_Habitat.geojson': 'moose_habitat',
        'Moose_Winter_Range.geojson': 'moose_winter_range',
        'Moose_Summer_Range.geojson': 'moose_summer_range',
        'Moose_Migration_Corridors.geojson': 'moose_migration'
    }

    print("\n🚀 STARTING MOOSE SPATIAL ETL PIPELINE\n")
    
    for filename, table in moose_layers.items():
        path = os.path.join('./data/raw/moose/', filename)
        load_moose_geojson(path, table)

    print("\n🏆 ETL COMPLETE: Your PostGIS environment is fully populated.")