import geopandas as gpd
import os

RAW_DIR = "data/raw"
PROCESSED_DIR = "data/processed"

def filter_to_colorado():
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    # We look through all folders in raw
    for folder_name in os.listdir(RAW_DIR):
        folder_path = os.path.join(RAW_DIR, folder_name)
        if not os.path.isdir(folder_path): continue
        
        # Find the .shp file
        shp_files = [f for f in os.listdir(folder_path) if f.endswith('.shp')]
        if not shp_files: continue
        input_shp = os.path.join(folder_path, shp_files[0])
        
        try:
            print(f"🔄 Processing {folder_name} for Colorado...")
            gdf = gpd.read_file(input_shp)

            # Standardize: Filter for Colorado in any common column name
            state_cols = ['STATE', 'STATE_ABBR', 'STATE_NAME']
            for col in state_cols:
                if col in gdf.columns:
                    # Filter for Colorado entries only
                    gdf = gdf[gdf[col].str.contains("CO|Colorado", case=False, na=False)]
                    break
            
            # Reproject to WGS84 for Leaflet [cite: 213, 218]
            gdf = gdf.to_crs(epsg=4326)
            
            output_path = os.path.join(PROCESSED_DIR, f"{folder_name}_CO.geojson")
            gdf.to_file(output_path, driver='GeoJSON')
            print(f"✅ Created: {os.path.basename(output_path)}")
            
        except Exception as e:
            print(f"❌ Error with {folder_name}: {e}")

if __name__ == "__main__":
    filter_to_colorado()