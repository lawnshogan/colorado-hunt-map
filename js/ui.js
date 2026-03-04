'use strict';

/* ════════════════════════════════════════════════
   UI — left panel collapse / expand, regulations
   & resources sub-toggles, GMU autocomplete search,
   desktop layer panel group toggles, basemap
   switcher (desktop + mobile synced), overlay
   checkbox wiring (desktop ↔ mobile mirrored).
   Depends on: config.js, map.js
════════════════════════════════════════════════ */

/* ── "Unit Search & Info" section toggle ──────
   Starts collapsed (body has class="collapsed").
   Arrow ▲ = body is closed; ▼ = body is open.
────────────────────────────────────────────── */
/* ── "Unit Search & Info" section toggle ──────
   Mutual-collapse rules:
   • Opening Unit Search → minimize dock (if open), collapse Layer List
   • Opening Layer List  → collapse Unit Search
   These work on both desktop and mobile.
────────────────────────────────────────────── */
document.getElementById('cmd-toggle').addEventListener('click', () => {
    const body    = document.getElementById('cmd-body');
    const arrow   = document.getElementById('cmd-arrow');
    const toggle  = document.getElementById('cmd-toggle');
    const collapsed = body.classList.toggle('collapsed');
    arrow.textContent = collapsed ? '▲' : '▼';
    toggle.classList.toggle('alone', collapsed);

    if (!collapsed) {
        /* Opening Unit Search: minimize dock + collapse Layer List */
        if (typeof dockIsOpen !== 'undefined' && dockIsOpen) minimizeDock();
        const mlBody  = document.getElementById('mobile-layers-body');
        const mlArrow = document.getElementById('mobile-layers-arrow');
        if (mlBody && !mlBody.classList.contains('collapsed')) {
            mlBody.classList.add('collapsed');
            if (mlArrow) mlArrow.textContent = '▲';
        }
    }
});

/* ── Mobile "Layer List" section toggle ───────*/
const mlToggle = document.getElementById('mobile-layers-toggle');
const mlBody   = document.getElementById('mobile-layers-body');
const mlArrow  = document.getElementById('mobile-layers-arrow');
if (mlToggle && mlBody) {
    mlToggle.addEventListener('click', () => {
        const collapsed = mlBody.classList.toggle('collapsed');
        if (mlArrow) mlArrow.textContent = collapsed ? '▲' : '▼';

        if (!collapsed) {
            /* Opening Layer List: minimize dock + collapse Unit Search */
            if (typeof dockIsOpen !== 'undefined' && dockIsOpen) minimizeDock();
            const cmdBody  = document.getElementById('cmd-body');
            const cmdArrow = document.getElementById('cmd-arrow');
            const cmdToggle = document.getElementById('cmd-toggle');
            if (cmdBody && !cmdBody.classList.contains('collapsed')) {
                cmdBody.classList.add('collapsed');
                if (cmdArrow) cmdArrow.textContent = '▲';
                if (cmdToggle) cmdToggle.classList.add('alone');
            }
        }
    });
}

/* ── Regulations sub-collapse ─────────────── */
document.getElementById('regs-toggle').addEventListener('click', () => {
    const body  = document.getElementById('regs-body');
    const arrow = document.getElementById('regs-arrow');
    const col   = body.classList.toggle('collapsed');
    arrow.classList.toggle('open', !col);
});

/* ── Resources sub-collapse ───────────────── */
document.getElementById('res-toggle').addEventListener('click', () => {
    const body  = document.getElementById('res-body');
    const arrow = document.getElementById('res-arrow');
    const col   = body.classList.toggle('collapsed');
    arrow.classList.toggle('open', !col);
});

/* ════════════════════════════════════════════════
   GMU AUTOCOMPLETE SEARCH
════════════════════════════════════════════════ */
const acEl     = document.getElementById('gmu-autocomplete');
const searchEl = document.getElementById('gmu-search-input');
let acIndex = -1;

function showAutocomplete(q) {
    if (!q || !state.gmuFeatures.length) { acEl.classList.remove('visible'); return; }
    const matches = state.gmuFeatures
        .filter(f => String(f.properties.GMUID).includes(q))
        .slice(0, 8);
    if (!matches.length) { acEl.classList.remove('visible'); return; }
    acEl.innerHTML = matches.map((f, i) => {
        const id = f.properties.GMUID;
        const hl = String(id).replace(new RegExp(`(${q})`, 'gi'), '<b>$1</b>');
        return `<div class="ac-item" data-id="${id}" data-index="${i}">Unit ${hl}</div>`;
    }).join('');
    acEl.classList.add('visible');
    acIndex = -1;
    acEl.querySelectorAll('.ac-item').forEach(item => {
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            zoomToGmu(item.dataset.id);
            acEl.classList.remove('visible');
            searchEl.value = `Unit ${item.dataset.id}`;
        });
    });
}
searchEl.addEventListener('input',   e => showAutocomplete(e.target.value.trim()));
searchEl.addEventListener('blur',    () => setTimeout(() => acEl.classList.remove('visible'), 150));
searchEl.addEventListener('keydown', e => {
    const items = acEl.querySelectorAll('.ac-item');
    if (e.key === 'ArrowDown') { acIndex = Math.min(acIndex + 1, items.length - 1); }
    else if (e.key === 'ArrowUp')  { acIndex = Math.max(acIndex - 1, 0); }
    else if (e.key === 'Enter') {
        if (acIndex >= 0 && items[acIndex]) {
            const id = items[acIndex].dataset.id;
            zoomToGmu(id); acEl.classList.remove('visible'); searchEl.value = `Unit ${id}`;
        } else { zoomToGmu(searchEl.value.trim()); }
        return;
    } else return;
    items.forEach((el, i) => el.classList.toggle('highlighted', i === acIndex));
});
document.getElementById('search-btn').addEventListener('click', () => {
    zoomToGmu(searchEl.value.trim()); acEl.classList.remove('visible');
});

/* ════════════════════════════════════════════════
   DESKTOP LAYER PANEL
════════════════════════════════════════════════ */
document.getElementById('layer-panel-header').addEventListener('click', () => {
    const body = document.getElementById('layer-panel-body');
    const col  = body.classList.toggle('collapsed');
    document.getElementById('layer-panel').classList.toggle('body-hidden', col);
    document.getElementById('layer-panel-arrow').textContent = col ? '▲' : '▼';
});

document.querySelectorAll('.lp-group-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
        const grp = document.getElementById('group-' + hdr.dataset.group);
        if (grp) grp.classList.toggle('collapsed');
        hdr.querySelector('.lp-group-arrow').classList.toggle('collapsed');
    });
});

/* ════════════════════════════════════════════════
   BASEMAP SWITCHER
   setBase() updates both desktop and mobile buttons.
════════════════════════════════════════════════ */
let activeBase = baseLayers.osm;

function setBase(key) {
    if (activeBase !== baseLayers[key]) {
        map.removeLayer(activeBase);
        map.addLayer(baseLayers[key]);
        activeBase = baseLayers[key];
    }
    /* Deactivate all basemap buttons (desktop + mobile) */
    document.querySelectorAll('.lp-basemap-btn').forEach(b => b.classList.remove('active'));
    /* Activate the matching pair */
    const desk = document.getElementById('btn-' + key);
    const mob  = document.getElementById('m-btn-' + key);
    if (desk) desk.classList.add('active');
    if (mob)  mob.classList.add('active');
}

document.getElementById('btn-osm').addEventListener('click',       () => setBase('osm'));
document.getElementById('btn-satellite').addEventListener('click', () => setBase('satellite'));
document.getElementById('btn-hillshade').addEventListener('click', () => setBase('hillshade'));

/* Mobile basemap buttons */
['osm', 'satellite', 'hillshade'].forEach(key => {
    const btn = document.getElementById('m-btn-' + key);
    if (btn) btn.addEventListener('click', () => setBase(key));
});

/* ════════════════════════════════════════════════
   OVERLAY CHECKBOX WIRING
   Each layer has a desktop checkbox (chk-*) and an
   optional mobile mirror (m-chk-*).  Toggling either
   updates the map layer and syncs the other checkbox.
════════════════════════════════════════════════ */
const overlayMap = {
    'chk-gmu':           layers.gmu,
    'chk-county':        layers.county,
    'chk-mooseHabitat':  layers.mooseHabitat,
    'chk-coreHabitat':   layers.coreHabitat,
    'chk-mooseSummer':   layers.mooseSummer,
    'chk-mooseWinter':   layers.mooseWinter,
    'chk-mooseMigration':layers.mooseMigration,
    'chk-mooseDaus':     layers.mooseDaus,
    'chk-mooseGmus':     layers.mooseGmus,
    'chk-federal':       layers.federal,
    'chk-swa':           layers.swa,
    'chk-trailheads':    layers.trailheads,
    'chk-accessZone':    layers.accessZone,
    'chk-water':         layers.water
};

/* Sub-legend elements shown/hidden with their parent layer */
const subLegends = {
    'chk-coreHabitat': 'core-sublabel',
    'chk-federal':     'federal-sublabel',
    'chk-swa':         'swa-sublabel'
};

function wireCheckbox(desktopId, layerGroup) {
    const mobileId = desktopId.replace('chk-', 'm-chk-');

    function applyChange(on) {
        on ? map.addLayer(layerGroup) : map.removeLayer(layerGroup);
        /* Sync sub-legend */
        if (subLegends[desktopId]) {
            const legend = document.getElementById(subLegends[desktopId]);
            if (legend) {
                legend.style.display = on ? 'flex' : 'none';
                if (on) legend.style.flexDirection = 'column';
            }
        }
    }

    const deskEl = document.getElementById(desktopId);
    const mobEl  = document.getElementById(mobileId);

    if (deskEl) {
        deskEl.addEventListener('change', () => {
            applyChange(deskEl.checked);
            if (mobEl) mobEl.checked = deskEl.checked;
        });
        deskEl.closest('.lp-row')?.addEventListener('click', e => e.stopPropagation());
    }
    if (mobEl) {
        mobEl.addEventListener('change', () => {
            applyChange(mobEl.checked);
            if (deskEl) deskEl.checked = mobEl.checked;
        });
        mobEl.closest('.lp-row')?.addEventListener('click', e => e.stopPropagation());
    }
}

Object.entries(overlayMap).forEach(([id, lg]) => wireCheckbox(id, lg));
