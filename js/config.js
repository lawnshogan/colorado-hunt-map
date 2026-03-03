'use strict';

/* ════════════════════════════════════════════════
   CONFIG — all constants, paths, API endpoints,
   and colour helpers. Load FIRST.
════════════════════════════════════════════════ */
const CONFIG = {
    MAP_CENTER: [39.0, -105.5],
    MAP_ZOOM: 7,
    ACTIVE_STYLE: { color:'#00FFFF', weight:6, fillOpacity:0 },
    // 10-mile haversine radius in degrees (approximate, good enough for listing)
    TH_RADIUS_DEG: 10 / 69.0,
    DATA_PATHS: {
        gmus:           'data/processed/CPW_GMU_Boundary_BigGame_CO.geojson',
        mooseHabitat:   'data/processed/moose_habitat_enriched.geojson',
        coreHabitat:    'data/processed/Moose_Core_Habitat.geojson',
        mooseDaus:      'data/processed/Moose_DAUs.geojson',
        mooseGmus:      'data/processed/Moose_GMUs.geojson',
        mooseMigration: 'data/processed/Moose_Migration_Corridors.geojson',
        mooseSummer:    'data/processed/Moose_Summer_Range.geojson',
        mooseWinter:    'data/processed/Moose_Winter_Range.geojson',
        counties:       'data/processed/county_co_CO.geojson',
        federal:        'data/processed/surface_management_agency_CO.geojson',
        swas:           'data/processed/CPW_State_Wildlife_Areas_And_State_Parks_CO.geojson',
        accessZone:     'data/processed/Moose_Trailhead_Access_Zones.geojson'
    },
    API: {
        trailheads: 'https://services5.arcgis.com/ttNGmDvKQA7oeDQ3/arcgis/rest/services/CPWAdminData/FeatureServer/14/query?outFields=*&where=1%3D1&resultRecordCount=2000&f=geojson'
    }
};

/* ── Color helpers ─────────────────────────────── */
const HAB_COLORS = { excellent:'#1a6e3c', good:'#52b788', moderate:'#95d5b2', default:'#d4edda' };
const getHabColor = v => HAB_COLORS[String(v||'').toLowerCase().trim()] || HAB_COLORS.default;

const CORE_COLORS = {
    'Large Core':  { fill:'#7b2d8b', border:'#4a1a54', label:'Primary Range' },
    'Medium Core': { fill:'#b85cc8', border:'#7b2d8b', label:'Secondary Range' },
    'Small Core':  { fill:'#dba3e8', border:'#b85cc8', label:'Remnant Range' }
};