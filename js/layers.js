'use strict';

/* ════════════════════════════════════════════════
   LAYERS — all individual data-fetch functions,
   generic loaders, popup builders, zoomToGmu,
   map click handler, and the async INIT entry point.
   Depends on: config.js, map.js, ui.js, popup.js
════════════════════════════════════════════════ */

/* ── Generic attribute popup (non-GMU layers) ── */
const getMoosePopup = (props, label) => {
    const skip = new Set(['OBJECTID','Shape_Area','Shape_Leng','Shape__Area','Shape__Length']);
    const rows = Object.entries(props)
        .filter(([k, v]) => !skip.has(k) && v != null && v !== '')
        .map(([k, v]) => `<tr><td style="font-weight:bold;padding:2px 8px 2px 0;color:#555;">${k}</td><td>${v}</td></tr>`)
        .join('');
    return `<div style="padding:11px 15px 8px;border-bottom:2px solid #1a7a4a;">
                <b style="color:#1a7a4a;">🦌 ${label}</b></div>
            <div style="padding:6px 15px 12px;">
                <table style="font-size:0.82em;border-collapse:collapse;width:100%;max-width:280px;">
                    ${rows || '<tr><td style="color:#aaa">No attribute data</td></tr>'}
                </table></div>`;
};

const getFederalStyle = a => ({
    USFS:{ color:'#27ae60', opacity:0.4 },
    BLM: { color:'#e67e22', opacity:0.4 },
    NPS: { color:'#9b59b6', opacity:0.4 }
}[a] || { color:'transparent', opacity:0 });

/* ════════════════════════════════════════════════
   GENERIC LOADERS
════════════════════════════════════════════════ */

/** Semi-transparent fill layer (summer, winter, migration) — non-interactive */
const loadMooseLayer = async ({ path, stateKey, layerGroup, pane, fillColor, fillOpacity=0.35, borderColor='#555', label }) => {
    try {
        const data = await fetch(path).then(r => { if (!r.ok) throw Error(`HTTP ${r.status}`); return r.json(); });
        state.geoJsonLayers[stateKey] = L.geoJSON(data, {
            pane, interactive:false,
            style:{ color:borderColor, weight:0.8, fillColor, fillOpacity }
        }).addTo(layerGroup);
        console.log(`✓ ${label}`);
    } catch(err) { console.warn(`⚠ ${label}:`, err.message); }
};

/** Dashed outline layer (DAUs, Moose GMUs)
    Tries the live CPW API first; falls back to local GeoJSON file. */
const loadDauLayer = async ({ apiUrl, fallbackPath, stateKey, layerGroup, pane, color, label }) => {
    let data = null;

    try {
        let signal;
        try { signal = AbortSignal.timeout(12000); }
        catch(e) { const c = new AbortController(); setTimeout(() => c.abort(), 12000); signal = c.signal; }
        const r = await fetch(apiUrl, { signal });
        if (r.ok) {
            data = await r.json();
            if (!data.features?.length) data = null;
            else console.log(`✓ ${label} (live API, ${data.features.length} features)`);
        }
    } catch(err) {
        console.warn(`⚠ ${label} API unavailable — using local file:`, err.message);
    }

    if (!data) {
        try {
            const r = await fetch(fallbackPath);
            if (r.ok) {
                data = await r.json();
                console.log(`✓ ${label} (local fallback, ${data.features?.length} features)`);
            }
        } catch(err) { console.warn(`⚠ ${label} fallback also failed:`, err.message); return; }
    }
    if (!data?.features?.length) { console.warn(`⚠ ${label}: no features loaded`); return; }

    const resolveName = p => (
        p.DAU_NAME || p.dau_name || p.DAU || p.dau ||
        p.GMUID    || p.gmuid    || p.GMU || p.gmu ||
        p.NAME     || p.Name     || p.name ||
        p.LABEL    || p.Label    || ''
    );

    state.geoJsonLayers[stateKey] = L.geoJSON(data, {
        pane,
        style:{
            color, weight:2,
            fillColor:color, fillOpacity:0.06,
            dashArray:'6 4', opacity:0.85
        },
        onEachFeature: (f, layer) => {
            const id = resolveName(f.properties);
            if (id) layer.bindTooltip(`${label}: ${id}`, { className:'land-label', sticky:true });
            layer.bindPopup(getMoosePopup(f.properties, `${label}${id ? ' — ' + id : ''}`));
        }
    }).addTo(layerGroup);
};

/* ════════════════════════════════════════════════
   INDIVIDUAL DATA LOADERS
════════════════════════════════════════════════ */

const loadHarvestData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.harvest2024).then(r => {
            if (!r.ok) throw Error(`HTTP ${r.status}`);
            return r.json();
        });
        state.harvestData = data.units || {};
        console.log(`✓ Harvest data (${Object.keys(state.harvestData).length} units)`);
    } catch(err) {
        console.warn('⚠ Harvest data (run scripts/process_harvest_data.py first):', err.message);
    }
};

/** GMU boundaries — interactive, triggers dock popup */
const loadGmuData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.gmus).then(r => r.json());
        state.gmuFeatures = data.features;
        state.geoJsonLayers.gmu = L.geoJSON(data, {
            pane:'gmuPane',
            style:{ color:'#000', weight:1, fillOpacity:0.03, fillColor:'#000' },
            onEachFeature: (f, layer) => {
                layer.bindTooltip(String(f.properties.GMUID), {
                    permanent:true, direction:'center', className:'gmu-label'
                });
                setupInteractions(layer, buildGmuPopupContent);
            }
        }).addTo(layers.gmu);
        console.log('✓ GMU boundaries');
    } catch(err) { console.error('GMU load error:', err); }
};

/** Habitat quality — 4-colour ramp, rich click popup
    IMPORTANT: mouseover/mouseout only touch THIS feature — resetStyle(layer) not resetStyle() */
const loadMooseHabitatData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.mooseHabitat).then(r => r.json());
        state.rawGeoJSON.mooseHabitat = data.features;
        state.geoJsonLayers.mooseHabitat = L.geoJSON(data, {
            pane:'mooseHabitatPane',
            style: f => ({
                color:'#1a6e3c', weight:0.6,
                fillColor:getHabColor(f.properties.habitat_quality), fillOpacity:0.6
            }),
            onEachFeature: (f, layer) => {
                layer.bindPopup(buildHabitatPopup(f.properties), { maxWidth:300 });
                layer.on({
                    mouseover: () => {
                        layer.setStyle({ fillOpacity:0.88, weight:1.8 });
                        layer.bringToFront();
                    },
                    mouseout: () => {
                        /* resetStyle with explicit layer arg — only resets THIS feature */
                        if (state.geoJsonLayers.mooseHabitat) {
                            state.geoJsonLayers.mooseHabitat.resetStyle(layer);
                        }
                    }
                });
            }
        }).addTo(layers.mooseHabitat);
        console.log('✓ Moose habitat');
    } catch(err) { console.warn('⚠ Habitat:', err.message); }
};

/** Year-Round Range — tier-coloured, rich click popup */
const loadCoreHabitatData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.coreHabitat).then(r => r.json());
        state.rawGeoJSON.coreHabitat = data.features;
        state.geoJsonLayers.coreHabitat = L.geoJSON(data, {
            pane:'coreHabitatPane',
            style: f => {
                const c = CORE_COLORS[f.properties.habitat_tier] || CORE_COLORS['Small Core'];
                return { color:c.border, weight:1.2, fillColor:c.fill, fillOpacity:0.65 };
            },
            onEachFeature: (f, layer) => {
                layer.bindPopup(buildRangePopup(f.properties), { maxWidth:300 });
                layer.on({
                    mouseover: () => {
                        layer.setStyle({ fillOpacity:0.9, weight:2.5 });
                        layer.bringToFront();
                    },
                    mouseout: () => {
                        if (state.geoJsonLayers.coreHabitat) {
                            state.geoJsonLayers.coreHabitat.resetStyle(layer);
                        }
                    }
                });
            }
        }).addTo(layers.coreHabitat);
        console.log('✓ Year-Round Range');
    } catch(err) { console.warn('⚠ Year-Round Range:', err.message); }
};

/** County lines — muted red dashed, non-interactive */
const loadCountyData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.counties).then(r => r.json());
        state.geoJsonLayers.county = L.geoJSON(data, {
            pane:'countyPane', interactive:false,
            style:{ color:'#c0392b', weight:1, fillOpacity:0, dashArray:'8 5', opacity:0.5 },
            onEachFeature: (f, layer) => {
                const name = (f.properties.COUNTY || f.properties.name || f.properties.NAME || '')
                    .replace(/\s*county\s*/gi, '').trim();
                if (name && layer.getBounds) {
                    L.marker(layer.getBounds().getCenter(), { opacity:0, interactive:false })
                        .bindTooltip(name, { permanent:true, direction:'center', className:'county-label', pane:'labelPane' })
                        .addTo(layers.county);
                }
            }
        }).addTo(layers.county);
        console.log('✓ Counties');
    } catch(err) { console.warn('⚠ Counties:', err.message); }
};

/** Federal lands */
const loadFederalData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.federal).then(r => r.json());
        state.rawGeoJSON.federal = data.features;
        state.geoJsonLayers.federal = L.geoJSON(data, {
            pane:'federalPane', interactive:false,
            style: f => {
                const s = getFederalStyle(f.properties.ADMIN_AGEN);
                return { fillColor:s.color, fillOpacity:s.opacity, weight:0 };
            }
        }).addTo(layers.federal);
        console.log('✓ Federal lands');
    } catch(err) { console.warn('⚠ Federal:', err.message); }
};

/** State Wildlife Areas and State Parks */
const loadSwaData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.swas).then(r => r.json());
        state.rawGeoJSON.swa = data.features;
        state.geoJsonLayers.swa = L.geoJSON(data, {
            pane:'swaPane', interactive:false,
            style: f => {
                const isPark = f.properties.PropType === 'SP';
                return { color:'#333', weight:0.8, fillColor:isPark ? '#ff4444' : '#ffff00', fillOpacity:0.7 };
            }
        }).addTo(layers.swa);
        console.log('✓ SWAs');
    } catch(err) { console.warn('⚠ SWAs:', err.message); }
};

/** Trailhead Access Zones — rich click popup */
const loadAccessZoneData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.accessZone).then(r => {
            if (!r.ok) throw Error(`HTTP ${r.status}`);
            return r.json();
        });
        state.rawGeoJSON.accessZone = data.features;
        state.geoJsonLayers.accessZone = L.geoJSON(data, {
            pane:'accessZonePane',
            style:{ color:'#c17f00', weight:1, fillColor:'#f0a500', fillOpacity:0.15, dashArray:'4 4' },
            onEachFeature: (f, layer) => {
                layer.bindPopup(buildAccessZonePopup(f.properties), { maxWidth:300 });
                layer.on({
                    mouseover: () => {
                        layer.setStyle({ fillOpacity:0.35, weight:2 });
                        layer.bringToFront();
                    },
                    mouseout: () => {
                        if (state.geoJsonLayers.accessZone) {
                            state.geoJsonLayers.accessZone.resetStyle(layer);
                        }
                    }
                });
            }
        }).addTo(layers.accessZone);
        console.log('✓ Trailhead Access Zones');
    } catch(err) { console.warn('⚠ Access Zones (run scripts/06_build_access_zones.py first):', err.message); }
};

/** Trailheads — live CO TREX API */
const loadTrailheadData = async () => {
    try {
        const data = await fetch(CONFIG.API.trailheads).then(r => {
            if (!r.ok) throw Error(`HTTP ${r.status}`);
            return r.json();
        });
        state.trailheadFeatures = (data.features || []).filter(f => f.geometry?.type === 'Point');
        state.geoJsonLayers.trailheads = L.geoJSON(data, {
            pane:'trailheadPane',
            pointToLayer: (f, latlng) => L.circleMarker(latlng, {
                radius:5, fillColor:'#e65100', color:'#bf360c', weight:1.5, fillOpacity:0.9
            }),
            onEachFeature: (f, layer) => {
                const p    = f.properties;
                const name = p.name||p.Name||p.NAME||p.TrlhdName||p.TrailheadName||
                             p.TRAILHEADNAME||p.Trailhead_Name||p.trailhead_name||'Trailhead';
                const latlng = layer.getLatLng();
                const lat    = latlng.lat.toFixed(5);
                const lng    = latlng.lng.toFixed(5);
                layer.bindTooltip(name, { className:'trail-label' });
                layer.bindPopup(`
                    <div class="loc-popup">
                        <div class="loc-popup-header" style="background:#bf360c;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <span>${name}</span>
                        </div>
                        <div class="loc-popup-body">
                            <div class="loc-row"><span class="loc-label">Latitude</span><span class="loc-val">${lat}°</span></div>
                            <div class="loc-row"><span class="loc-label">Longitude</span><span class="loc-val">${lng}°</span></div>
                        </div>
                    </div>`, { maxWidth:240, minWidth:200 });
                layer.on('click', e => {
                    L.DomEvent.stopPropagation(e);
                    map.setView(layer.getLatLng(), 13, { animate:true });
                    layer.openPopup();
                });
            }
        }).addTo(layers.trailheads);
        console.log(`✓ Trailheads (${state.trailheadFeatures.length})`);
    } catch(err) { console.warn('⚠ Trailheads API:', err.message); }
};

/** NHD Water — USGS tile service
    Tries multiple known-good endpoints in order.
    The USGS periodically migrates services so we have fallbacks. */
const loadWaterLayer = () => {
    /* Ordered list of USGS NHD tile endpoints — first one that loads wins */
    const NHD_URLS = [
        /* Primary: USGS Hydro endpoint (most reliable as of 2025) */
        'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/tile/{z}/{y}/{x}',
        /* Fallback 1: TNM basemap with hydro overlay */
        'https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer/tile/{z}/{y}/{x}',
        /* Fallback 2: WMS-based approach via alternative tile path */
        'https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer/tile/{z}/{y}/{x}'
    ];

    let loaded = false;
    let tileLayer = null;

    const tryUrl = (urls, idx) => {
        if (idx >= urls.length) {
            console.warn('⚠ NHD Water: all tile endpoints failed — layer will appear empty');
            return;
        }
        tileLayer = L.tileLayer(urls[idx], {
            attribution: '<a href="https://www.usgs.gov/national-hydrography" target="_blank">USGS NHD</a>',
            maxZoom: 19,
            opacity: 0.80,
            pane: 'waterPane',
            errorTileUrl: ''   /* suppress red error tiles */
        });

        /* Test if tiles actually load by listening for the first tile event */
        tileLayer.once('tileload', () => {
            if (!loaded) {
                loaded = true;
                console.log(`✓ NHD Water (tile service, URL index ${idx})`);
            }
        });
        tileLayer.once('tileerror', () => {
            if (!loaded) {
                console.warn(`⚠ NHD Water URL ${idx} failed, trying next…`);
                layers.water.clearLayers();
                tryUrl(urls, idx + 1);
            }
        });

        layers.water.clearLayers();
        tileLayer.addTo(layers.water);
        state.geoJsonLayers.water = tileLayer;
    };

    tryUrl(NHD_URLS, 0);
};

/* ════════════════════════════════════════════════
   GMU ZOOM
════════════════════════════════════════════════ */
const zoomToGmu = id => {
    const s = String(id).replace(/\D/g, '');
    if (!s || !state.geoJsonLayers.gmu) return;
    state.geoJsonLayers.gmu.eachLayer(layer => {
        if (String(layer.feature.properties.GMUID) === s) {
            /* Restore old selection before applying new */
            if (state.currentSelection && state.currentSelection !== layer) {
                restoreLayerStyle(state.currentSelection);
            }
            state.currentSelection = layer;
            layer.setStyle(CONFIG.ACTIVE_STYLE);
            map.fitBounds(layer.getBounds(), {
                paddingTopLeft:     [330, 80],
                paddingBottomRight: [260, 40],
                maxZoom:            11
            });
            const props = layer.feature?.properties || {};
            showGmuPanel(buildGmuPopupContent(layer), props.GMUID || '', props.MOOSEDAU || '');
        }
    });
};

/* Map background click: minimise dock */
map.on('click', () => {
    if (!dockIsOpen) { state.currentSelection = null; }
});

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
(async () => {
    console.log('🗺  Colorado Moose Finder initializing…');

    /* Phase 1 — critical path */
    await Promise.all([loadHarvestData(), loadGmuData(), loadMooseHabitatData()]);

    /* Phase 2 — NHD water is synchronous tile layer */
    loadWaterLayer();

    Promise.all([
        loadCoreHabitatData(),
        loadFederalData(),
        loadSwaData(),
        loadCountyData(),
        loadAccessZoneData(),
        loadTrailheadData(),
        loadMooseLayer({ path:CONFIG.DATA_PATHS.mooseSummer,    stateKey:'mooseSummer',    layerGroup:layers.mooseSummer,    pane:'mooseSummerPane',  fillColor:'#f39c12', label:'Moose Summer Range'       }),
        loadMooseLayer({ path:CONFIG.DATA_PATHS.mooseWinter,    stateKey:'mooseWinter',    layerGroup:layers.mooseWinter,    pane:'mooseWinterPane',  fillColor:'#3498db', label:'Moose Winter Range'       }),
        loadMooseLayer({ path:CONFIG.DATA_PATHS.mooseMigration, stateKey:'mooseMigration', layerGroup:layers.mooseMigration, pane:'mooseMigPane',     fillColor:'#9b59b6', label:'Moose Migration Corridors'}),
        loadDauLayer({
            apiUrl:       CONFIG.API.mooseDaus,
            fallbackPath: CONFIG.DATA_PATHS.mooseDaus,
            stateKey:'mooseDaus', layerGroup:layers.mooseDaus, pane:'mooseDauPane',
            color:'#e74c3c', label:'Moose DAU'
        }),
        loadDauLayer({
            apiUrl:       CONFIG.API.mooseGmus,
            fallbackPath: CONFIG.DATA_PATHS.mooseGmus,
            stateKey:'mooseGmus', layerGroup:layers.mooseGmus, pane:'mooseGmuPane',
            color:'#1abc9c', label:'Moose GMU'
        })
    ]).then(() => console.log('✅ Colorado Moose Finder ready'));
})();
