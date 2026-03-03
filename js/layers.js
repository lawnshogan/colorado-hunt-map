'use strict';

/* ════════════════════════════════════════════════
   LAYERS — popup helpers, data loaders, zoomToGmu,
   and async INIT entry point.
   Depends on: config.js, map.js, ui.js, popup.js
════════════════════════════════════════════════ */

const getFederalStyle = a => ({
    USFS:{ color:'#27ae60', opacity:0.4 },
    BLM: { color:'#e67e22', opacity:0.4 },
    NPS: { color:'#9b59b6', opacity:0.4 }
}[a] || { color:'transparent', opacity:0 });

/* ── Helper: format acreage nicely ─────────── */
const fmtAc = v => (v != null && !isNaN(v)) ? Number(v).toLocaleString(undefined,{maximumFractionDigits:0}) + ' ac' : '—';

/* ════════════════════════════════════════════════
   HABITAT QUALITY popup — on-map Leaflet popup
════════════════════════════════════════════════ */
function buildHabitatPopup(props) {
    const q    = (props.habitat_quality || '').toLowerCase().trim();
    const colorMap = { excellent:'#1a6e3c', good:'#52b788', moderate:'#95d5b2' };
    const color = colorMap[q] || '#d4edda';
    const label = q ? q.charAt(0).toUpperCase() + q.slice(1) : 'Unknown';
    const area  = fmtAc(props.area_acres || props.Shape__Area || props.Shape_Area);
    const gmu   = props.GMUID || props.GMU || '—';
    const notes = props.notes || props.Notes || props.NOTES || '';

    return `
    <div class="pro-popup">
        <div class="pro-popup-header" style="border-left:4px solid ${color};">
            <div class="pro-popup-title">Moose Habitat Quality</div>
            <div class="pro-popup-subtitle">CPW Habitat Assessment Layer</div>
        </div>
        <div class="pro-popup-body">
            <div class="pro-popup-badge" style="background:${color}20;border:1px solid ${color};color:${color === '#d4edda' ? '#555' : color};">
                <span class="pro-popup-badge-dot" style="background:${color};"></span>
                ${label}
            </div>
            <table class="pro-popup-table">
                <tr><td>Area</td><td>${area}</td></tr>
                <tr><td>GMU</td><td>${gmu !== '—' ? 'Unit ' + gmu : '—'}</td></tr>
                ${notes ? `<tr><td>Notes</td><td>${notes}</td></tr>` : ''}
            </table>
            <div class="pro-popup-hint">Part of moose habitat suitability model.<br>Excellent areas support highest density use.</div>
        </div>
    </div>`;
}

/* ════════════════════════════════════════════════
   YEAR-ROUND RANGE popup — on-map Leaflet popup
════════════════════════════════════════════════ */
function buildCoreHabitatPopup(props) {
    const tier  = props.habitat_tier || '—';
    const c     = CORE_COLORS[tier] || CORE_COLORS['Small Core'];
    const area  = fmtAc(props.area_acres);
    const pctS  = props.pct_of_summer != null ? props.pct_of_summer + '%' : '—';
    const pctW  = props.pct_of_winter != null ? props.pct_of_winter + '%' : '—';
    const ovlp  = props.overlap_index != null ? Number(props.overlap_index).toFixed(2) : '—';

    // Tier description
    const tierDesc = {
        'Large Core':  'Primary year-round moose range — highest probability of year-round occupancy.',
        'Medium Core': 'Secondary range — used throughout the year but at lower densities.',
        'Small Core':  'Remnant patch — isolated or marginal year-round use area.'
    }[tier] || 'Year-round habitat overlap zone.';

    // Hunter guidance based on tier
    const guidance = {
        'Large Core':  '⭐ High-priority scouting area for any season.',
        'Medium Core': '👍 Worth glassing — reliable moose presence.',
        'Small Core':  '🔍 Check during migration and early season.'
    }[tier] || '';

    return `
    <div class="pro-popup">
        <div class="pro-popup-header" style="border-left:4px solid ${c.fill};">
            <div class="pro-popup-title">Year-Round Moose Range</div>
            <div class="pro-popup-subtitle">Summer × Winter Range Intersection</div>
        </div>
        <div class="pro-popup-body">
            <div class="pro-popup-badge" style="background:${c.fill}22;border:1px solid ${c.fill};color:${c.fill};">
                <span class="pro-popup-badge-dot" style="background:${c.fill};"></span>
                ${c.label}
            </div>
            <table class="pro-popup-table">
                <tr><td>Patch Area</td><td>${area}</td></tr>
                <tr><td>% of Summer Range</td><td>${pctS}</td></tr>
                <tr><td>% of Winter Range</td><td>${pctW}</td></tr>
                <tr><td>Overlap Index</td><td>${ovlp}</td></tr>
            </table>
            <div class="pro-popup-desc">${tierDesc}</div>
            ${guidance ? `<div class="pro-popup-guidance">${guidance}</div>` : ''}
        </div>
    </div>`;
}

/* ════════════════════════════════════════════════
   TRAILHEAD ACCESS ZONE popup — on-map popup
════════════════════════════════════════════════ */
function buildAccessZonePopup(props) {
    const area   = fmtAc(props.area_acres || props.Shape__Area || props.Shape_Area);
    const radius = props.buffer_miles || props.buffer_radius || 10;
    const count  = props.trailhead_count || props.th_count || '—';
    const source = props.source || props.Source || 'CO TREX / CPW';

    return `
    <div class="pro-popup">
        <div class="pro-popup-header" style="border-left:4px solid #f0a500;">
            <div class="pro-popup-title">Trailhead Access Zone</div>
            <div class="pro-popup-subtitle">Derived from CO TREX Trailhead Network</div>
        </div>
        <div class="pro-popup-body">
            <div class="pro-popup-badge" style="background:#f0a50020;border:1px solid #f0a500;color:#8a5e00;">
                <span class="pro-popup-badge-dot" style="background:#f0a500;"></span>
                ${radius}-Mile Foot Access Buffer
            </div>
            <table class="pro-popup-table">
                <tr><td>Buffer Radius</td><td>${radius} miles from trailhead</td></tr>
                <tr><td>Zone Area</td><td>${area}</td></tr>
                ${count !== '—' ? `<tr><td>Trailheads</td><td>${count} contributing TH</td></tr>` : ''}
                <tr><td>Source</td><td>${source}</td></tr>
            </table>
            <div class="pro-popup-desc">Areas within this zone are realistically reachable on foot or horseback from a trailhead. Used to assess pack-in hunting viability within each GMU.</div>
            <div class="pro-popup-guidance">🥾 Enable Trailheads layer to see individual access points.</div>
        </div>
    </div>`;
}

/* ════════════════════════════════════════════════
   GENERIC MOOSE LAYER LOADER
   These layers (Summer, Winter, Migration) are
   display-only — no click interaction.
════════════════════════════════════════════════ */
const loadMooseLayer = async ({ path, stateKey, layerGroup, pane, fillColor, fillOpacity=0.35, borderColor='#555', label }) => {
    try {
        const data = await fetch(path).then(r=>{ if(!r.ok) throw Error(`HTTP ${r.status}`); return r.json(); });
        state.geoJsonLayers[stateKey] = L.geoJSON(data, {
            pane, interactive: false,   // non-clickable display layer
            style:{ color:borderColor, weight:0.8, fillColor, fillOpacity }
        }).addTo(layerGroup);
        console.log(`✓ ${label}`);
    } catch(err) { console.warn(`⚠ ${label}:`, err.message); }
};

/* ── Boundary layer (DAUs, Moose GMUs) — display only ── */
const loadBoundaryLayer = async ({ path, stateKey, layerGroup, pane, color, label, idField='NAME' }) => {
    try {
        const data = await fetch(path).then(r=>{ if(!r.ok) throw Error(`HTTP ${r.status}`); return r.json(); });
        state.geoJsonLayers[stateKey] = L.geoJSON(data, {
            pane, interactive: false,
            style:{ color, weight:2, fillColor:color, fillOpacity:0.07, dashArray:'6 4', opacity:0.85 }
        }).addTo(layerGroup);
        console.log(`✓ ${label}s`);
    } catch(err) { console.warn(`⚠ ${label}:`, err.message); }
};

/* ════════════════════════════════════════════════
   DATA LOADERS
════════════════════════════════════════════════ */
const loadGmuData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.gmus).then(r=>r.json());
        state.gmuFeatures = data.features;
        state.geoJsonLayers.gmu = L.geoJSON(data, {
            pane:'gmuPane', style:{ color:'#000', weight:1, fillOpacity:0.05 },
            onEachFeature: (f,layer) => {
                layer.bindTooltip(String(f.properties.GMUID), { permanent:true, direction:'center', className:'gmu-label' });
                setupInteractions(layer, buildGmuPopupContent);
            }
        }).addTo(layers.gmu);
        console.log('✓ GMU boundaries');
    } catch(err) { console.error('GMU load error:', err); }
};

const loadMooseHabitatData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.mooseHabitat).then(r=>r.json());
        state.rawGeoJSON.mooseHabitat = data.features;
        state.geoJsonLayers.mooseHabitat = L.geoJSON(data, {
            pane:'mooseHabitatPane',
            style: f=>({ color:'#1a6e3c', weight:0.6, fillColor:getHabColor(f.properties.habitat_quality), fillOpacity:0.6 }),
            onEachFeature: (f,layer) => {
                layer.bindPopup(buildHabitatPopup(f.properties), { maxWidth:280 });
                layer.on({
                    mouseover: () => { layer.setStyle({ fillOpacity:0.88, weight:1.5 }); layer.bringToFront(); },
                    mouseout:  () => state.geoJsonLayers.mooseHabitat.resetStyle(layer)
                });
            }
        }).addTo(layers.mooseHabitat);
        console.log('✓ Moose habitat');
    } catch(err) { console.warn('⚠ Habitat:', err.message); }
};

const loadCoreHabitatData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.coreHabitat).then(r=>r.json());
        state.rawGeoJSON.coreHabitat = data.features;
        state.geoJsonLayers.coreHabitat = L.geoJSON(data, {
            pane:'coreHabitatPane',
            style: f=>{ const c=CORE_COLORS[f.properties.habitat_tier]||CORE_COLORS['Small Core']; return {color:c.border,weight:1.2,fillColor:c.fill,fillOpacity:0.65}; },
            onEachFeature: (f,layer) => {
                layer.bindPopup(buildCoreHabitatPopup(f.properties), { maxWidth:280 });
                layer.on({
                    mouseover: () => { layer.setStyle({ fillOpacity:0.9, weight:2.5 }); layer.bringToFront(); },
                    mouseout:  () => state.geoJsonLayers.coreHabitat.resetStyle(layer)
                });
            }
        }).addTo(layers.coreHabitat);
        console.log('✓ Year-Round Range');
    } catch(err) { console.warn('⚠ Year-Round Range:', err.message); }
};

const loadCountyData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.counties).then(r=>r.json());
        state.geoJsonLayers.county = L.geoJSON(data, {
            pane:'countyPane', interactive:false, style:{color:'#e74c3c',weight:1.5,fillOpacity:0},
            onEachFeature: (f,layer) => {
                const name=(f.properties.COUNTY||f.properties.name||f.properties.NAME||'').replace(/County/gi,'').trim();
                if(layer.getBounds) L.marker(layer.getBounds().getCenter(),{opacity:0,interactive:false})
                    .bindTooltip(name,{permanent:true,direction:'center',className:'county-label',pane:'labelPane'})
                    .addTo(layers.county);
            }
        }).addTo(layers.county);
        console.log('✓ Counties');
    } catch(err) { console.warn('⚠ Counties:', err.message); }
};

const loadFederalData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.federal).then(r=>r.json());
        state.rawGeoJSON.federal = data.features;
        state.geoJsonLayers.federal = L.geoJSON(data, {
            pane:'federalPane', interactive:false,
            style: f=>{ const s=getFederalStyle(f.properties.ADMIN_AGEN); return {fillColor:s.color,fillOpacity:s.opacity,weight:0}; }
        }).addTo(layers.federal);
        console.log('✓ Federal lands');
    } catch(err) { console.warn('⚠ Federal:', err.message); }
};

const loadSwaData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.swas).then(r=>r.json());
        state.rawGeoJSON.swa = data.features;
        state.geoJsonLayers.swa = L.geoJSON(data, {
            pane:'swaPane', interactive:false,
            style: f=>{ const isPark=f.properties.PropType==='SP'; return {color:'#333',weight:0.8,fillColor:isPark?'#ff4444':'#ffff00',fillOpacity:0.7}; }
        }).addTo(layers.swa);
        console.log('✓ SWAs');
    } catch(err) { console.warn('⚠ SWAs:', err.message); }
};

const loadAccessZoneData = async () => {
    try {
        const data = await fetch(CONFIG.DATA_PATHS.accessZone).then(r=>{ if(!r.ok) throw Error(`HTTP ${r.status}`); return r.json(); });
        state.rawGeoJSON.accessZone = data.features;
        state.geoJsonLayers.accessZone = L.geoJSON(data, {
            pane:'accessZonePane',
            style:{ color:'#c17f00', weight:1, fillColor:'#f0a500', fillOpacity:0.15, dashArray:'4 4' },
            onEachFeature: (f,layer) => {
                layer.bindPopup(buildAccessZonePopup(f.properties), { maxWidth:280 });
                layer.on({
                    mouseover: () => { layer.setStyle({ fillOpacity:0.30, weight:2 }); layer.bringToFront(); },
                    mouseout:  () => state.geoJsonLayers.accessZone.resetStyle(layer)
                });
            }
        }).addTo(layers.accessZone);
        console.log('✓ Trailhead Access Zones');
    } catch(err) { console.warn('⚠ Access Zones:', err.message); }
};

const loadTrailheadData = async () => {
    try {
        console.log('⏳ Loading CO TREX Trailheads…');
        const data = await fetch(CONFIG.API.trailheads).then(r=>{ if(!r.ok) throw Error(`HTTP ${r.status}`); return r.json(); });
        state.trailheadFeatures = (data.features||[]).filter(f => f.geometry?.type==='Point');
        state.geoJsonLayers.trailheads = L.geoJSON(data, {
            pane:'trailheadPane',
            pointToLayer: (f,latlng) => L.circleMarker(latlng, {
                radius:5, fillColor:'#e65100', color:'#bf360c', weight:1.5, fillOpacity:0.9
            }),
            onEachFeature: (f,layer) => {
                const p=f.properties;
                const name   = p.name||p.Name||p.NAME||p.TrlhdName||p.TrailheadName||p.TRAILHEADNAME||p.Trailhead_Name||p.trailhead_name||'Trailhead';
                const mgmt   = p.ManagingOrg ||p.MANAGINGORG ||'—';
                const access = p.AccessType  ||p.ACCESSTYPE  ||'—';
                const park   = p.ParkingSpots||p.PARKINGSPOTS||'—';
                const lat    = layer.getLatLng().lat.toFixed(5);
                const lng    = layer.getLatLng().lng.toFixed(5);
                layer.bindTooltip(name, { className:'trail-label' });
                layer.bindPopup(`
                    <div class="pro-popup">
                        <div class="pro-popup-header" style="border-left:4px solid #e65100;">
                            <div class="pro-popup-title">${name}</div>
                            <div class="pro-popup-subtitle">CO TREX Trailhead</div>
                        </div>
                        <div class="pro-popup-body">
                            <table class="pro-popup-table">
                                <tr><td>Managed By</td><td>${mgmt}</td></tr>
                                <tr><td>Access Type</td><td>${access}</td></tr>
                                <tr><td>Parking</td><td>${park}</td></tr>
                                <tr><td>Coordinates</td><td>${lat}°N, ${Math.abs(lng)}°W</td></tr>
                            </table>
                        </div>
                    </div>`, { maxWidth:260 });
                layer.on('click', e => {
                    L.DomEvent.stopPropagation(e);
                    map.setView(layer.getLatLng(), 14, { animate:true });
                    layer.openPopup();
                });
            }
        }).addTo(layers.trailheads);
        console.log(`✓ Trailheads (${state.trailheadFeatures.length})`);
    } catch(err) { console.warn('⚠ Trailheads API:', err.message); }
};

/* ════════════════════════════════════════════════
   GMU ZOOM
════════════════════════════════════════════════ */
const zoomToGmu = id => {
    const s = String(id).replace(/\D/g,'');
    if (!s || !state.geoJsonLayers.gmu) return;
    state.geoJsonLayers.gmu.eachLayer(layer => {
        if (String(layer.feature.properties.GMUID)===s) {
            state.currentSelection = layer;
            clearAllHovers();
            layer.setStyle(CONFIG.ACTIVE_STYLE);
            map.fitBounds(layer.getBounds(), { paddingTopLeft:[330,80], paddingBottomRight:[260,40] });
            const props2 = layer.feature?.properties || {};
            showGmuPanel(buildGmuPopupContent(layer), props2.GMUID||'', props2.MOOSEDAU||'');
        }
    });
};

map.on('click', () => { if (!dockIsOpen) { state.currentSelection=null; clearAllHovers(); } });

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
(async () => {
    console.log('🗺  Colorado Moose Finder initializing…');
    await Promise.all([loadGmuData(), loadMooseHabitatData()]);
    Promise.all([
        loadCoreHabitatData(), loadFederalData(), loadSwaData(), loadCountyData(),
        loadAccessZoneData(), loadTrailheadData(),
        loadMooseLayer({path:CONFIG.DATA_PATHS.mooseSummer,    stateKey:'mooseSummer',    layerGroup:layers.mooseSummer,    pane:'mooseSummerPane',  fillColor:'#f39c12',fillOpacity:0.35,label:'Moose Summer Range'}),
        loadMooseLayer({path:CONFIG.DATA_PATHS.mooseWinter,    stateKey:'mooseWinter',    layerGroup:layers.mooseWinter,    pane:'mooseWinterPane',  fillColor:'#3498db',fillOpacity:0.35,label:'Moose Winter Range'}),
        loadMooseLayer({path:CONFIG.DATA_PATHS.mooseMigration, stateKey:'mooseMigration', layerGroup:layers.mooseMigration, pane:'mooseMigPane',     fillColor:'#9b59b6',fillOpacity:0.35,label:'Moose Migration Corridors'}),
        loadBoundaryLayer({ path:CONFIG.DATA_PATHS.mooseDaus, stateKey:'mooseDaus', layerGroup:layers.mooseDaus, pane:'mooseDauPane',  color:'#e74c3c', label:'Moose DAU', idField:'DAU_NAME' }),
        loadBoundaryLayer({ path:CONFIG.DATA_PATHS.mooseGmus, stateKey:'mooseGmus', layerGroup:layers.mooseGmus, pane:'mooseGmuPane',  color:'#1abc9c', label:'Moose GMU', idField:'GMUID' })
    ]).then(() => console.log('✅ Colorado Moose Finder ready'));
})();
