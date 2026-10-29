// HUD and menus: profile, mission tracker, compass, currency, minimap,
// big map, prompts, toasts, dialogue box, photo mode & album, settings.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const UI = KT.UI = {};
  const ICONS = {
    walk: '\u{1F6B6}', boat: '⛵', fish: '\u{1F41F}', island: '\u{1F3DD}️', mask: '\u{1F3AD}', church: '⛪',
    temple: '\u{1F6D5}', leaf: '\u{1F33E}', tower: '\u{1F343}', light: '\u{1F3D6}️', tree: '\u{1F418}', bus: '\u{1F68C}'
  };
  UI.ICONS = ICONS;

  UI.show = (id) => $(id).classList.remove('hidden');
  UI.hide = (id) => $(id).classList.add('hidden');
  UI.isShown = (id) => !$(id).classList.contains('hidden');

  // ------------------------------------------------------------- loading
  UI.progress = function (p, text) {
    $('load-bar').style.width = Math.round(p * 100) + '%';
    if (text) $('load-text').textContent = text;
  };

  // --------------------------------------------------------------- toasts
  UI.toast = function (text, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 3600);
    setTimeout(() => el.remove(), 4200);
  };

  UI.banner = function (title, sub, kind) {
    const b = $('banner');
    b.className = 'banner ' + (kind || '');
    $('banner-title').textContent = title;
    $('banner-sub').textContent = sub || '';
    b.classList.remove('hidden');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(UI._bannerT);
    UI._bannerT = setTimeout(() => { b.classList.remove('show'); setTimeout(() => b.classList.add('hidden'), 500); }, 3200);
  };

  // ----------------------------------------------------------------- HUD
  UI.updateStats = function (d) {
    $('coins').textContent = d.coins;
    $('stars').textContent = d.stars.length;
    $('leaves').textContent = d.leaves;
    $('p-level').textContent = 'Level ' + d.level;
    $('p-name').textContent = d.name || 'Explorer';
    $('xp-fill').style.width = Math.round((d.xp / KT.Game.xpForLevel(d.level)) * 100) + '%';
  };

  UI.setPortrait = function (url) { $('portrait').src = url; };

  UI.updateMission = function (m) {
    const panel = $('mission-panel');
    if (!m) { panel.classList.add('done'); $('m-title').textContent = 'All missions complete!'; $('m-desc').textContent = 'Keep exploring God’s Own Country.'; $('m-count').textContent = ''; $('m-fill').style.width = '100%'; return; }
    panel.classList.remove('done');
    $('m-title').textContent = m.title;
    $('m-desc').textContent = m.desc;
    const p = KT.Missions.progressInfo();
    $('m-count').textContent = p.total > 1 ? p.done + '/' + p.total : '';
    $('m-fill').style.width = Math.round((p.done / p.total) * 100) + '%';
  };

  UI.prompt = function (text) {
    const el = $('prompt');
    if (!text) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    $('prompt-text').textContent = text;
  };

  // ------------------------------------------------------------- compass
  UI.drawCompass = function (camBearing, target, player) {
    const c = $('compass');
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.2, 'rgba(255,255,255,1)'); grad.addColorStop(0.8, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    const span = Math.PI * 0.75;
    const toX = (b) => {
      let r = b - camBearing;
      r = Math.atan2(Math.sin(r), Math.cos(r));
      return W / 2 + (r / span) * (W / 2);
    };
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.fillStyle = '#fff';
    g.lineWidth = 2;
    g.font = 'bold 22px system-ui, sans-serif';
    g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 4;
    g.beginPath(); g.moveTo(0, 30); g.lineTo(W, 30); g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1;
    const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    for (let deg = 0; deg < 360; deg += 15) {
      const x = toX((deg * Math.PI) / 180);
      if (x < 0 || x > W) continue;
      const a = 1 - Math.abs(x - W / 2) / (W / 2);
      g.globalAlpha = Math.max(0, a * 1.4);
      if (labels[deg] !== undefined) {
        g.font = (deg % 90 === 0 ? 'bold 24px' : 'bold 16px') + ' system-ui, sans-serif';
        g.fillText(labels[deg], x, 26);
      } else {
        g.beginPath(); g.moveTo(x, 24); g.lineTo(x, 36); g.stroke();
      }
    }
    g.globalAlpha = 1;
    if (target) {
      const tb = Math.atan2(target.x - player.x, -(target.z - player.z));
      let x = toX(tb);
      const off = x < 10 || x > W - 10;
      x = KT.clamp(x, 14, W - 14);
      g.fillStyle = off ? '#9dffc8' : '#3ddc84';
      g.beginPath();
      g.arc(x, 18, 10, Math.PI, 0);
      g.lineTo(x, 36);
      g.closePath();
      g.fill();
      g.fillStyle = '#0b3b22';
      g.beginPath(); g.arc(x, 18, 4, 0, Math.PI * 2); g.fill();
      const dist = Math.hypot(target.x - player.x, target.z - player.z);
      $('compass-dist').textContent = Math.round(dist) + ' m';
      $('compass-dist').style.left = (x / W) * 100 + '%';
      $('compass-dist').classList.remove('hidden');
    } else $('compass-dist').classList.add('hidden');
    g.restore();
  };

  // ------------------------------------------------------------- minimap
  const MM_SCALE = 1.8; // pixels per metre on the minimap
  UI.drawMinimap = function (p, heading, target, zone) {
    const c = $('minimap');
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const mc = KT.Geo.mapCanvas;
    const N = KT.Geo.mapSize, size = KT.Geo.HALF * 2;
    const ppm = N / size;
    const viewM = W / MM_SCALE;
    const sx = (p.x + KT.Geo.HALF) * ppm - (viewM * ppm) / 2;
    const sy = (p.z + KT.Geo.HALF) * ppm - (viewM * ppm) / 2;
    g.fillStyle = '#3f7fa0';
    g.fillRect(0, 0, W, H);
    g.imageSmoothingEnabled = true;
    g.drawImage(mc, sx, sy, viewM * ppm, viewM * ppm, 0, 0, W, H);
    const toMap = (x, z) => [W / 2 + (x - p.x) * MM_SCALE, H / 2 + (z - p.z) * MM_SCALE];
    // landmarks
    g.font = '18px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    KT.World.LANDMARKS.forEach((l) => {
      const m = toMap(l.x, l.z);
      if (m[0] < -10 || m[0] > W + 10 || m[1] < -10 || m[1] > H + 10) return;
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.arc(m[0], m[1], 13, 0, Math.PI * 2); g.fill();
      g.fillText(ICONS[l.icon] || '★', m[0], m[1] + 1);
    });
    // moving boats
    g.fillStyle = '#fff';
    KT.Entities.boats.forEach((b) => {
      const m = toMap(b.obj.position.x, b.obj.position.z);
      if (m[0] < 0 || m[0] > W || m[1] < 0 || m[1] > H) return;
      g.fillStyle = '#f3e1b8';
      g.beginPath(); g.arc(m[0], m[1], 3.5, 0, Math.PI * 2); g.fill();
    });
    // mission target
    if (target) {
      let m = toMap(target.x, target.z);
      const inside = m[0] > 8 && m[0] < W - 8 && m[1] > 8 && m[1] < H - 8;
      m = [KT.clamp(m[0], 10, W - 10), KT.clamp(m[1], 10, H - 10)];
      g.fillStyle = '#3ddc84';
      g.strokeStyle = '#0b3b22'; g.lineWidth = 2;
      g.beginPath(); g.arc(m[0], m[1], inside ? 8 : 6, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    // player arrow
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(Math.PI - heading);
    g.fillStyle = '#2bd46b'; g.strokeStyle = '#0d3d1f'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, -14); g.lineTo(10, 11); g.lineTo(0, 5); g.lineTo(-10, 11); g.closePath();
    g.fill(); g.stroke();
    g.restore();
    $('location').textContent = zone;
  };

  UI.drawBigMap = function (p, heading, target, discovered) {
    const c = $('bigmap-canvas');
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    g.drawImage(KT.Geo.mapCanvas, 0, 0, W, H);
    const s = W / (KT.Geo.HALF * 2);
    const toMap = (x, z) => [(x + KT.Geo.HALF) * s, (z + KT.Geo.HALF) * s];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    KT.World.LANDMARKS.forEach((l) => {
      const m = toMap(l.x, l.z);
      const found = discovered.indexOf(l.id) >= 0;
      g.fillStyle = found ? 'rgba(255,255,255,0.95)' : 'rgba(40,40,40,0.65)';
      g.beginPath(); g.arc(m[0], m[1], 16, 0, Math.PI * 2); g.fill();
      g.font = '20px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      g.fillText(found ? (ICONS[l.icon] || '★') : '?', m[0], m[1] + 1);
      g.font = 'bold 14px system-ui, sans-serif';
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.65)';
      g.strokeText(l.name, m[0], m[1] + 28);
      g.fillStyle = '#fff';
      g.fillText(l.name, m[0], m[1] + 28);
    });
    if (target) {
      const m = toMap(target.x, target.z);
      g.fillStyle = '#3ddc84'; g.strokeStyle = '#0b3b22'; g.lineWidth = 3;
      g.beginPath(); g.arc(m[0], m[1], 9, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    const m = toMap(p.x, p.z);
    g.save();
    g.translate(m[0], m[1]);
    g.rotate(Math.PI - heading);
    g.fillStyle = '#ffdd33'; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -14); g.lineTo(10, 11); g.lineTo(0, 5); g.lineTo(-10, 11); g.closePath();
    g.fill(); g.stroke();
    g.restore();
  };

  // --------------------------------------------------------------- dialog
  UI.dialog = function (name, lines, onDone) {
    let i = 0;
    const box = $('dialog');
    $('dialog-name').textContent = name;
    const render = () => {
      $('dialog-text').textContent = lines[i];
      $('dialog-next').textContent = i < lines.length - 1 ? 'Next ▶' : 'Close ✕';
      KT.Audio.play('talk');
    };
    UI.dialogNext = () => {
      i++;
      if (i >= lines.length) { UI.closeDialog(); if (onDone) onDone(); return; }
      render();
    };
    render();
    box.classList.remove('hidden');
  };
  UI.closeDialog = function () {
    $('dialog').classList.add('hidden');
    UI.dialogNext = null;
  };

  // --------------------------------------------------------------- album
  UI.addPhoto = function (url, caption) {
    UI.photos = UI.photos || [];
    UI.photos.unshift({ url, caption });
    renderAlbum();
  };
  function renderAlbum() {
    const grid = $('album-grid');
    grid.innerHTML = '';
    if (!UI.photos || !UI.photos.length) {
      grid.innerHTML = '<p class="muted">No photos yet. Press C (or the eye button) to enter camera mode.</p>';
      return;
    }
    UI.photos.forEach((p, i) => {
      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.src = p.url; img.alt = p.caption;
      const cap = document.createElement('figcaption');
      cap.textContent = p.caption;
      const a = document.createElement('a');
      a.href = p.url; a.download = 'kerala-postcard-' + (UI.photos.length - i) + '.jpg';
      a.textContent = 'Download';
      a.className = 'btn small';
      fig.appendChild(img); fig.appendChild(cap); fig.appendChild(a);
      grid.appendChild(fig);
    });
  }
  UI.renderAlbum = renderAlbum;

  UI.flash = function () {
    const f = $('flash');
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
  };

  // ------------------------------------------------------- online status
  UI.setOnline = function (n, connected) {
    const chip = $('btn-online');
    chip.classList.toggle('on', !!connected);
    $('online-count').textContent = connected ? KT.fmtNum(n) + ' online' : (KT.Net.token ? 'connecting…' : 'offline');
  };

  // ------------------------------------------------- highway route bar
  // A strip with all 14 districts; the bus marker shows the position.
  UI.drawRoute = function (s, st) {
    const c = $('route-bar');
    const g = c.getContext('2d');
    const W = c.width, H = c.height, pad = 18;
    const n = KT.DISTRICTS.length;
    const s0 = KT.Highway.hubS(0), s1 = KT.Highway.hubS(n - 1);
    const xOf = (v) => pad + KT.clamp((v - s0) / (s1 - s0), 0, 1) * (W - pad * 2);
    const visited = (KT.Game.data && KT.Game.data.districts) || [];
    g.clearRect(0, 0, W, H);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(pad, 16); g.lineTo(W - pad, 16); g.stroke();
    g.strokeStyle = '#ffd34d'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(pad, 16); g.lineTo(xOf(s), 16); g.stroke();
    g.font = 'bold 10px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'top';
    KT.DISTRICTS.forEach((d, i) => {
      const x = xOf(KT.Highway.hubS(i));
      const on = visited.indexOf(d.id) >= 0;
      g.fillStyle = on ? '#3ddc84' : '#f4efe2';
      g.strokeStyle = '#173b2a'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, 16, i === st.nearest ? 6.5 : 5, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = i === st.nearest ? '#ffd34d' : 'rgba(255,255,255,0.85)';
      g.fillText(d.id.toUpperCase(), x, 26);
    });
    // bus marker
    const bx = xOf(s);
    g.fillStyle = '#d6232a'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(bx, 11); g.lineTo(bx - 7, 1); g.lineTo(bx + 7, 1); g.closePath(); g.fill(); g.stroke();
    // next district text
    const dir = KT.Highway.bus ? Math.cos(KT.Highway.bus.heading - KT.Highway.frame(s).heading) : 1;
    const toward = dir >= 0 ? 1 : -1;
    let next = -1;
    const here0 = st.dist < 160 ? st.nearest : -1;
    for (let i = 0; i < n; i++) {
      if (i === here0) continue;
      const ds = (KT.Highway.hubS(i) - s) * toward;
      if (ds > 60 && (next < 0 || ds < (KT.Highway.hubS(next) - s) * toward)) next = i;
    }
    const here = st.dist < 160 ? KT.DISTRICTS[st.nearest] : null;
    let txt = here ? '\u{1F4CD} ' + here.name + ' district centre' : '';
    if (next >= 0) {
      const km = KT.Vehicle.toKm(Math.abs(KT.Highway.hubS(next) - s));
      txt += (txt ? '  •  ' : '') + 'Next: ' + KT.DISTRICTS[next].name + ' ' + km.toFixed(km < 10 ? 1 : 0) + ' km';
    }
    $('route-next').textContent = txt;
  };

  // --------------------------------------------------------- speedometer
  UI.drawSpeedo = function (kmh) {
    const c = $('speedo');
    const g = c.getContext('2d');
    const W = c.width, cx = W / 2, cy = W / 2, R = W / 2 - 10;
    const MAX = 100;
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    const ang = (v) => a0 + (a1 - a0) * KT.clamp(v / MAX, 0, 1);
    g.clearRect(0, 0, W, W);
    g.fillStyle = 'rgba(10,30,22,0.78)';
    g.beginPath(); g.arc(cx, cy, R + 6, 0, Math.PI * 2); g.fill();
    g.lineWidth = 10; g.lineCap = 'butt';
    g.strokeStyle = 'rgba(255,255,255,0.15)';
    g.beginPath(); g.arc(cx, cy, R - 8, a0, a1); g.stroke();
    const grad = g.createLinearGradient(0, W, W, 0);
    grad.addColorStop(0, '#3ddc84'); grad.addColorStop(0.6, '#ffd34d'); grad.addColorStop(1, '#ff5a3c');
    g.strokeStyle = grad;
    g.beginPath(); g.arc(cx, cy, R - 8, a0, ang(kmh)); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.font = 'bold 13px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let v = 0; v <= MAX; v += 20) {
      const a = ang(v);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * (R - 16), cy + Math.sin(a) * (R - 16)); g.lineTo(cx + Math.cos(a) * (R - 26), cy + Math.sin(a) * (R - 26)); g.stroke();
      g.fillText(v, cx + Math.cos(a) * (R - 38), cy + Math.sin(a) * (R - 38));
    }
    const a = ang(kmh);
    g.strokeStyle = '#ff5a3c'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (R - 20), cy + Math.sin(a) * (R - 20)); g.stroke();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill();
    g.font = 'bold 30px system-ui, sans-serif';
    g.fillText(Math.round(kmh), cx, cy + 38);
    g.font = '11px system-ui, sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillText('km/h', cx, cy + 60);
  };

  // --------------------------------------------- highway minimap & map
  function drawRoadPath(g, s0, s1, toMap, width, color) {
    g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    const step = Math.max(10, (s1 - s0) / 400);
    for (let s = s0; s <= s1; s += step) {
      const f = KT.Highway.frame(s);
      const m = toMap(f.x, f.z);
      if (s === s0) g.moveTo(m[0], m[1]); else g.lineTo(m[0], m[1]);
    }
    g.stroke();
  }
  function drawArrow(g, x, y, heading, fill, stroke) {
    g.save();
    g.translate(x, y);
    g.rotate(Math.PI - heading);
    g.fillStyle = fill; g.strokeStyle = stroke; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, -14); g.lineTo(10, 11); g.lineTo(0, 5); g.lineTo(-10, 11); g.closePath();
    g.fill(); g.stroke();
    g.restore();
  }
  const HW_SCALE = 0.45; // pixels per metre
  UI.drawMinimapHighway = function (p, heading, zone) {
    const c = $('minimap');
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const Hw = KT.Highway;
    g.fillStyle = '#5d8a4a';
    g.fillRect(0, 0, W, H);
    const toMap = (x, z) => [W / 2 + (x - p.x) * HW_SCALE, H / 2 + (z - p.z) * HW_SCALE];
    const s = Hw.project(p.x, p.z).s;
    const span = W / HW_SCALE;
    drawRoadPath(g, s - span, s + span, toMap, 9, '#2d2d2d');
    drawRoadPath(g, s - span, s + span, toMap, 1.5, '#f4efe2');
    g.font = 'bold 12px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    KT.DISTRICTS.forEach((d, i) => {
      const f = Hw.frame(Hw.hubS(i));
      const m = toMap(f.x, f.z);
      if (m[1] < -20 || m[1] > H + 20) return;
      g.fillStyle = '#ffd34d'; g.strokeStyle = '#173b2a'; g.lineWidth = 2;
      g.beginPath(); g.arc(m[0], m[1], 8, 0, Math.PI * 2); g.fill(); g.stroke();
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.6)';
      g.strokeText(d.name, m[0], m[1] - 16);
      g.fillStyle = '#fff';
      g.fillText(d.name, m[0], m[1] - 16);
    });
    if (Hw.bus && KT.Player.mode !== 'bus') {
      const b = Hw.bus.obj.position, m = toMap(b.x, b.z);
      g.font = '16px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      g.fillText('\u{1F68C}', KT.clamp(m[0], 10, W - 10), KT.clamp(m[1], 10, H - 10));
    }
    drawArrow(g, W / 2, H / 2, heading, '#2bd46b', '#0d3d1f');
    $('location').textContent = zone;
  };

  UI.drawBigMapHighway = function (p, heading) {
    const c = $('bigmap-canvas');
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const Hw = KT.Highway;
    // fit the whole route (north at the top)
    const sEnd = Hw.length();
    let minX = 1e9, maxX = -1e9;
    for (let s = 0; s <= sEnd; s += 100) { const x = Hw.roadX(s); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    const sc = (H - 60) / sEnd;
    const ox = W / 2 - ((minX + maxX) / 2) * sc;
    const toMap = (x, z) => [ox + x * sc, H - 30 + z * sc];
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#3f7fa0'); grad.addColorStop(0.22, '#e8d9a8'); grad.addColorStop(0.3, '#6d9a52'); grad.addColorStop(0.75, '#4f7d3d'); grad.addColorStop(1, '#3d5f35');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = 'italic bold 16px Georgia, serif';
    g.textAlign = 'left';
    g.fillText('Arabian Sea', 14, H / 2);
    g.textAlign = 'right';
    g.fillText('Western Ghats', W - 14, H / 2);
    drawRoadPath(g, 0, sEnd, toMap, 6, '#2d2d2d');
    drawRoadPath(g, 0, sEnd, toMap, 1.5, '#ffd34d');
    const visited = (KT.Game.data && KT.Game.data.districts) || [];
    g.textBaseline = 'middle';
    KT.DISTRICTS.forEach((d, i) => {
      const f = Hw.frame(Hw.hubS(i));
      const m = toMap(f.x, f.z);
      const on = visited.indexOf(d.id) >= 0;
      g.fillStyle = on ? '#3ddc84' : '#f4efe2'; g.strokeStyle = '#173b2a'; g.lineWidth = 2;
      g.beginPath(); g.arc(m[0], m[1], 8, 0, Math.PI * 2); g.fill(); g.stroke();
      const left = i % 2 === 0;
      g.textAlign = left ? 'right' : 'left';
      g.font = 'bold 14px system-ui, sans-serif';
      const tx = m[0] + (left ? -14 : 14);
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.6)';
      const label = d.name + (on ? ' ✓' : '');
      g.strokeText(label, tx, m[1]);
      g.fillStyle = '#fff';
      g.fillText(label, tx, m[1]);
    });
    const m = toMap(p.x, p.z);
    drawArrow(g, m[0], m[1], heading, '#ffdd33', '#000');
  };
})();
