'use strict';

/* ════════════════════════════════════════════════
   MAP — base layers, map init, pane registration,
   layer groups, application state, extent history,
   and GPS locate control.
   Depends on: config.js
════════════════════════════════════════════════ */

/* ── Base layers ────────────────────────────────── */
const baseLayers = {
    osm:       L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    { attribution:'&copy; OpenStreetMap contributors', maxZoom:19 }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    { attribution:'Tiles &copy; Esri', maxZoom:19 }),
    hillshade: L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}',
                    { attribution:'USGS National Map', maxZoom:16, opacity:0.9 })
};

/* ── Map — autoPanPadding keeps popups clear of panels ── */
const map = L.map('map', {
    center: CONFIG.MAP_CENTER,
    zoom: CONFIG.MAP_ZOOM,
    layers: [baseLayers.osm],
    zoomControl: true
});

/* ── Custom popup opening with auto-pan padding ── */
// Override map.openPopup to always push popup clear of left/right panels
const _origOpenPopup = map.openPopup.bind(map);
map.openPopup = function(popup, latlng, options) {
    return _origOpenPopup(popup, latlng, {
        autoPanPaddingTopLeft:    L.point(310, 70),   // clear of left panel + title
        autoPanPaddingBottomRight: L.point(260, 60),  // clear of layer panel
        ...options
    });
};

/* ── Panes ─────────────────────────────────────── */
const PANES = {
    accessZonePane:340, forestRoadPane:345,
    federalPane:350, countyPane:360,
    mooseWinterPane:370, mooseSummerPane:375,
    mooseMigPane:380, mooseHabitatPane:385, coreHabitatPane:388,
    mooseDauPane:390, mooseGmuPane:395, gmuPane:400,
    swaPane:450, trailheadPane:470, labelPane:650
};
Object.entries(PANES).forEach(([n,z]) => { map.createPane(n); map.getPane(n).style.zIndex = z; });

/* ── Layer groups ──────────────────────────────── */
const layers = {
    gmu: L.layerGroup().addTo(map),
    mooseHabitat: L.layerGroup().addTo(map),
    coreHabitat: L.layerGroup().addTo(map), mooseDaus: L.layerGroup(), mooseGmus: L.layerGroup(),
    mooseMigration: L.layerGroup(), mooseSummer: L.layerGroup(), mooseWinter: L.layerGroup(),
    county: L.layerGroup(), federal: L.layerGroup(), swa: L.layerGroup(),
    trailheads: L.layerGroup(), accessZone: L.layerGroup()
};

/* ── State ─────────────────────────────────────── */
const state = {
    geoJsonLayers: Object.fromEntries(Object.keys(layers).map(k=>[k,null])),
    rawGeoJSON: { mooseHabitat:null, coreHabitat:null, federal:null, swa:null, accessZone:null },
    trailheadFeatures: [],   // raw point features for proximity query
    gmuFeatures: [],
    currentSelection: null, locationMarker: null, locating: false
};

/* ════════════════════════════════════════════════
   EXTENT HISTORY
════════════════════════════════════════════════ */
const extentHistory = { stack: [], idx: -1, recording: true };

function recordExtent() {
    if (!extentHistory.recording) return;
    const center = map.getCenter();
    const zoom   = map.getZoom();
    // Truncate forward history when navigating from mid-stack
    extentHistory.stack = extentHistory.stack.slice(0, extentHistory.idx + 1);
    extentHistory.stack.push({ center, zoom });
    extentHistory.idx = extentHistory.stack.length - 1;
    updateExtentBtns();
}

function updateExtentBtns() {
    const prevBtn = document.getElementById('btn-prev-extent');
    const nextBtn = document.getElementById('btn-next-extent');
    prevBtn.classList.toggle('disabled', extentHistory.idx <= 0);
    nextBtn.classList.toggle('disabled', extentHistory.idx >= extentHistory.stack.length - 1);
}

map.on('moveend', recordExtent);

document.getElementById('btn-home').addEventListener('click', () => {
    extentHistory.recording = false;
    map.setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);
    setTimeout(() => { extentHistory.recording = true; }, 500);
});

document.getElementById('btn-prev-extent').addEventListener('click', () => {
    if (extentHistory.idx <= 0) return;
    extentHistory.idx--;
    const e = extentHistory.stack[extentHistory.idx];
    extentHistory.recording = false;
    map.setView(e.center, e.zoom, { animate:true });
    setTimeout(() => { extentHistory.recording = true; updateExtentBtns(); }, 500);
    updateExtentBtns();
});

document.getElementById('btn-next-extent').addEventListener('click', () => {
    if (extentHistory.idx >= extentHistory.stack.length - 1) return;
    extentHistory.idx++;
    const e = extentHistory.stack[extentHistory.idx];
    extentHistory.recording = false;
    map.setView(e.center, e.zoom, { animate:true });
    setTimeout(() => { extentHistory.recording = true; updateExtentBtns(); }, 500);
    updateExtentBtns();
});

/* ════════════════════════════════════════════════
   GPS LOCATE (wired into #nav-controls)
════════════════════════════════════════════════ */
const locateBtn = document.getElementById('locate-btn');
L.DomEvent.disableClickPropagation(document.getElementById('nav-controls'));

locateBtn.addEventListener('click', () => {
    if (state.locating) return;
    state.locating = true;
    locateBtn.classList.add('active');
    map.locate({ setView:true, maxZoom:14 });
});
map.on('locationfound', e => {
    state.locating = false; locateBtn.classList.remove('active');
    if (state.locationMarker) map.removeLayer(state.locationMarker);
    state.locationMarker = L.circleMarker(e.latlng, {
        radius:9, fillColor:'#3498db', color:'#fff', weight:2.5, fillOpacity:0.92
    }).addTo(map);

    const accFt = e.accuracy ? Math.round(e.accuracy * 3.281) : null;
    const lat   = e.latlng.lat.toFixed(5);
    const lng   = e.latlng.lng.toFixed(5);
    const elev  = e.altitude ? Math.round(e.altitude * 3.281) + ' ft' : '—';

    const locContent = `
        <div class="loc-popup">
            <div class="loc-popup-header">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                    <circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="white" stroke="none"/>
                    <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                </svg>
                <span>Your Location</span>
            </div>
            <div class="loc-popup-body">
                <div class="loc-row"><span class="loc-label">Latitude</span><span class="loc-val">${lat}°</span></div>
                <div class="loc-row"><span class="loc-label">Longitude</span><span class="loc-val">${lng}°</span></div>
                ${accFt ? `<div class="loc-row"><span class="loc-label">Accuracy</span><span class="loc-val">± ${accFt} ft</span></div>` : ''}
                ${e.altitude ? `<div class="loc-row"><span class="loc-label">Elevation</span><span class="loc-val">${elev}</span></div>` : ''}
            </div>
        </div>`;

    state.locationMarker.bindPopup(locContent, { maxWidth:220, minWidth:180 }).openPopup();
});
map.on('locationerror', () => { state.locating=false; locateBtn.classList.remove('active'); });