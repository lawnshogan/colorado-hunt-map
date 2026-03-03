'use strict';

/* ════════════════════════════════════════════════
   POPUP — unit info dock controller, spatial
   coverage analysis (20×20 grid PIP), Haversine
   trailhead proximity, GMU popup HTML builder,
   and coverage card renderer.
   Depends on: config.js, map.js, ui.js
════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════
   UNIT INFO DOCK — slide-up panel controller
════════════════════════════════════════════════ */
const unitDock       = document.getElementById('unit-dock');
const unitDockBody   = document.getElementById('unit-dock-body');
const unitDockScroll = document.getElementById('unit-dock-scroll');
const unitDockTab    = document.getElementById('unit-dock-tab');
const unitDockTitle  = document.getElementById('unit-dock-tab-title');
const unitDockSub    = document.getElementById('unit-dock-tab-sub');
const dockMinBtn     = document.getElementById('dock-minimize-btn');
const dockCloseBtn   = document.getElementById('dock-close-btn');

let dockIsOpen = false;

/* ── Left panel helpers ─────────────────────── */
function collapseCmdPanel() {
    const body   = document.getElementById('cmd-body');
    const arrow  = document.getElementById('cmd-arrow');
    const toggle = document.getElementById('cmd-toggle');
    body.classList.add('collapsed');
    arrow.textContent = '▲';
    toggle.classList.add('alone');
}
function expandCmdPanel() {
    const body   = document.getElementById('cmd-body');
    const arrow  = document.getElementById('cmd-arrow');
    const toggle = document.getElementById('cmd-toggle');
    body.classList.remove('collapsed');
    arrow.textContent = '▼';
    toggle.classList.remove('alone');
}

function openDock(content, titleText, subText) {
    unitDockScroll.innerHTML = content;
    unitDockTitle.textContent = titleText || 'Unit Info';
    unitDockSub.textContent   = subText   || '';
    unitDock.classList.add('active');
    unitDockBody.classList.add('open');
    dockIsOpen = true;
    collapseCmdPanel();   // collapse left panel when popup opens
    L.DomEvent.disableClickPropagation(unitDock);
}

function minimizeDock() {
    unitDockBody.classList.remove('open');
    dockIsOpen = false;
}

function closeDock() {
    minimizeDock();
    setTimeout(() => unitDock.classList.remove('active'), 50);
    state.currentSelection = null;
    clearAllHovers();
}

function expandDock() {
    unitDockBody.classList.add('open');
    dockIsOpen = true;
}

/* Tab click — toggle open/minimize */
unitDockTab.addEventListener('click', e => {
    if (e.target === dockMinBtn || e.target.closest('#dock-minimize-btn') ||
        e.target === dockCloseBtn || e.target.closest('#dock-close-btn')) return;
    if (!unitDock.classList.contains('active')) return;
    dockIsOpen ? minimizeDock() : expandDock();
});

dockMinBtn.addEventListener('click',   e => { e.stopPropagation(); minimizeDock(); });
dockCloseBtn.addEventListener('click', e => { e.stopPropagation(); closeDock(); });

map.on('click', () => { if (dockIsOpen) minimizeDock(); });

function showGmuPanel(content, gmuId, dauInfo) {
    const titleText = gmuId ? `Unit ${gmuId}${dauInfo ? '  ·  DAU ' + dauInfo : ''}` : 'Unit Info';
    openDock(content, titleText, 'Colorado Game Management Unit');
}

/* ════════════════════════════════════════════════
   HOVER / SELECTION
════════════════════════════════════════════════ */
const clearAllHovers = () => {
    Object.values(state.geoJsonLayers).forEach(l => {
        if (l?.resetStyle) { try { l.resetStyle(); } catch(e) {} }
    });
    if (state.currentSelection) {
        try { state.currentSelection.setStyle(CONFIG.ACTIVE_STYLE); } catch(e) {}
    }
};

const HOVER_STYLE = { color:'#00FFFF', weight:3, fillOpacity:0.12 };

const setupInteractions = (layer, popupFn) => {
    layer.on({
        mouseover: e => {
            if (state.currentSelection === layer) return;
            layer.setStyle(HOVER_STYLE);
            layer.bringToFront();
        },
        mouseout: e => {
            if (state.currentSelection === layer) {
                layer.setStyle(CONFIG.ACTIVE_STYLE);
            } else {
                const parent = state.geoJsonLayers.gmu;
                if (parent?.resetStyle) try { parent.resetStyle(layer); } catch(e) {}
            }
        },
        click: e => {
            L.DomEvent.stopPropagation(e);
            if (state.currentSelection && state.currentSelection !== layer) {
                const parent = state.geoJsonLayers.gmu;
                if (parent?.resetStyle) try { parent.resetStyle(state.currentSelection); } catch(e) {}
            }
            state.currentSelection = layer;
            layer.setStyle(CONFIG.ACTIVE_STYLE);
            layer.bringToFront();
            const props = layer.feature?.properties || {};
            const gmuId = props.GMUID || '';
            const dauId = props.MOOSEDAU || '';
            const content = popupFn(layer);
            showGmuPanel(content, gmuId, dauId);
        }
    });
};

/* ════════════════════════════════════════════════
   SPATIAL COVERAGE — 20×20 grid PIP
════════════════════════════════════════════════ */
function estimateCoverage(gmuLayer, rawFeatures, filterFn) {
    if (!rawFeatures?.length) return null;
    const b = gmuLayer.getBounds();
    const GRID=20, dLat=(b.getNorth()-b.getSouth())/GRID, dLng=(b.getEast()-b.getWest())/GRID;
    const candidates = filterFn ? rawFeatures.filter(filterFn) : rawFeatures;
    let inGmu=0, inTarget=0;
    for (let i=0; i<=GRID; i++) for (let j=0; j<=GRID; j++) {
        const pt=[b.getWest()+j*dLng, b.getSouth()+i*dLat];
        if (!ptInGeom(pt, gmuLayer.feature.geometry)) continue;
        inGmu++;
        if (candidates.some(f => ptInGeom(pt, f.geometry))) inTarget++;
    }
    return inGmu===0 ? null : Math.round((inTarget/inGmu)*100);
}
function ptInGeom(pt, geom) {
    if (!geom) return false;
    if (geom.type==='Polygon')      return ptInPoly(pt, geom.coordinates[0]);
    if (geom.type==='MultiPolygon') return geom.coordinates.some(p => ptInPoly(pt, p[0]));
    return false;
}
function ptInPoly(pt, ring) {
    const [x,y]=pt; let inside=false;
    for (let i=0,j=ring.length-1; i<ring.length; j=i++) {
        const [xi,yi]=ring[i],[xj,yj]=ring[j];
        if (((yi>y)!==(yj>y)) && (x<(xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside;
    }
    return inside;
}

/* Haversine distance in miles */
function distMiles(a, b) {
    const R=3958.8, toRad=d=>d*Math.PI/180;
    const dLat=toRad(b[1]-a[1]), dLng=toRad(b[0]-a[0]);
    const x=Math.sin(dLat/2)**2 + Math.cos(toRad(a[1]))*Math.cos(toRad(b[1]))*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

/* Find trailheads within 10 miles of GMU centroid */
function nearbyTrailheads(gmuLayer, maxMiles=10) {
    if (!state.trailheadFeatures.length) return [];
    const b = gmuLayer.getBounds();
    const centroid = [(b.getWest()+b.getEast())/2, (b.getSouth()+b.getNorth())/2];
    return state.trailheadFeatures
        .filter(f => { const c=f.geometry?.coordinates; return c && distMiles(centroid,c)<=maxMiles; })
        .map(f => {
            const p = f.properties;
            const raw = p.name||p.Name||p.NAME||p.TrlhdName||p.TrailheadName
                       ||p.TRAILHEADNAME||p.Trailhead_Name||p.trailhead_name||p.NAME_ALT||'';
            const name = String(raw||'').trim();
            if (!name) return null;
            const coords = f.geometry.coordinates;
            const display = (name === name.toUpperCase() && name.length > 2)
                ? name.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_,b,c) => b+c.toUpperCase())
                : name;
            return { name: display, coords };
        })
        .filter(Boolean)
        .sort((a,b) => a.name.localeCompare(b.name));
}

/* ════════════════════════════════════════════════
   TRAILHEAD HIGHLIGHT MARKER
   A pulsing highlight circle shown when the user
   clicks a trailhead name inside the GMU popup.
════════════════════════════════════════════════ */
let _thHighlightLayer = null;

function highlightTrailhead(lat, lng, name) {
    // Remove previous highlight
    if (_thHighlightLayer) { map.removeLayer(_thHighlightLayer); _thHighlightLayer = null; }

    // Enable trailhead layer if off
    const chk = document.getElementById('chk-trailheads');
    if (chk && !chk.checked) { chk.checked = true; map.addLayer(layers.trailheads); }

    // Zoom to point
    map.setView([lat, lng], 15, { animate: true });

    // After zoom, add highlight ring + named label popup
    setTimeout(() => {
        _thHighlightLayer = L.layerGroup().addTo(map);

        // Outer pulsing ring
        L.circleMarker([lat, lng], {
            radius: 18, color: '#00FFFF', weight: 3,
            fillColor: '#00FFFF', fillOpacity: 0.15,
            className: 'th-highlight-ring', pane: 'trailheadPane'
        }).addTo(_thHighlightLayer);

        // Inner dot
        L.circleMarker([lat, lng], {
            radius: 6, color: '#bf360c', weight: 2,
            fillColor: '#e65100', fillOpacity: 1,
            pane: 'trailheadPane'
        }).addTo(_thHighlightLayer);

        // Labeled popup
        const popup = L.popup({
            offset: [0, -8], closeButton: true,
            className: 'th-highlight-popup',
            autoPan: false
        })
        .setLatLng([lat, lng])
        .setContent(`
            <div class="th-popup-inner">
                <div class="th-popup-header">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>Trailhead</span>
                </div>
                <div class="th-popup-name">${name}</div>
                <div class="th-popup-coords">${lat.toFixed(5)}°N, ${Math.abs(lng).toFixed(5)}°W</div>
            </div>`)
        .addTo(map);

        // Clean up highlight when popup closes
        popup.on('remove', () => {
            if (_thHighlightLayer) { map.removeLayer(_thHighlightLayer); _thHighlightLayer = null; }
        });
    }, 350);
}

/* ════════════════════════════════════════════════
   GMU POPUP
════════════════════════════════════════════════ */
function renderCovCard(title, rows) {
    return `<div class="cov-card"><div class="cov-card-title">${title}</div>${
        rows.map(r => `
            <div class="cov-row"><span class="cov-label">${r.label}</span><span class="cov-pct">${r.pct!=null?r.pct+'%':'—'}</span></div>
            ${r.pct!=null?`<div class="cov-bar-track"><div class="cov-bar-fill" style="width:${r.pct}%;background:${r.color};"></div></div>`:''}`
        ).join('')
    }</div>`;
}

function buildGmuPopupContent(leafletLayer) {
    const props  = leafletLayer.feature.properties;
    const gmuId  = props.GMUID;
    const dauInfo = props.MOOSEDAU ? `<span style="font-size:0.68em;opacity:0.55;margin-left:7px;">DAU ${props.MOOSEDAU}</span>` : '';

    const species = [
        {name:'Elk',val:props.ELKDAU},{name:'Deer',val:props.DEERDAU},{name:'Pronghorn',val:props.ANTDAU},
        {name:'Moose',val:props.MOOSEDAU},{name:'Bear',val:props.BEARDAU},{name:'Lion',val:props.LIONDAU}
    ];
    const speciesHtml = species.map(s => {
        const v=String(s.val||'').trim(), ok=v.length>=2&&v!=='0'&&!v.includes('99');
        return `<div class="sp-chip ${ok?'yes':'no'}"><div class="sp-dot"></div>${s.name}</div>`;
    }).join('');

    const noData = '<div style="font-size:0.74em;color:#aaa;padding:4px 0;">Load layer to compute.</div>';

    setTimeout(() => {
        const el = document.getElementById(`pu-cov-${gmuId}`) ||
                   unitDockScroll.querySelector(`[id="pu-cov-${gmuId}"]`);
        if (!el) return;

        const { mooseHabitat:habF, coreHabitat:coreF, federal:fedF, swa:swaF, accessZone:azF } = state.rawGeoJSON;

        const hab = habF ? {
            exc:  estimateCoverage(leafletLayer, habF, f=>f.properties.habitat_quality?.toLowerCase()==='excellent'),
            good: estimateCoverage(leafletLayer, habF, f=>f.properties.habitat_quality?.toLowerCase()==='good'),
            mod:  estimateCoverage(leafletLayer, habF, f=>f.properties.habitat_quality?.toLowerCase()==='moderate'),
            low:  estimateCoverage(leafletLayer, habF, f=>{ const q=f.properties.habitat_quality?.toLowerCase(); return q&&!['excellent','good','moderate'].includes(q); })
        } : null;

        const core = coreF ? {
            lg: estimateCoverage(leafletLayer, coreF, f=>f.properties.habitat_tier==='Large Core'),
            md: estimateCoverage(leafletLayer, coreF, f=>f.properties.habitat_tier==='Medium Core'),
            sm: estimateCoverage(leafletLayer, coreF, f=>f.properties.habitat_tier==='Small Core')
        } : null;

        const fed = fedF ? {
            usfs: estimateCoverage(leafletLayer, fedF, f=>f.properties.ADMIN_AGEN==='USFS'),
            blm:  estimateCoverage(leafletLayer, fedF, f=>f.properties.ADMIN_AGEN==='BLM'),
            nps:  estimateCoverage(leafletLayer, fedF, f=>f.properties.ADMIN_AGEN==='NPS')
        } : null;

        const swa = swaF ? {
            swa:  estimateCoverage(leafletLayer, swaF, f=>f.properties.PropType!=='SP'),
            park: estimateCoverage(leafletLayer, swaF, f=>f.properties.PropType==='SP')
        } : null;

        const azTotal = azF ? estimateCoverage(leafletLayer, azF) : null;

        const nearby = nearbyTrailheads(leafletLayer);
        const thListHtml = nearby.length
            ? `<ul class="th-list">${nearby.map(t =>
                `<li data-lng="${t.coords[0]}" data-lat="${t.coords[1]}" class="th-item">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${t.name}
                </li>`
              ).join('')}</ul>`
            : `<div class="th-list-empty">${state.trailheadFeatures.length ? 'No trailheads within 10 miles.' : 'Load trailheads layer to show access points.'}</div>`;

        el.innerHTML = `
            <div class="coverage-grid">
                ${hab  ? renderCovCard('Habitat Quality',  [{label:'Excellent',pct:hab.exc,color:'#1a6e3c'},{label:'Good',pct:hab.good,color:'#52b788'},{label:'Moderate',pct:hab.mod,color:'#95d5b2'},{label:'Low/Other',pct:hab.low,color:'#d4edda'}])
                        : `<div class="cov-card"><div class="cov-card-title">Habitat Quality</div>${noData}</div>`}
                ${core ? renderCovCard('Year-Round Range', [{label:'Primary',pct:core.lg,color:'#7b2d8b'},{label:'Secondary',pct:core.md,color:'#b85cc8'},{label:'Remnant',pct:core.sm,color:'#dba3e8'}])
                        : `<div class="cov-card"><div class="cov-card-title">Year-Round Range</div>${noData}</div>`}
                ${fed  ? renderCovCard('Federal Lands',    [{label:'USFS',pct:fed.usfs,color:'#27ae60'},{label:'BLM',pct:fed.blm,color:'#e67e22'},{label:'NPS',pct:fed.nps,color:'#9b59b6'}])
                        : `<div class="cov-card"><div class="cov-card-title">Federal Lands</div>${noData}</div>`}
                ${swa  ? renderCovCard('State Lands',      [{label:'SWA',pct:swa.swa,color:'#c8b400'},{label:'State Park',pct:swa.park,color:'#ff4444'}])
                        : `<div class="cov-card"><div class="cov-card-title">State Lands</div>${noData}</div>`}
            </div>
            ${azTotal!=null ? `
            <div class="pu-divider" style="margin:7px -15px;"></div>
            <div class="pu-section-title">Trailhead Access (10-mi Radius)</div>
            <div class="cov-card" style="margin-bottom:6px;">
                <div class="cov-row"><span class="cov-label">Unit area within 10 mi of a trailhead</span><span class="cov-pct">${azTotal}%</span></div>
                <div class="cov-bar-track"><div class="cov-bar-fill" style="width:${azTotal}%;background:#f0a500;"></div></div>
            </div>` : ''}
            <div class="pu-section-title" style="margin-top:${azTotal!=null?'0':'8px'};">Nearby Trailheads (&le;10 mi)</div>
            ${thListHtml}`;

        // Animate bars
        requestAnimationFrame(() => el.querySelectorAll('.cov-bar-fill').forEach(bar => {
            const w=bar.style.width; bar.style.width='0'; requestAnimationFrame(()=>{ bar.style.width=w; });
        }));

        // Wire trailhead clicks — zoom, highlight, label
        el.querySelectorAll('.th-item').forEach(li => {
            li.addEventListener('click', () => {
                const lat = parseFloat(li.dataset.lat);
                const lng = parseFloat(li.dataset.lng);
                const name = li.textContent.trim();
                if (!isNaN(lat) && !isNaN(lng)) {
                    minimizeDock();
                    highlightTrailhead(lat, lng, name);
                }
            });
        });

    }, 10);

    return `
        <div class="pu-header">
            <div class="pu-unit-label">Colorado Game Management Unit</div>
            <div class="pu-unit-title">Unit ${gmuId}${dauInfo}</div>
            <div class="pu-unit-subtitle">Moose Hunting Unit · Colorado Parks &amp; Wildlife</div>
        </div>
        <div class="pu-body">
            <div class="pu-section-title">Huntable Species</div>
            <div class="species-grid">${speciesHtml}</div>
            <div class="pu-divider"></div>
            <div class="pu-section-title">Unit Coverage Analysis</div>
            <div id="pu-cov-${gmuId}">
                <div class="pu-computing"><div class="pu-spinner"></div>Computing spatial coverage…</div>
            </div>
        </div>`;
}
