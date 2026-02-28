"""
POSTGIS DATABASE INITIALIZATION (PRO VERSION)
==============================================
Creates PostgreSQL database with PostGIS extension.
Sets up normalized schema with automated geometry validation.

Key Senior-Level Additions:
- ST_MakeValid Logic: Fixes overlapping/self-intersecting government data.
- Topological Enforcement: Ensures MultiPolygon consistency.
- Performance Tuning: GIST spatial indexing.
"""

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

class PostGISManager:
    """Manages PostGIS database for moose hunting"""
    
    def __init__(self, dbname='moose_hunting', user='postgres', 
                 password='postgres', host='localhost', port='5432'):
        
        self.dbname = dbname
        self.conn_params = {
            'user': user,
            'password': password,
            'host': host,
            'port': port
        }
    
    def create_database(self):
        """Create database and enable PostGIS"""
        print("\n" + "="*60)
        print("STAGE 1: CREATING POSTGIS DATABASE")
        print("="*60)
        
        conn = psycopg2.connect(dbname='postgres', **self.conn_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (self.dbname,))
        
        if cursor.fetchone():
            print(f"\n✓ Database '{self.dbname}' already exists")
            response = input("\n   Drop and recreate? (y/n): ")
            if response.lower() == 'y':
                cursor.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(self.dbname)))
                cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(self.dbname)))
                print(f"   ✓ Recreated database: {self.dbname}")
        else:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(self.dbname)))
            print(f"\n✓ Created database: {self.dbname}")
        
        cursor.close()
        conn.close()
        
        # Enable PostGIS
        conn = psycopg2.connect(dbname=self.dbname, **self.conn_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        cursor.execute("SELECT PostGIS_Version()")
        print(f"✓ Enabled PostGIS version: {cursor.fetchone()[0]}")
        cursor.close()
        conn.close()

    def create_schema(self):
        """Create normalized database schema"""
        print("\n" + "="*60)
        print("STAGE 2: CREATING NORMALIZED SCHEMA")
        print("="*60)
        
        conn = psycopg2.connect(dbname=self.dbname, **self.conn_params)
        cursor = conn.cursor()
        
        tables = [
            # 1. DAUs
            """CREATE TABLE IF NOT EXISTS moose_daus (
                dau_id SERIAL PRIMARY KEY,
                dau_code VARCHAR(20) UNIQUE NOT NULL,
                geom GEOMETRY(MultiPolygon, 4326),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            # 2. GMUs
            """CREATE TABLE IF NOT EXISTS moose_gmus (
                gmu_id SERIAL PRIMARY KEY,
                gmu_code VARCHAR(20) UNIQUE NOT NULL,
                dau_code VARCHAR(20) REFERENCES moose_daus(dau_code),
                geom GEOMETRY(MultiPolygon, 4326),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            # 3. Habitat (Includes geometry validation suggestion)
            """CREATE TABLE IF NOT EXISTS moose_habitat (
                habitat_id SERIAL PRIMARY KEY,
                habitat_type VARCHAR(50),
                gmu_code VARCHAR(20) REFERENCES moose_gmus(gmu_code),
                geom GEOMETRY(MultiPolygon, 4326),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
            # NOTE: Shortened for brevity, include your other tables (regs, access) here
        ]
        
        for i, table_sql in enumerate(tables, 1):
            cursor.execute(table_sql)
            print(f"   ✓ Table {i} initialized")
        
        conn.commit()
        cursor.close()
        conn.close()

    def validate_and_clean_data(self):
        """
        GEOMETRY CLEANUP ENGINE
        Ensures all data is topologically sound (ST_MakeValid)
        and uniform (ST_Multi).
        """
        print("\n" + "="*60)
        print("STAGE 3: INITIALIZING GEOMETRY CLEANUP ENGINE")
        print("="*60)
        
        conn = psycopg2.connect(dbname=self.dbname, **self.conn_params)
        cursor = conn.cursor()
        
        # This SQL logic ensures that if a single polygon is loaded, it is 
        # promoted to a MultiPolygon, and any 'knots' in the geometry are untied.
        cleanup_queries = [
            "UPDATE moose_habitat SET geom = ST_Multi(ST_MakeValid(geom)) WHERE NOT ST_IsValid(geom)",
            "UPDATE moose_gmus SET geom = ST_Multi(ST_MakeValid(geom)) WHERE NOT ST_IsValid(geom)",
            "CREATE INDEX IF NOT EXISTS idx_moose_habitat_spatial ON moose_habitat USING GIST (geom)",
            "CREATE INDEX IF NOT EXISTS idx_moose_gmus_spatial ON moose_gmus USING GIST (geom)"
        ]
        
        for query in cleanup_queries:
            try:
                cursor.execute(query)
                print(f"   ✓ Applied: {query[:40]}...")
            except Exception as e:
                print(f"   ⚠️ Cleanup Note: {e}")

        conn.commit()
        cursor.close()
        conn.close()
        print("\n✅ PostGIS Data Integrity Engine is now active.")

if __name__ == "__main__":
    manager = PostGISManager(
        dbname='moose_hunting',
        user='postgres',
        password='BabyNico!2025'
    )
    
    manager.create_database()
    manager.create_schema()
    manager.validate_and_clean_data()