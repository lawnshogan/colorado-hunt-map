'use strict';

/* ════════════════════════════════════════════════
   POPUP.JS — dock controller, hover/select,
   coverage analysis, NHD water stats, GMU popup.
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

function collapseCmdPanel() {
    const body = document.getElementById('cmd-body');
    const arrow = document.getElementById('cmd-arrow');
    const toggle = document.getElementById('cmd-toggle');
    if (!body.classList.contains('collapsed')) {
        body.classList.add('collapsed');
        arrow.textContent = '▲';
        toggle.classList.add('alone');
    }
}
function collapseLayerPanel() {
    const mlBody = document.getElementById('mobile-layers-body');
    const mlArrow = document.getElementById('mobile-layers-arrow');
    if (mlBody && !mlBody.classList.contains('collapsed')) {
        mlBody.classList.add('collapsed');
        if (mlArrow) mlArrow.textContent = '▲';
    }
}
function openDock(content, titleText, subText) {
    unitDockScroll.innerHTML = content;
    unitDockTitle.textContent = titleText || 'Unit Info';
    unitDockSub.textContent = subText || '';
    unitDock.classList.add('active');
    unitDockBody.classList.add('open');
    dockIsOpen = true;
    collapseCmdPanel();
    collapseLayerPanel();
    L.DomEvent.disableClickPropagation(unitDock);
}
function minimizeDock() { unitDockBody.classList.remove('open'); dockIsOpen = false; }
function expandDock()   { unitDockBody.classList.add('open');    dockIsOpen = true;  }
function closeDock() {
    minimizeDock();
    setTimeout(() => unitDock.classList.remove('active'), 50);
    const prev = state.currentSelection;
    state.currentSelection = null;
    if (prev) prev.setStyle(prev._defaultStyle || GMU_DEFAULT_STYLE);
}

unitDockTab.addEventListener('click', e => {
    if (e.target.closest('#dock-minimize-btn') || e.target.closest('#dock-close-btn')) return;
    if (!unitDock.classList.contains('active')) return;
    dockIsOpen ? minimizeDock() : expandDock();
});
dockMinBtn.addEventListener('click',   e => { e.stopPropagation(); minimizeDock(); });
dockCloseBtn.addEventListener('click', e => { e.stopPropagation(); closeDock(); });
map.on('click', () => { if (dockIsOpen) minimizeDock(); });

function showGmuPanel(content, gmuId, dauInfo) {
    openDock(content,
        gmuId ? 'Unit ' + gmuId + (dauInfo ? '  \u00b7  DAU ' + dauInfo : '') : 'Unit Info',
        'Colorado Game Management Unit');
}

/* ── HOVER / SELECTION ─────────────────────────
   BUG FIX: null currentSelection BEFORE calling
   restoreLayerStyle(prev) so it takes the default
   branch, not the ACTIVE_STYLE branch.
────────────────────────────────────────────── */
const GMU_DEFAULT_STYLE = { color:'#000', weight:1, fillOpacity:0.03, fillColor:'#000' };

function restoreLayerStyle(layer) {
    if (!layer) return;
    if (state.currentSelection === layer) {
        layer.setStyle(CONFIG.ACTIVE_STYLE);
    } else {
        layer.setStyle(layer._defaultStyle || GMU_DEFAULT_STYLE);
    }
}

const setupInteractions = (leafletLayer, popupFn) => {
    leafletLayer._defaultStyle = Object.assign({}, GMU_DEFAULT_STYLE);
    leafletLayer.on({
        mouseover: function(e) {
            L.DomEvent.stopPropagation(e);
            if (state.currentSelection === leafletLayer) return;
            leafletLayer.setStyle(CONFIG.HOVER_STYLE);
            leafletLayer.bringToFront();
        },
        mouseout: function() {
            if (state.currentSelection !== leafletLayer) {
                leafletLayer.setStyle(leafletLayer._defaultStyle || GMU_DEFAULT_STYLE);
            }
        },
        click: function(e) {
            L.DomEvent.stopPropagation(e);
            var prev = state.currentSelection;
            state.currentSelection = null;      /* NULL FIRST — critical */
            if (prev && prev !== leafletLayer) restoreLayerStyle(prev);
            state.currentSelection = leafletLayer;
            leafletLayer.setStyle(CONFIG.ACTIVE_STYLE);
            leafletLayer.bringToFront();
            var props = leafletLayer.feature ? leafletLayer.feature.properties : {};
            showGmuPanel(popupFn(leafletLayer), props.GMUID || '', props.MOOSEDAU || '');
        }
    });
};

/* ── SPATIAL COVERAGE ── */
function estimateCoverage(gmuLayer, rawFeatures, filterFn) {
    if (!rawFeatures || !rawFeatures.length) return null;
    var b = gmuLayer.getBounds(), GRID = 20;
    var dLat = (b.getNorth() - b.getSouth()) / GRID;
    var dLng = (b.getEast()  - b.getWest())  / GRID;
    var candidates = filterFn ? rawFeatures.filter(filterFn) : rawFeatures;
    var inGmu = 0, inTarget = 0;
    for (var i = 0; i <= GRID; i++) {
        for (var j = 0; j <= GRID; j++) {
            var pt = [b.getWest() + j * dLng, b.getSouth() + i * dLat];
            if (!ptInGeom(pt, gmuLayer.feature.geometry)) continue;
            inGmu++;
            if (candidates.some(function(f){ return ptInGeom(pt, f.geometry); })) inTarget++;
        }
    }
    return inGmu === 0 ? null : Math.round((inTarget / inGmu) * 100);
}
function ptInGeom(pt, geom) {
    if (!geom) return false;
    if (geom.type === 'Polygon')      return ptInPoly(pt, geom.coordinates[0]);
    if (geom.type === 'MultiPolygon') return geom.coordinates.some(function(p){ return ptInPoly(pt, p[0]); });
    return false;
}
function ptInPoly(pt, ring) {
    var x=pt[0],y=pt[1],inside=false;
    for (var i=0,j=ring.length-1;i<ring.length;j=i++){
        var xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
        if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside;
    }
    return inside;
}
function distMiles(a,b){
    var R=3958.8,toRad=function(d){return d*Math.PI/180;};
    var dLat=toRad(b[1]-a[1]),dLng=toRad(b[0]-a[0]);
    var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toRad(a[1]))*Math.cos(toRad(b[1]))*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function nearbyTrailheads(gmuLayer, maxMiles) {
    maxMiles = maxMiles || 10;
    if (!state.trailheadFeatures.length) return [];
    var b = gmuLayer.getBounds();
    var centroid = [(b.getWest()+b.getEast())/2, (b.getSouth()+b.getNorth())/2];
    return state.trailheadFeatures
        .filter(function(f){ var c=f.geometry&&f.geometry.coordinates; return c&&distMiles(centroid,c)<=maxMiles; })
        .map(function(f){
            var p=f.properties;
            var raw=p.name||p.Name||p.NAME||p.TrlhdName||p.TrailheadName||p.TRAILHEADNAME||p.Trailhead_Name||p.trailhead_name||p.NAME_ALT||'';
            var name=String(raw||'').trim();
            if(!name) return null;
            var display=(name===name.toUpperCase()&&name.length>2)
                ?name.toLowerCase().replace(/(^|[\s-])([a-z])/g,function(_,a,c){return a+c.toUpperCase();})
                :name;
            return {name:display, coords:f.geometry.coordinates};
        })
        .filter(Boolean)
        .sort(function(a,b){return a.name.localeCompare(b.name);});
}

/* ── NHD WATER STATS ── */
/* Cross-browser timeout signal — AbortSignal.timeout() not in all browsers */
function makeTimeoutSignal(ms) {
    try { return AbortSignal.timeout(ms); }
    catch(e) { var c = new AbortController(); setTimeout(function(){ c.abort(); }, ms); return c.signal; }
}

async function fetchNhdStats(gmuLayer) {
    try {
        var b   = gmuLayer.getBounds();
        /* NHD REST API uses EPSG:4326 envelope: xmin,ymin,xmax,ymax */
        var env = b.getWest()+','+b.getSouth()+','+b.getEast()+','+b.getNorth();
        var base = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer';
        /* Common query params */
        var geo  = 'geometry='+encodeURIComponent(env)
                 + '&geometryType=esriGeometryEnvelope'
                 + '&inSR=4326'
                 + '&spatialRel=esriSpatialRelIntersects'
                 + '&returnGeometry=false&f=json';

        /* Layer 3 = Flow Direction (NHDFlowline) — no scale restriction, lowercase fields */
        /* Use outStatistics to sum lengthkm in one call — bypasses 2000-record limit     */
        var flowStats = encodeURIComponent(JSON.stringify([
            {statisticType:'sum', onStatisticField:'lengthkm', outStatisticFieldName:'total_km'},
            {statisticType:'count', onStatisticField:'lengthkm', outStatisticFieldName:'seg_count'}
        ]));
        /* Also get raw features limited to 500 just to count named features */
        var flowNamed = 'outFields=gnis_name&where=gnis_name+IS+NOT+NULL+AND+gnis_name+<>+%27%27&resultRecordCount=500';

        var sig = makeTimeoutSignal(10000);

        var [statRes, namedRes, bodyRes] = await Promise.allSettled([
            fetch(base+'/3/query?outStatistics='+flowStats+'&'+geo, {signal:sig}).then(function(r){ return r.json(); }),
            fetch(base+'/3/query?'+flowNamed+'&'+geo, {signal:sig}).then(function(r){ return r.json(); }),
            /* Layer 7 = NHDArea (open water polygons — lakes, ponds, reservoirs) */
            /* Use outStatistics to sum AreaSqKm */
            fetch(base+'/7/query?outStatistics='+encodeURIComponent(JSON.stringify([
                {statisticType:'sum',   onStatisticField:'areasqkm',  outStatisticFieldName:'total_area'},
                {statisticType:'count', onStatisticField:'areasqkm',  outStatisticFieldName:'body_count'}
            ]))+'&'+geo, {signal:sig}).then(function(r){ return r.json(); })
        ]);

        var streamMi = 0, streamCount = 0;
        if (statRes.status === 'fulfilled' && statRes.value && statRes.value.features && statRes.value.features[0]) {
            var attrs = statRes.value.features[0].attributes;
            streamMi    = Math.round((attrs.total_km || 0) * 0.621371);
            streamCount = attrs.seg_count || 0;
        }

        var bodyAcres = 0, bodyCount = 0;
        if (bodyRes.status === 'fulfilled' && bodyRes.value && bodyRes.value.features && bodyRes.value.features[0]) {
            var ba = bodyRes.value.features[0].attributes;
            bodyAcres = Math.round((ba.total_area || 0) * 247.105);
            bodyCount = ba.body_count || 0;
        }

        return {ok:true, streamMi:streamMi, streamCount:streamCount,
                bodyAcres:bodyAcres, bodyCount:bodyCount};
    } catch(err) {
        console.warn('NHD stats failed:', err.message);
        return {ok:false};
    }
}

/* ── WATER CARD ── */
function buildWaterCard(w) {
    if (!w.ok) {
        return '<div class="water-card water-card-empty">' +
            '<div class="water-card-hdr">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2.2" stroke-linecap="round"><path d="M12 2C6 9 3 13 3 17a9 9 0 0 0 18 0c0-4-3-8-9-15z"/></svg>' +
            'Water &amp; Hydrology</div>' +
            '<div class="water-unavail">NHD data unavailable — check adjacent unit or enable layer.</div>' +
            '</div>';
    }

    var streamLbl = w.streamMi   > 0 ? w.streamMi.toLocaleString()  + ' mi'  : '—';
    var segLbl    = w.streamCount > 0 ? w.streamCount                + ' seg.' : '—';
    var bodyLbl   = w.bodyAcres   > 0 ? w.bodyAcres.toLocaleString() + ' ac'  : '—';
    var bodyCtLbl = w.bodyCount   > 0 ? w.bodyCount                  + ' feat.': '—';

    var density = w.streamMi > 200 ? 'High' : w.streamMi > 80 ? 'Moderate' : w.streamMi > 0 ? 'Low' : 'None';
    var dColor  = {High:'#1a6e3c', Moderate:'#e67e22', Low:'#95a5a6', None:'#bbb'}[density];

    /* One concise sentence per tier */
    var ripNote = {
        High:     'Dense drainage network — prioritize creek confluences and willow-choked bends at dawn and dusk.',
        Moderate: 'Focus scouting on named drainages; moose concentrate where streams widen into meadow flats.',
        Low:      'Limited surface water — cross-reference Year-Round Range layer and look for springs on a topo.',
        None:     'Minimal NHD water detected; verify with a detailed topo before ruling this unit out.'
    }[density];

    return '<div class="water-card">' +
        '<div class="water-card-hdr">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" stroke-width="2.2" stroke-linecap="round"><path d="M12 2C6 9 3 13 3 17a9 9 0 0 0 18 0c0-4-3-8-9-15z"/></svg>' +
        'Water &amp; Hydrology' +
        '<span class="water-density-badge" style="background:'+dColor+'18;border:1px solid '+dColor+';color:'+dColor+';">' +
        '<span style="width:5px;height:5px;border-radius:50%;background:'+dColor+';display:inline-block;flex-shrink:0;margin-right:3px;vertical-align:middle;"></span>' +
        density+' Density</span></div>' +
        '<div class="water-stats-row">' +
        '<div class="water-stat"><div class="water-stat-val">'+streamLbl+'</div><div class="water-stat-lbl">Stream Length</div></div>' +
        '<div class="water-stat"><div class="water-stat-val">'+segLbl+'</div><div class="water-stat-lbl">Segments</div></div>' +
        '<div class="water-stat"><div class="water-stat-val">'+bodyLbl+'</div><div class="water-stat-lbl">Lakes &amp; Ponds</div></div>' +
        '<div class="water-stat"><div class="water-stat-val">'+bodyCtLbl+'</div><div class="water-stat-lbl">Water Bodies</div></div>' +
        '</div>' +
        '<div class="water-hunter-note">\uD83C\uDFF9 <strong>Hunter Note:</strong> '+ripNote+'</div>' +
        '</div>';
}

/* ── RICH POPUPS ── */
function buildHabitatPopup(props) {
    var q=String(props.habitat_quality||'').toLowerCase().trim();
    var label=q.charAt(0).toUpperCase()+q.slice(1)||'—';
    var color={excellent:'#1a6e3c',good:'#52b788',moderate:'#95d5b2'}[q]||'#aaa';
    var gmu=props.gmu_code||props.GMUID||'—', dau=props.dau_code||props.MOOSEDAU||'—';
    return '<div class="layer-popup"><div class="layer-popup-header" style="background:'+color+';">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'+
        '<span>Moose Habitat Quality</span></div>'+
        '<div class="layer-popup-body"><div class="lpu-badge" style="background:'+color+'18;border-color:'+color+';color:'+color+';">'+
        '<span class="lpu-badge-dot" style="background:'+color+';"></span>'+label+' Quality</div>'+
        '<div class="lpu-grid"><div class="lpu-row"><span class="lpu-label">GMU</span><span class="lpu-val">'+gmu+'</span></div>'+
        '<div class="lpu-row"><span class="lpu-label">DAU</span><span class="lpu-val">'+dau+'</span></div></div>'+
        '<div class="lpu-note"><strong>About this layer:</strong> CPW-derived habitat suitability integrating willow/riparian density, canopy cover, elevation, and proximity to water.</div>'+
        '<div class="lpu-hunter-note">🎯 <strong>Hunter Note:</strong> Focus glassing on Excellent-rated riparian corridors at dawn/dusk. Ponds and willow flats inside Excellent zones are prime ambush sites.</div>'+
        '</div></div>';
}
function buildRangePopup(props) {
    var tier=props.habitat_tier||'—';
    var cfg=CORE_COLORS[tier]||{fill:'#aaa',label:'Unknown'};
    var acres=props.area_acres!=null?Number(props.area_acres).toLocaleString()+' ac':'—';
    var ovIdx=props.overlap_index!=null?props.overlap_index:'—';
    return '<div class="layer-popup"><div class="layer-popup-header" style="background:'+cfg.fill+';">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>'+
        '<span>Year-Round Range</span></div>'+
        '<div class="layer-popup-body"><div class="lpu-badge" style="background:'+cfg.fill+'22;border-color:'+cfg.fill+';color:'+cfg.fill+';">'+
        '<span class="lpu-badge-dot" style="background:'+cfg.fill+';"></span>'+cfg.label+'</div>'+
        '<div class="lpu-grid"><div class="lpu-row"><span class="lpu-label">Area</span><span class="lpu-val">'+acres+'</span></div>'+
        '<div class="lpu-row"><span class="lpu-label">Seasonal Overlap Index</span><span class="lpu-val">'+ovIdx+'</span></div></div>'+
        '<div class="lpu-note"><strong>About this layer:</strong> CPW Data Analysis Unit framework. Primary (≥5,000 ac) = core multi-season range. Secondary = high-use satellite patches.</div>'+
        '<div class="lpu-hunter-note">🎯 <strong>Hunter Note:</strong> High Seasonal Overlap Index means moose use this polygon in both summer and winter — peak bull activity in October.</div>'+
        '</div></div>';
}
function buildAccessZonePopup(props) {
    var gmu=props.GMUID||props.gmu_code||'—';
    var thName=props.TrailheadName||props.TrlhdName||props.name||props.NAME||'—';
    var dist=props.buffer_miles||props.BUFFER_MILES||10;
    return '<div class="layer-popup"><div class="layer-popup-header" style="background:#b36b00;">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>'+
        '<span>Trailhead Access Zone</span></div>'+
        '<div class="layer-popup-body">'+
        '<div class="lpu-grid"><div class="lpu-row"><span class="lpu-label">Trailhead</span><span class="lpu-val">'+thName+'</span></div>'+
        '<div class="lpu-row"><span class="lpu-label">GMU</span><span class="lpu-val">'+gmu+'</span></div>'+
        '<div class="lpu-row"><span class="lpu-label">Buffer Radius</span><span class="lpu-val">'+dist+' miles</span></div></div>'+
        '<div class="lpu-note"><strong>About this layer:</strong> 10-mile radii around publicly accessible Colorado trailheads.</div>'+
        '<div class="lpu-hunter-note">🎯 <strong>Hunter Note:</strong> Habitat outside these zones means a multi-day spike camp — often far less pressure and larger bulls.</div>'+
        '</div></div>';
}

/* ── HARVEST CARD ── */
function buildHarvestCard(gmuId) {
    var h=state.harvestData[String(gmuId)];
    if(!h) return '<div class="harvest-card harvest-no-data"><div class="harvest-card-title">2024 Harvest Statistics<span class="harvest-source">CPW · All License Types</span></div><div class="harvest-no-data-msg">No draw data recorded for Unit '+gmuId+' in 2024.</div></div>';
    var TIER_COLOR={High:'#1a6e3c',Medium:'#e67e22',Low:'#c0392b','No Data':'#95a5a6'};
    var TIER_BG={High:'#eafaf1',Medium:'#fef9e7',Low:'#fdecea','No Data':'#f8f9fa'};
    var color=TIER_COLOR[h.success_tier]||'#95a5a6', bgColor=TIER_BG[h.success_tier]||'#f8f9fa';
    var barW=Math.min(h.success_pct,100);
    var barColor=h.success_pct>=80?'#1a6e3c':h.success_pct>=60?'#e67e22':'#c0392b';
    return '<div class="harvest-card">'+
        '<div class="harvest-card-title">2024 Harvest Statistics<span class="harvest-source">CPW · All License Types</span></div>'+
        '<div class="harvest-badge" style="background:'+bgColor+';border-color:'+color+';color:'+color+';">'+
        '<span class="harvest-badge-dot" style="background:'+color+';"></span>'+h.success_tier+' Success Rate</div>'+
        '<div class="harvest-stat-grid">'+
        '<div class="harvest-stat"><div class="harvest-stat-val">'+h.licenses+'</div><div class="harvest-stat-label">Licenses</div></div>'+
        '<div class="harvest-stat"><div class="harvest-stat-val">'+h.hunters+'</div><div class="harvest-stat-label">Hunters</div></div>'+
        '<div class="harvest-stat"><div class="harvest-stat-val">'+h.harvest+'</div><div class="harvest-stat-label">Harvested</div></div>'+
        '<div class="harvest-stat harvest-stat-highlight"><div class="harvest-stat-val" style="color:'+color+';">'+h.success_pct+'%</div><div class="harvest-stat-label">Success</div></div>'+
        '</div>'+
        '<div class="harvest-bar-label"><span>Success Rate</span><span>'+h.success_pct+'% vs 79% statewide avg</span></div>'+
        '<div class="harvest-bar-track"><div class="harvest-bar-fill" data-w="'+barW+'" style="width:0;background:'+barColor+';"></div></div>'+
        '<div class="harvest-footer">Avg. hunt duration: <strong>'+h.avg_days+' days</strong></div>'+
        '</div>';
}

/* ── COVERAGE CARD ── */
function renderCovCard(title, rows) {
    return '<div class="cov-card"><div class="cov-card-title">'+title+'</div>'+
        rows.map(function(r){
            return '<div class="cov-row"><span class="cov-label">'+r.label+'</span><span class="cov-pct">'+(r.pct!=null?r.pct+'%':'—')+'</span></div>'+
                (r.pct!=null?'<div class="cov-bar-track"><div class="cov-bar-fill" data-w="'+r.pct+'" style="width:0;background:'+r.color+';"></div></div>':'');
        }).join('')+'</div>';
}

/* ── GMU POPUP ── */
function buildGmuPopupContent(leafletLayer) {
    var props=leafletLayer.feature.properties;
    var gmuId=props.GMUID;
    var dauInfo=props.MOOSEDAU?'<span style="font-size:0.68em;opacity:0.55;margin-left:7px;">DAU '+props.MOOSEDAU+'</span>':'';
    var species=[
        {name:'Elk',val:props.ELKDAU},{name:'Deer',val:props.DEERDAU},
        {name:'Pronghorn',val:props.ANTDAU},{name:'Moose',val:props.MOOSEDAU},
        {name:'Bear',val:props.BEARDAU},{name:'Lion',val:props.LIONDAU}
    ];
    var speciesHtml=species.map(function(s){
        var v=String(s.val||'').trim(), ok=v.length>=2&&v!=='0'&&!v.includes('99');
        return '<div class="sp-chip '+(ok?'yes':'no')+'"><div class="sp-dot"></div>'+s.name+'</div>';
    }).join('');
    var noData='<div style="font-size:0.74em;color:#aaa;padding:4px 0;">Load layer to compute.</div>';

    setTimeout(async function() {
        var el=unitDockScroll.querySelector('#pu-cov-'+gmuId);
        if(!el) return;

        var habF=state.rawGeoJSON.mooseHabitat, coreF=state.rawGeoJSON.coreHabitat;
        var fedF=state.rawGeoJSON.federal, swaF=state.rawGeoJSON.swa, azF=state.rawGeoJSON.accessZone;

        /* NHD query + coverage run simultaneously */
        var nhdPromise=fetchNhdStats(leafletLayer);

        var hab=habF?{
            exc:estimateCoverage(leafletLayer,habF,function(f){return f.properties.habitat_quality&&f.properties.habitat_quality.toLowerCase()==='excellent';}),
            good:estimateCoverage(leafletLayer,habF,function(f){return f.properties.habitat_quality&&f.properties.habitat_quality.toLowerCase()==='good';}),
            mod:estimateCoverage(leafletLayer,habF,function(f){return f.properties.habitat_quality&&f.properties.habitat_quality.toLowerCase()==='moderate';}),
            low:estimateCoverage(leafletLayer,habF,function(f){var q=f.properties.habitat_quality&&f.properties.habitat_quality.toLowerCase();return q&&!['excellent','good','moderate'].includes(q);})
        }:null;
        var core=coreF?{
            lg:estimateCoverage(leafletLayer,coreF,function(f){return f.properties.habitat_tier==='Large Core';}),
            md:estimateCoverage(leafletLayer,coreF,function(f){return f.properties.habitat_tier==='Medium Core';}),
            sm:estimateCoverage(leafletLayer,coreF,function(f){return f.properties.habitat_tier==='Small Core';})
        }:null;
        var fed=fedF?{
            usfs:estimateCoverage(leafletLayer,fedF,function(f){return f.properties.ADMIN_AGEN==='USFS';}),
            blm:estimateCoverage(leafletLayer,fedF,function(f){return f.properties.ADMIN_AGEN==='BLM';}),
            nps:estimateCoverage(leafletLayer,fedF,function(f){return f.properties.ADMIN_AGEN==='NPS';})
        }:null;
        var swa=swaF?{
            swa:estimateCoverage(leafletLayer,swaF,function(f){return f.properties.PropType!=='SP';}),
            park:estimateCoverage(leafletLayer,swaF,function(f){return f.properties.PropType==='SP';})
        }:null;
        var azTotal=azF?estimateCoverage(leafletLayer,azF):null;
        var nearby=nearbyTrailheads(leafletLayer);
        var nhd=await nhdPromise;

        /* Guard — user may have clicked a different GMU */
        if(!unitDockScroll.querySelector('#pu-cov-'+gmuId)) return;

        var thListHtml=nearby.length
            ?'<ul class="th-list">'+nearby.map(function(t){
                return '<li data-lng="'+t.coords[0]+'" data-lat="'+t.coords[1]+'" class="th-item">'+
                    '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'+
                    t.name+'</li>';
            }).join('')+'</ul>'
            :'<div class="th-list-empty">'+(state.trailheadFeatures.length?'No trailheads within 10 miles.':'Load trailheads layer to show access points.')+'</div>';

        el.innerHTML=
            buildHarvestCard(gmuId)+
            '<div class="pu-divider" style="margin:10px -16px 8px;"></div>'+
            buildWaterCard(nhd)+
            '<div class="pu-divider" style="margin:8px -16px;"></div>'+
            '<div class="pu-section-title">Unit Coverage Analysis</div>'+
            '<div class="coverage-grid">'+
            (hab?renderCovCard('Habitat Quality',[{label:'Excellent',pct:hab.exc,color:'#1a6e3c'},{label:'Good',pct:hab.good,color:'#52b788'},{label:'Moderate',pct:hab.mod,color:'#95d5b2'},{label:'Low/Other',pct:hab.low,color:'#d4edda'}])
                :'<div class="cov-card"><div class="cov-card-title">Habitat Quality</div>'+noData+'</div>')+
            (core?renderCovCard('Year-Round Range',[{label:'Primary',pct:core.lg,color:'#7b2d8b'},{label:'Secondary',pct:core.md,color:'#b85cc8'},{label:'Remnant',pct:core.sm,color:'#dba3e8'}])
                :'<div class="cov-card"><div class="cov-card-title">Year-Round Range</div>'+noData+'</div>')+
            (fed?renderCovCard('Federal Lands',[{label:'USFS',pct:fed.usfs,color:'#27ae60'},{label:'BLM',pct:fed.blm,color:'#e67e22'},{label:'NPS',pct:fed.nps,color:'#9b59b6'}])
                :'<div class="cov-card"><div class="cov-card-title">Federal Lands</div>'+noData+'</div>')+
            (swa?renderCovCard('State Lands',[{label:'SWA',pct:swa.swa,color:'#c8b400'},{label:'State Park',pct:swa.park,color:'#ff4444'}])
                :'<div class="cov-card"><div class="cov-card-title">State Lands</div>'+noData+'</div>')+
            '</div>'+
            (azTotal!=null?'<div class="pu-divider" style="margin:7px -16px;"></div><div class="pu-section-title">Trailhead Access (10-mi Radius)</div><div class="cov-card" style="margin-bottom:6px;"><div class="cov-row"><span class="cov-label">Unit area within 10 mi of a trailhead</span><span class="cov-pct">'+azTotal+'%</span></div><div class="cov-bar-track"><div class="cov-bar-fill" data-w="'+azTotal+'" style="width:0;background:#f0a500;"></div></div></div>':'')+
            '<div class="pu-section-title" style="margin-top:'+(azTotal!=null?'0':'8px')+';">Nearby Trailheads (&le;10 mi)</div>'+
            thListHtml;

        requestAnimationFrame(function(){
            el.querySelectorAll('.cov-bar-fill,.harvest-bar-fill').forEach(function(bar){
                var w=bar.dataset.w; bar.style.width='0';
                requestAnimationFrame(function(){ bar.style.width=(w||0)+'%'; });
            });
        });

        /* Trailhead click: zoom + open matching marker popup */
        el.querySelectorAll('.th-item').forEach(function(li){
            li.addEventListener('click', function(){
                var lat=parseFloat(li.dataset.lat), lng=parseFloat(li.dataset.lng);
                if(isNaN(lat)||isNaN(lng)) return;
                var chkD=document.getElementById('chk-trailheads');
                var chkM=document.getElementById('m-chk-trailheads');
                if(chkD&&!chkD.checked){chkD.checked=true;if(chkM)chkM.checked=true;map.addLayer(layers.trailheads);}
                minimizeDock();
                map.setView([lat, lng], 13, { animate: true });

                /* setTimeout is more reliable than map.once('moveend') —
                   ensures the map has fully panned before openPopup is called. */
                setTimeout(function() {
                    var found = false;
                    layers.trailheads.eachLayer(function(child) {
                        if (found) return;
                        var scan = child.eachLayer ? child : null;
                        if (scan) {
                            scan.eachLayer(function(marker) {
                                if (found || !marker.getLatLng) return;
                                var ml = marker.getLatLng();
                                if (Math.abs(ml.lat-lat) < 0.00015 && Math.abs(ml.lng-lng) < 0.00015) {
                                    found = true; marker.openPopup();
                                }
                            });
                        } else if (child.getLatLng) {
                            var ml = child.getLatLng();
                            if (Math.abs(ml.lat-lat) < 0.00015 && Math.abs(ml.lng-lng) < 0.00015) {
                                found = true; child.openPopup();
                            }
                        }
                    });
                }, 450);
            });
        });
    }, 10);

    return '<div class="pu-header">'+
        '<div class="pu-unit-label">Colorado Game Management Unit</div>'+
        '<div class="pu-unit-title">Unit '+gmuId+dauInfo+'</div>'+
        '<div class="pu-unit-subtitle">Moose Hunting Unit \u00b7 Colorado Parks &amp; Wildlife</div>'+
        '</div>'+
        '<div class="pu-body">'+
        '<div class="pu-section-title">Huntable Species</div>'+
        '<p class="pu-species-note">DAU assignments from CPW GMU boundary attributes \u2014 a filled DAU ID indicates an active management unit for that species.</p>'+
        '<div class="species-grid">'+speciesHtml+'</div>'+
        '<div class="pu-divider"></div>'+
        '<div id="pu-cov-'+gmuId+'">'+
        '<div class="pu-computing"><div class="pu-spinner"></div>Fetching water data &amp; computing coverage\u2026</div>'+
        '</div></div>';
}
