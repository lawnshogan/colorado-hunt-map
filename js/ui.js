'use strict';

/* ════════════════════════════════════════════════
   UI — left panel, search, layer panel, basemap.
   Depends on: config.js, map.js
════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════
   LEFT PANEL CONTROLS
════════════════════════════════════════════════ */
document.getElementById('cmd-toggle').addEventListener('click', () => {
    const body    = document.getElementById('cmd-body');
    const arrow   = document.getElementById('cmd-arrow');
    const toggle  = document.getElementById('cmd-toggle');
    const collapsed = body.classList.toggle('collapsed');
    arrow.textContent = collapsed ? '▲' : '▼';
    toggle.classList.toggle('alone', collapsed);
    // When EXPANDING the left panel, close the dock entirely so they don't compete
    if (!collapsed && typeof closeDock === 'function') {
        closeDock();
    }
});

document.getElementById('regs-toggle').addEventListener('click', () => {
    const body  = document.getElementById('regs-body');
    const arrow = document.getElementById('regs-arrow');
    const col   = body.classList.toggle('collapsed');
    arrow.classList.toggle('open', !col);
});

document.getElementById('res-toggle').addEventListener('click', () => {
    const body  = document.getElementById('res-body');
    const arrow = document.getElementById('res-arrow');
    const col   = body.classList.toggle('collapsed');
    arrow.classList.toggle('open', !col);
});

/* ── Autocomplete GMU search ─────────────────── */
const acEl     = document.getElementById('gmu-autocomplete');
const searchEl = document.getElementById('gmu-search-input');
let acIndex = -1;

function showAutocomplete(q) {
    if (!q || !state.gmuFeatures.length) { acEl.classList.remove('visible'); return; }
    const matches = state.gmuFeatures.filter(f => String(f.properties.GMUID).includes(q)).slice(0,8);
    if (!matches.length) { acEl.classList.remove('visible'); return; }
    acEl.innerHTML = matches.map((f,i) => {
        const id = f.properties.GMUID;
        const hl = String(id).replace(new RegExp(`(${q})`, 'gi'), '<b>$1</b>');
        return `<div class="ac-item" data-id="${id}" data-index="${i}">Unit ${hl}</div>`;
    }).join('');
    acEl.classList.add('visible'); acIndex = -1;
    acEl.querySelectorAll('.ac-item').forEach(item => {
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            zoomToGmu(item.dataset.id);
            acEl.classList.remove('visible');
            searchEl.value = `Unit ${item.dataset.id}`;
        });
    });
}
searchEl.addEventListener('input',  e => showAutocomplete(e.target.value.trim()));
searchEl.addEventListener('blur',   () => setTimeout(() => acEl.classList.remove('visible'), 150));
searchEl.addEventListener('keydown', e => {
    const items = acEl.querySelectorAll('.ac-item');
    if      (e.key==='ArrowDown')  { acIndex=Math.min(acIndex+1,items.length-1); }
    else if (e.key==='ArrowUp')    { acIndex=Math.max(acIndex-1,0); }
    else if (e.key==='Enter') {
        if (acIndex>=0&&items[acIndex]) {
            const id=items[acIndex].dataset.id;
            zoomToGmu(id); acEl.classList.remove('visible'); searchEl.value=`Unit ${id}`;
        } else { zoomToGmu(searchEl.value.trim()); }
        return;
    } else return;
    items.forEach((el,i) => el.classList.toggle('highlighted', i===acIndex));
});
document.getElementById('search-btn').addEventListener('click', () => {
    zoomToGmu(searchEl.value.trim()); acEl.classList.remove('visible');
});

/* ════════════════════════════════════════════════
   LAYER PANEL
════════════════════════════════════════════════ */
document.getElementById('layer-panel-header').addEventListener('click', () => {
    const body = document.getElementById('layer-panel-body');
    const col  = body.classList.toggle('collapsed');
    document.getElementById('layer-panel').classList.toggle('body-hidden', col);
    document.getElementById('layer-panel-arrow').textContent = col ? '▲' : '▼';
});
document.querySelectorAll('.lp-group-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
        document.getElementById('group-' + hdr.dataset.group).classList.toggle('collapsed');
        hdr.querySelector('.lp-group-arrow').classList.toggle('collapsed');
    });
});

let activeBase = baseLayers.osm;
function setBase(key, btnId) {
    if (activeBase !== baseLayers[key]) { map.removeLayer(activeBase); map.addLayer(baseLayers[key]); activeBase = baseLayers[key]; }
    document.querySelectorAll('.lp-basemap-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
}
document.getElementById('btn-osm').addEventListener('click',       () => setBase('osm',       'btn-osm'));
document.getElementById('btn-satellite').addEventListener('click', () => setBase('satellite', 'btn-satellite'));
document.getElementById('btn-hillshade').addEventListener('click', () => setBase('hillshade', 'btn-hillshade'));

const overlayMap = {
    'chk-gmu':layers.gmu, 'chk-county':layers.county,
    'chk-mooseHabitat':layers.mooseHabitat, 'chk-coreHabitat':layers.coreHabitat,
    'chk-mooseSummer':layers.mooseSummer, 'chk-mooseWinter':layers.mooseWinter,
    'chk-mooseMigration':layers.mooseMigration, 'chk-mooseDaus':layers.mooseDaus,
    'chk-mooseGmus':layers.mooseGmus, 'chk-federal':layers.federal, 'chk-swa':layers.swa,
    'chk-trailheads':layers.trailheads, 'chk-accessZone':layers.accessZone
};
const subLegends = { 'chk-coreHabitat':'core-sublabel', 'chk-federal':'federal-sublabel', 'chk-swa':'swa-sublabel' };

Object.entries(overlayMap).forEach(([id, lg]) => {
    const chk = document.getElementById(id);
    if (!chk) return;
    chk.addEventListener('change', () => {
        chk.checked ? map.addLayer(lg) : map.removeLayer(lg);
        if (subLegends[id]) {
            const el = document.getElementById(subLegends[id]);
            el.style.display = chk.checked ? 'flex' : 'none';
            if (chk.checked) el.style.flexDirection = 'column';
        }
    });
    chk.closest('.lp-row').addEventListener('click', e => e.stopPropagation());
});
