// HUD and menus: profile, mission tracker, compass, currency, minimap,
// big map, prompts, toasts, dialogue box, photo mode & album, settings.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const UI = KT.UI = {};
  const ICONS = {
    walk: '\u{1F6B6}', boat: '⛵', fish: '\u{1F41F}', island: '\u{1F3DD}️', mask: '\u{1F3AD}', church: '⛪',
    temple: '\u{1F6D5}', leaf: '\u{1F33E}', tower: '\u{1F343}', light: '\u{1F3D6}️', tree: '\u{1F418}'
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
})();
