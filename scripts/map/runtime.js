/* Moteur de la carte des rêves (tourne dans une page à part : WebView sur Android, iframe sur web/PC).
 * Aucune carte géographique : un parchemin vierge où n'apparaissent que les lieux rêvés.
 * Reçoit l'état depuis l'app ({type:'state', places, selectedId, fit, view}) et renvoie
 * les actions (select, move, view). Voir src/map/DreamMap.tsx. */
(function () {
  'use strict';
  var L = window.L;

  // ------------------------------------------------------------ Communication avec l'app
  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent && window.parent !== window) window.parent.postMessage({ __dreammap: true, payload: s }, '*');
  }
  function onMessage(e) {
    var d = e.data;
    if (d && d.__dreammapHost) d = d.payload;
    if (typeof d === 'string') {
      try {
        d = JSON.parse(d);
      } catch (_) {
        return;
      }
    }
    if (!d || !d.type) return;
    if (d.type === 'state') applyState(d);
    else if (d.type === 'focus') focus(d.id);
    else if (d.type === 'fit') fitAll(true);
  }
  window.addEventListener('message', onMessage);
  document.addEventListener('message', onMessage);

  // ------------------------------------------------------------ Calculs (identiques à src/map/geometry.ts)
  var MIN_PX = 16, MAX_PX = 180;
  function iconPx(size, zoom) {
    var factor = Math.min(1.7, Math.max(0.42, Math.pow(2, (zoom - 12) * 0.3)));
    var px = (22 + 12 * (size || 3)) * factor;
    return Math.round(Math.min(MAX_PX, Math.max(MIN_PX, px)));
  }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    var s = seed || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ------------------------------------------------------------ La carte
  var map = L.map('map', {
    crs: L.CRS.EPSG3857,
    zoomControl: false,
    attributionControl: false,
    minZoom: 2,
    maxZoom: 20,
    zoomSnap: 0.25,
    zoomDelta: 0.75,
    wheelPxPerZoomLevel: 110,
    maxBounds: [[-85, -200], [85, 200]],
    maxBoundsViscosity: 0.8,
    worldCopyJump: false,
    tap: true,
  }).setView([46.6, 2.4], 5);

  // Papier : texture dessinée tuile par tuile (elle suit la carte quand on la déplace).
  var Paper = L.GridLayer.extend({
    createTile: function (c) {
      var tile = document.createElement('canvas');
      tile.width = tile.height = 256;
      var g = tile.getContext('2d');
      var r = rng(hash(c.x + ':' + c.y + ':' + c.z));
      for (var i = 0; i < 260; i++) {
        var a = r() * 0.07;
        g.fillStyle = r() > 0.5 ? 'rgba(220,200,255,' + a + ')' : 'rgba(5,3,15,' + (a * 1.6) + ')';
        g.fillRect(r() * 256, r() * 256, 1 + r() * 1.6, 1 + r() * 1.6);
      }
      g.lineWidth = 0.6;
      for (var j = 0; j < 9; j++) {
        g.strokeStyle = 'rgba(200,180,255,' + (0.025 + r() * 0.03) + ')';
        g.beginPath();
        var x = r() * 256, y = r() * 256, ang = r() * Math.PI, len = 10 + r() * 40;
        g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + r() * 6, y + Math.sin(ang) * len * 0.5 + r() * 6, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        g.stroke();
      }
      return tile;
    },
  });
  new Paper({ pane: 'tilePane', updateWhenZooming: false, keepBuffer: 4 }).addTo(map);

  // Méridiens et parallèles à l'encre, plus fins quand on zoome.
  var gridRenderer = L.canvas({ padding: 0.3 });
  var gridLayer = L.layerGroup().addTo(map);
  function gridStep(z) {
    if (z < 3) return 30;
    if (z < 5) return 10;
    if (z < 7) return 5;
    if (z < 9) return 1;
    if (z < 11) return 0.25;
    if (z < 13) return 0.05;
    if (z < 15) return 0.01;
    return 0.002;
  }
  function drawGrid() {
    gridLayer.clearLayers();
    var b = map.getBounds().pad(0.3);
    var step = gridStep(map.getZoom());
    var style = { renderer: gridRenderer, color: '#6b5f9e', weight: 1, opacity: 0.28, dashArray: '1 7', interactive: false };
    var s = Math.max(-85, b.getSouth()), n = Math.min(85, b.getNorth());
    var w = Math.max(-200, b.getWest()), e = Math.min(200, b.getEast());
    var count = 0;
    for (var lat = Math.ceil(s / step) * step; lat <= n && count < 80; lat += step, count++) L.polyline([[lat, w], [lat, e]], style).addTo(gridLayer);
    count = 0;
    for (var lon = Math.ceil(w / step) * step; lon <= e && count < 80; lon += step, count++) L.polyline([[s, lon], [n, lon]], style).addTo(gridLayer);
  }
  map.on('moveend', drawGrid);

  // ------------------------------------------------------------ Lieux
  var markers = {}; // id -> { marker, place }
  var places = [];
  var selectedId = null;
  var firstState = true;

  function stainSvg(place) {
    var cols = place.colors && place.colors.length ? place.colors.slice(0, 4) : null;
    var r = rng(hash(place.id));
    var out = '<svg class="stain" viewBox="0 0 200 200" aria-hidden="true">';
    var list = cols || ['#b8955c'];
    for (var i = 0; i < list.length; i++) {
      var cx = 100 + (r() - 0.5) * 50, cy = 100 + (r() - 0.5) * 50;
      var rad = 40 + r() * 20;
      var pts = [], n = 10;
      for (var k = 0; k < n; k++) {
        var a = (k / n) * Math.PI * 2, rr = rad * (0.7 + r() * 0.35);
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      var d = 'M' + ((pts[0][0] + pts[n - 1][0]) / 2).toFixed(1) + ' ' + ((pts[0][1] + pts[n - 1][1]) / 2).toFixed(1);
      for (var q = 0; q < n; q++) {
        var p = pts[q], o = pts[(q + 1) % n];
        d += ' Q' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ' + ((p[0] + o[0]) / 2).toFixed(1) + ' ' + ((p[1] + o[1]) / 2).toFixed(1);
      }
      var op = cols ? 0.5 - i * 0.05 : 0.16;
      out += '<path d="' + d + 'Z" fill="' + esc(list[i]) + '" fill-opacity="' + op + '" filter="url(#wc)"/>';
    }
    return out + '</svg>';
  }

  function iconFor(place, group) {
    var px = iconPx(place.size, map.getZoom(), place.lat);
    var count = group ? group.count : 1;
    if (count > 1) px = Math.max(px, 30); // un regroupement reste lisible même tout petit
    var showLabel = px >= 28 || place.id === selectedId || count > 1;
    var fontPx = Math.max(12, Math.min(22, Math.round(px * 0.2)));
    var label = count > 1 ? group.label : place.name;
    var cls = 'pl' + (place.id === selectedId ? ' sel' : '') + (place.kind === 'vehicle' ? ' veh' : '') + (place.real ? ' real' : ' dream') + (place.draggable ? ' drag' : '') + (count > 1 ? ' grp' : '');
    var html =
      '<div class="' + cls + '" style="width:' + px + 'px;height:' + px + 'px">' +
      '<div class="stainWrap">' + stainSvg(place) + '</div>' +
      '<svg class="ico" viewBox="0 0 512 512" role="img" aria-label="' + esc(place.name) + '">' + place.icon + '</svg>' +
      (count > 1 ? badge(px, count) : '') +
      (showLabel ? '<div class="lbl' + (count > 1 && group.area ? ' area' : '') + '" style="font-size:' + fontPx + 'px">' + esc(label) + '</div>' : '') +
      '</div>';
    return L.divIcon({ className: 'plWrap', html: html, iconSize: [px, px], iconAnchor: [px / 2, px / 2] });
  }

  function badge(px, count) {
    var b = Math.round(Math.max(15, Math.min(24, px * 0.42)));
    return '<div class="badge" style="min-width:' + b + 'px;height:' + b + 'px;line-height:' + (b - 2) + 'px;font-size:' + Math.round(b * 0.6) + 'px;right:' + -Math.round(b * 0.75) + 'px;top:' + -Math.round(b * 0.45) + 'px">×' + count + '</div>';
  }

  function zOffset(place) {
    var z = (place.layer || 0) * 100000 + (8 - place.size) * 1000;
    if (place.kind === 'vehicle') z += 500;
    if (place.id === selectedId) z += 10000000;
    return z;
  }

  function upsert(place) {
    var cur = markers[place.id];
    if (!cur) {
      var m = L.marker([place.lat, place.lon], { icon: iconFor(place), draggable: !!place.draggable, keyboard: true, title: place.name, riseOnHover: false, autoPanOnFocus: false });
      m.on('click', function () {
        var c = markers[place.id];
        if (c && c.group && c.group.count > 1 && zoomInto(c.group)) return;
        send({ type: 'select', id: place.id });
      });
      m.on('dragstart', function () {
        m._dragging = true;
      });
      m.on('dragend', function () {
        m._dragging = false;
        var ll = m.getLatLng();
        markers[place.id].place.lat = ll.lat;
        markers[place.id].place.lon = ll.lng;
        send({ type: 'move', id: place.id, lat: ll.lat, lon: ll.lng });
        declutter();
      });
      m.addTo(map);
      markers[place.id] = { marker: m, place: place };
      cur = markers[place.id];
    } else {
      cur.place = place;
      if (!cur.marker._dragging) cur.marker.setLatLng([place.lat, place.lon]);
      cur.marker.setIcon(iconFor(place, cur.group));
      if (cur.marker.dragging) place.draggable ? cur.marker.dragging.enable() : cur.marker.dragging.disable();
    }
    cur.marker.setZIndexOffset(zOffset(place));
  }

  // ------------------------------------------------------------ Regroupement au dézoom
  // Quand des lieux se chevauchent, on ne garde que le plus gros (le lieu choisi passe toujours devant) ;
  // pour de vrais lieux, le regroupement prend le nom de leur zone commune : quartier → ville →
  // département → région → pays (même logique que src/map/cluster.ts).
  var ADMIN_LEVELS = ['district', 'city', 'county', 'state', 'country'];
  function commonArea(admins) {
    var list = admins.filter(Boolean);
    if (list.length < 2) return null;
    for (var i = 0; i < ADMIN_LEVELS.length; i++) {
      var k = ADMIN_LEVELS[i];
      var v = list[0][k];
      if (v && list.every(function (a) { return a[k] === v; })) return v;
    }
    return null;
  }
  function footprint(place, zoom) {
    var px = iconPx(place.size, zoom);
    // Les noms s'écrivent sous le dessin : ils prennent de la place en largeur.
    return { w: px >= 28 ? Math.max(px, 120) : px, h: px + (px >= 28 ? 22 : 0) };
  }
  function priority(a, b) {
    if ((a.id === selectedId) !== (b.id === selectedId)) return a.id === selectedId ? -1 : 1;
    if ((a.kind === 'vehicle') !== (b.kind === 'vehicle')) return a.kind === 'vehicle' ? 1 : -1;
    if (b.size !== a.size) return b.size - a.size;
    if ((b.layer || 0) !== (a.layer || 0)) return (b.layer || 0) - (a.layer || 0);
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  }
  function declutter() {
    var zoom = map.getZoom();
    var list = [];
    for (var id in markers) list.push(markers[id]);
    list.sort(function (a, b) { return priority(a.place, b.place); });
    var groups = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var pt = map.latLngToLayerPoint(c.marker.getLatLng());
      var fp = footprint(c.place, zoom);
      var host = null;
      if (c.place.kind !== 'vehicle' && !c.marker._dragging) {
        for (var j = 0; j < groups.length; j++) {
          var g = groups[j];
          if (g.lead.place.kind === 'vehicle') continue;
          if (Math.abs(g.pt.x - pt.x) < (g.fp.w + fp.w) / 2 * 0.85 && Math.abs(g.pt.y - pt.y) < (g.fp.h + fp.h) / 2 * 0.85) {
            host = g;
            break;
          }
        }
      }
      if (host) host.members.push(c);
      else groups.push({ lead: c, pt: pt, fp: fp, members: [c] });
    }
    for (var k = 0; k < groups.length; k++) {
      var gr = groups[k];
      var real = gr.members.filter(function (m) { return m.place.real; }).map(function (m) { return m.place.admin; });
      var area = gr.members.length > 1 && real.length === gr.members.length ? commonArea(real) : null;
      var info = { count: gr.members.length, area: !!area, label: area || gr.lead.place.name, members: gr.members };
      for (var n = 0; n < gr.members.length; n++) {
        var m = gr.members[n];
        var lead = m === gr.lead;
        m.group = lead ? info : null;
        m.hidden = !lead;
        if (lead) {
          if (!map.hasLayer(m.marker)) m.marker.addTo(map);
          m.marker.setIcon(iconFor(m.place, info));
          m.marker.setZIndexOffset(zOffset(m.place));
        } else if (map.hasLayer(m.marker)) map.removeLayer(m.marker);
      }
    }
  }
  /** Clic sur un regroupement : on zoome pour séparer ses lieux. Faux s'ils sont au même endroit. */
  function zoomInto(group) {
    var pts = group.members.map(function (m) { return m.marker.getLatLng(); });
    var b = L.latLngBounds(pts);
    var target = Math.min(map.getMaxZoom(), map.getBoundsZoom(b.pad(0.6)));
    if (target <= map.getZoom() + 0.2) {
      if (map.getZoom() >= map.getMaxZoom() - 0.5) return false;
      target = Math.min(map.getMaxZoom(), map.getZoom() + 2);
    }
    map.flyTo(b.getCenter(), target, { duration: 0.7 });
    return true;
  }
  map.on('zoomend', declutter);

  function applyState(s) {
    places = s.places || [];
    selectedId = s.selectedId || null;
    var seen = {};
    var added = [];
    for (var i = 0; i < places.length; i++) {
      var p = places[i];
      if (typeof p.lat !== 'number' || typeof p.lon !== 'number' || isNaN(p.lat) || isNaN(p.lon)) continue;
      seen[p.id] = true;
      if (!markers[p.id]) added.push(p);
      upsert(p);
    }
    for (var id in markers) {
      if (!seen[id]) {
        map.removeLayer(markers[id].marker);
        delete markers[id];
      }
    }
    document.getElementById('empty').style.display = places.length ? 'none' : 'flex';
    declutter();
    if (firstState) {
      firstState = false;
      if (s.view && places.length) {
        map.setView([s.view.lat, s.view.lon], s.view.zoom, { animate: false });
        // La fenêtre a pu changer de taille (format téléphone…) : si des lieux sont hors de vue, on recadre.
        var vb = map.getBounds().pad(-0.08);
        var out = places.some(function (p) {
          return !vb.contains([p.lat, p.lon]);
        });
        if (out) fitAll(false);
      } else fitAll(false);
      drawGrid();
    } else if (s.fit) fitAll(true);
    else if (added.length) {
      // Un nouveau lieu vient d'apparaître : on recadre pour le montrer.
      var b = map.getBounds();
      var hidden = added.some(function (a) {
        return !b.contains([a.lat, a.lon]);
      });
      var crowded = map.getZoom() < 8;
      if (hidden || crowded) fitAll(true);
    }
  }

  function fitAll(animate) {
    var pts = [];
    for (var id in markers) pts.push(markers[id].marker.getLatLng());
    if (!pts.length) return map.setView([46.6, 2.4], 5, { animate: animate });
    if (pts.length === 1) return map.setView(pts[0], 12, { animate: animate });
    map.fitBounds(L.latLngBounds(pts).pad(0.25), { animate: animate, maxZoom: 14 });
  }

  function focus(id) {
    var c = markers[id];
    if (!c) return;
    var targetZoom = Math.max(map.getZoom(), Math.min(16, 19 - c.place.size * 1.6));
    if (c.hidden) targetZoom = Math.max(targetZoom, Math.min(map.getMaxZoom(), map.getZoom() + 3));
    map.flyTo(c.marker.getLatLng(), targetZoom, { duration: 0.8 });
  }

  map.on('click', function () {
    send({ type: 'select', id: null });
  });
  var viewTimer = null;
  map.on('moveend', function () {
    clearTimeout(viewTimer);
    viewTimer = setTimeout(function () {
      var c = map.getCenter();
      send({ type: 'view', lat: c.lat, lon: c.lng, zoom: map.getZoom() });
    }, 300);
  });

  // Boutons zoom / tout voir
  document.getElementById('zin').onclick = function () {
    map.zoomIn();
  };
  document.getElementById('zout').onclick = function () {
    map.zoomOut();
  };
  document.getElementById('zfit').onclick = function () {
    fitAll(true);
  };

  window.__dreamMap = { map: map, markers: markers }; // pour les tests
  drawGrid();
  send({ type: 'ready' });
})();
