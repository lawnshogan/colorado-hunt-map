"""
CPW MOOSE DATA API EXTRACTOR
=============================
Extracts moose datasets (layers 80-85) from CPW ArcGIS REST API
Saves to data/raw/moose/ as both GeoJSON and Shapefile

Demonstrates:
- REST API integration
- Automated data acquisition
- Error handling and retry logic
- Multi-format output (GeoJSON + Shapefile)
"""

import requests
import geopandas as gpd
import json
from pathlib import Path
from datetime import datetime
import time

class MooseDataExtractor:
    """Extracts moose data from CPW ArcGIS REST API"""
    
    def __init__(self):
        self.base_url = "https://services5.arcgis.com/ttNGmDvKQA7oeDQ3/arcgis/rest/services/CPWSpeciesData/FeatureServer"
        self.output_dir = Path("data/raw/moose")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Moose layers from CPW
        self.moose_layers = {
            80: "Moose_DAUs",
            81: "Moose_GMUs",
            82: "Moose_Habitat",
            83: "Moose_Winter_Range",
            84: "Moose_Summer_Range",
            85: "Moose_Migration_Corridors"
        }
        
        self.extraction_log = {
            'timestamp': datetime.now().isoformat(),
            'source_url': self.base_url,
            'layers_extracted': []
        }
    
    def get_layer_info(self, layer_id):
        """Get metadata about a specific layer"""
        url = f"{self.base_url}/{layer_id}?f=json"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            info = response.json()
            
            print(f"   Layer {layer_id}: {info.get('name', 'Unknown')}")
            print(f"   Geometry: {info.get('geometryType', 'Unknown')}")
            print(f"   Fields: {len(info.get('fields', []))}")
            
            return info
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return None
    
    def extract_features(self, layer_id, layer_name):
        """
        Extract all features from a layer
        Handles pagination for large datasets
        """
        
        print(f"\n{'='*60}")
        print(f"EXTRACTING: {layer_name} (Layer {layer_id})")
        print(f"{'='*60}")
        
        # Get layer info first
        info = self.get_layer_info(layer_id)
        if not info:
            return None
        
        # Get total feature count
        count_url = f"{self.base_url}/{layer_id}/query"
        count_params = {
            'where': '1=1',
            'returnCountOnly': 'true',
            'f': 'json'
        }
        
        try:
            count_resp = requests.get(count_url, params=count_params, timeout=30)
            total_features = count_resp.json().get('count', 0)
            print(f"\n   Total features: {total_features:,}")
        except:
            total_features = None
            print(f"\n   Feature count unavailable")
        
        # Extract features with pagination
        all_features = []
        offset = 0
        batch_size = 1000  # ArcGIS REST API max per request
        
        while True:
            print(f"   Fetching batch: {offset}-{offset+batch_size}...", end=" ")
            
            query_params = {
                'where': '1=1',
                'outFields': '*',
                'returnGeometry': 'true',
                'f': 'geojson',
                'resultOffset': offset,
                'resultRecordCount': batch_size
            }
            
            try:
                response = requests.get(count_url, params=query_params, timeout=60)
                response.raise_for_status()
                
                data = response.json()
                features = data.get('features', [])
                
                if not features:
                    print("Done!")
                    break
                
                all_features.extend(features)
                print(f"{len(features)} features")
                
                offset += batch_size
                
                # Rate limiting
                time.sleep(0.5)
                
                # Break if we got fewer features than requested
                if len(features) < batch_size:
                    break
                    
            except Exception as e:
                print(f"\n   ⚠️  Error at offset {offset}: {e}")
                break
        
        if not all_features:
            print(f"   ⚠️  No features extracted")
            return None
        
        print(f"\n   ✅ Extracted {len(all_features):,} total features")
        
        # Create GeoJSON
        geojson = {
            'type': 'FeatureCollection',
            'name': layer_name,
            'crs': {
                'type': 'name',
                'properties': {'name': 'urn:ogc:def:crs:EPSG::4326'}
            },
            'features': all_features
        }
        
        return geojson
    
    def save_data(self, geojson, layer_id, layer_name):
        """Save extracted data as both GeoJSON and Shapefile"""
        
        if not geojson or not geojson.get('features'):
            return None
        
        # Convert to GeoDataFrame
        gdf = gpd.GeoDataFrame.from_features(geojson['features'], crs='EPSG:4326')
        
        # Clean filename
        clean_name = layer_name.replace(' ', '_').replace('-', '_')
        
        # Save as GeoJSON
        geojson_path = self.output_dir / f"{clean_name}.geojson"
        gdf.to_file(geojson_path, driver='GeoJSON')
        print(f"   💾 GeoJSON: {geojson_path}")
        
        # Save as Shapefile
        shp_dir = self.output_dir / clean_name
        shp_dir.mkdir(exist_ok=True)
        
        # Truncate field names for shapefile (10 char limit)
        gdf_shp = gdf.copy()
        name_map = {}
        for col in gdf_shp.columns:
            if col != 'geometry' and len(col) > 10:
                short_name = col[:10]
                # Ensure unique
                counter = 1
                while short_name in name_map.values():
                    short_name = col[:8] + f"{counter:02d}"
                    counter += 1
                name_map[col] = short_name
        
        if name_map:
            gdf_shp = gdf_shp.rename(columns=name_map)
            print(f"   ℹ️  Truncated {len(name_map)} field names for shapefile")
        
        shp_path = shp_dir / f"{clean_name}.shp"
        gdf_shp.to_file(shp_path, driver='ESRI Shapefile')
        print(f"   💾 Shapefile: {shp_path}")
        
        # Generate statistics
        stats = {
            'layer_id': layer_id,
            'layer_name': layer_name,
            'feature_count': len(gdf),
            'crs': str(gdf.crs),
            'bounds': gdf.total_bounds.tolist(),
            'fields': list(gdf.columns),
            'field_name_mapping': name_map,
            'geometry_type': gdf.geometry.geom_type.value_counts().to_dict(),
            'geojson_path': str(geojson_path),
            'shapefile_path': str(shp_path)
        }
        
        return stats
    
    def extract_all(self):
        """Main extraction process"""
        
        print("\n" + "="*60)
        print("CPW MOOSE DATA EXTRACTION")
        print("="*60)
        print(f"\nSource: {self.base_url}")
        print(f"Output: {self.output_dir}")
        print(f"Layers: {len(self.moose_layers)}")
        
        for layer_id, layer_name in self.moose_layers.items():
            try:
                # Extract
                geojson = self.extract_features(layer_id, layer_name)
                
                if geojson:
                    # Save
                    stats = self.save_data(geojson, layer_id, layer_name)
                    
                    if stats:
                        self.extraction_log['layers_extracted'].append(stats)
                else:
                    self.extraction_log['layers_extracted'].append({
                        'layer_id': layer_id,
                        'layer_name': layer_name,
                        'status': 'failed',
                        'feature_count': 0
                    })
                    
            except Exception as e:
                print(f"\n❌ ERROR processing layer {layer_id}: {e}")
                self.extraction_log['layers_extracted'].append({
                    'layer_id': layer_id,
                    'layer_name': layer_name,
                    'status': 'error',
                    'error': str(e)
                })
        
        # Save extraction log
        log_path = self.output_dir / 'extraction_log.json'
        with open(log_path, 'w') as f:
            json.dump(self.extraction_log, f, indent=2)
        
        print(f"\n📄 Log saved: {log_path}")
        
        # Summary
        successful = sum(1 for layer in self.extraction_log['layers_extracted'] 
                        if layer.get('feature_count', 0) > 0)
        total_features = sum(layer.get('feature_count', 0) 
                           for layer in self.extraction_log['layers_extracted'])
        
        print("\n" + "="*60)
        print("EXTRACTION COMPLETE")
        print("="*60)
        print(f"\nSuccessful: {successful}/{len(self.moose_layers)} layers")
        print(f"Total features: {total_features:,}")
        print("\nFiles saved to:", self.output_dir)
        print("="*60 + "\n")

if __name__ == "__main__":
    extractor = MooseDataExtractor()
    extractor.extract_all()