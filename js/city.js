// Thiruvananthapuram, the capital, as a city: its localities (Kowdiar,
// Vellayambalam, Vazhuthacaud, Palayam, Thampanoor, Jagathy, Poojapura,
// East Fort and more) are filled with dense blocks:
//  - rows of shops and offices along the roads, with taller blocks behind;
//  - white and pastel apartment buildings, some with red sheet roofs over
//    their terraces and blue water tanks, a few glass office towers;
//  - red-tiled Kerala houses in the leafy residential areas;
//  - mango, jackfruit and coconut trees between them.
// Everything is drawn with instancing (one draw call per model part) and
// built once, the first time the player comes near. The localities also
// name where you are on the minimap.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const City = KT.City = { circles: [], built: false, group: null };

  // name, lon, lat, radius (game m), leafy (more houses and trees), dense (more blocks)
  const LOCALITIES = [
    ['Kowdiar', 76.962, 8.5215, 190, 1, 0, 'Wide, leafy avenues and the old palace quarter'],
    ['Vellayambalam', 76.9575, 8.509, 170, 1, 0, 'Museum, zoo and the Kanakakkunnu grounds nearby'],
    ['Sasthamangalam', 76.973, 8.511, 180, 1, 0, 'Quiet lanes of old Kerala houses'],
    ['Vazhuthacaud', 76.9615, 8.4995, 170, 0, 1, 'Theatres, colleges and film-festival crowds'],
    ['Palayam', 76.9488, 8.503, 160, 0, 1, 'The Secretariat, Statue Junction and the busiest shops'],
    ['Thampanoor', 76.953, 8.4875, 170, 0, 1, 'The Central railway station and the KSRTC bus terminal'],
    ['Jagathy', 76.9665, 8.4925, 160, 1, 0, 'A homely neighbourhood off the main roads'],
    ['Poojapura', 76.978, 8.4885, 180, 1, 0, 'Home of the central jail and the Poojapura Mandapam'],
    ['Chalai', 76.9505, 8.4785, 150, 0, 1, 'The old bazaar: spices, steel pots and flowers'],
    ['East Fort', 76.946, 8.4835, 140, 0, 1, 'The fort walls round the Padmanabhaswamy Temple'],
    ['Vanchiyoor', 76.939, 8.4955, 170, 0, 1, 'Law courts and narrow, busy streets'],
    ['Pettah', 76.928, 8.4935, 160, 0, 0, 'Between the city and the beach road'],
    ['Kesavadasapuram', 76.952, 8.531, 170, 0, 1, 'A busy junction on the road north'],
    ['Pattom', 76.938, 8.5225, 150, 0, 1, 'Offices, the PSC and Pattom Palace']
  ];

  // ---------------------------------------------------------- planning
  City.init = function () {
    const Hw = KT.Highway;
    City.circles = LOCALITIES.map(([name, lon, lat, r, leafy, dense, line]) => Object.assign(Hw.geo(lon, lat), { name, r, leafy, dense, line }));
    const h = Hw.at(Hw.hubS(0), 0);
    City.hub = { x: h.x, z: h.z };
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    City.circles.forEach((c) => { x0 = Math.min(x0, c.x - c.r); x1 = Math.max(x1, c.x + c.r); z0 = Math.min(z0, c.z - c.r); z1 = Math.max(z1, c.z + c.r); });
    // (Thampanoor is where its station stands)
    const tp = Hw.sightList().find((sg) => sg.kind === 'thampanoor'), tc = City.circles.find((c) => c.name === 'Thampanoor');
    if (tp && tc) { tc.x = tp.x; tc.z = tp.z; tc.r = 150; }
    City.circles.forEach((c) => { x0 = Math.min(x0, c.x - c.r); x1 = Math.max(x1, c.x + c.r); z0 = Math.min(z0, c.z - c.r); z1 = Math.max(z1, c.z + c.r); });
    City.box = { x0, x1, z0, z1 };
    City.center = { x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
  };
  // 0..1: how much (x, z) is in the city (soft at the edges; the district
  // town at Pattom has its own buildings)
  City.weight = function (x, z) {
    const b = City.box;
    if (!b || x < b.x0 - 20 || x > b.x1 + 20 || z < b.z0 - 20 || z > b.z1 + 20) return 0;
    let w = 0;
    const n = KT.noise(x * 0.012 + 4, z * 0.012 - 2) * 40;
    for (let i = 0; i < City.circles.length; i++) {
      const c = City.circles[i], d = Math.hypot(x - c.x, z - c.z);
      w = Math.max(w, 1 - KT.smoothstep(c.r * 0.75 + n, c.r + 20 + n, d));
    }
    return w;
  };
  City.locality = function (x, z) {
    let best = null, bd = 1e9;
    City.circles.forEach((c) => { const d = Math.hypot(x - c.x, z - c.z) / c.r; if (d < 1.05 && d < bd) { bd = d; best = c; } });
    return best;
  };

  // the nearest road of any kind: highway, branch, country road, street or lane
  function nearestAny(x, z) {
    const Hw = KT.Highway;
    let best = Hw.nearestRoad(x, z, 80);
    Hw.country.forEach((R) => {
      if (!R.near(x, z, 60)) return;
      const p = R.project(x, z);
      if (p.d - (R.half || 3) < best.d - (best.road.half || 5.5)) best = p;
    });
    return best;
  }

  function planLots() {
    const Hw = KT.Highway, b = City.box, lots = [], STEP = 15;
    const rng = KT.makeRng(8524);
    const sights = Hw.sightList().filter((s) => Math.abs(s.x - City.center.x) < 2000 && Math.abs(s.z - City.center.z) < 2000);
    const pads = Hw.PADS.filter((P) => Math.abs(P.x - City.center.x) < 2200 && Math.abs(P.z - City.center.z) < 2200);
    const clear = (px, pz) => {
      if (City.weight(px, pz) < 0.55 || !Hw.inMap(px, pz)) return false;
      if (Math.hypot(px - City.hub.x, pz - City.hub.z) < 225) return false;     // Pattom's own town
      if (px - Hw.coastX(pz) < 80 || Hw.waterLevelAt(px, pz) > -1e8) return false;
      if (sights.some((s) => Math.hypot(px - s.x, pz - s.z) < s.r + 12)) return false;
      if (pads.some((P) => Math.hypot(px - P.x, pz - P.z) < P.r + 6)) return false;
      const h = Hw.height(px, pz);
      return Math.abs(Hw.height(px + 5, pz) - h) < 2 && Math.abs(Hw.height(px, pz + 5) - h) < 2;
    };
    // 1. shopfronts: an unbroken row of shop blocks along both sides of every
    // road through the city, facing it, broken only at junctions
    const front = new Map(), fkey = (x, z) => Math.floor(x / 12) + ',' + Math.floor(z / 12);
    const nearFront = (x, z, r) => {
      const gx = Math.floor(x / 12), gz = Math.floor(z / 12);
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const L = front.get((gx + i) + ',' + (gz + j)); if (L && L.some((l) => Math.hypot(l.x - x, l.z - z) < r)) return true; }
      return false;
    };
    Hw.roads.concat(Hw.country).forEach((R) => {
      if (R.lane) return;
      const half = R.half || 5.5;
      if (!R.near(City.center.x, City.center.z, 1500)) return;
      for (let sAl = 12; sAl < R.len - 12; sAl += 9.4) {
        if (R.junctions.some((j) => Math.abs(j.s - sAl) < 16)) continue;
        [-1, 1].forEach((side) => {
          const q = R.at(sAl, side * (half + 10.5));
          if (!clear(q.x, q.z)) return;
          const nr = nearestAny(q.x, q.z);
          if (nr.road !== R && nr.d < (nr.road.half || 5.5) + 10) return;
          if (nearFront(q.x, q.z, 8.5)) return;
          const c = R.at(sAl, 0), r = rng();
          const l = { x: q.x, z: q.z, y: Hw.groundY(q.x, q.z).y, rot: Math.atan2(c.x - q.x, c.z - q.z), kind: r < 0.86 ? 'shop' : 'apt', v: rng(), front: true, R, s: sAl, side, half };
          lots.push(l);
          const k = fkey(q.x, q.z);
          if (!front.has(k)) front.set(k, []);
          front.get(k).push(l);
        });
      }
    });
    // 2. behind them, blocks, houses and trees on a loose grid
    for (let x = b.x0; x <= b.x1; x += STEP) {
      for (let z = b.z0; z <= b.z1; z += STEP) {
        const px = x + (rng() - 0.5) * 3, pz = z + (rng() - 0.5) * 3, r1 = rng(), r2 = rng(), r3 = rng();
        if (!clear(px, pz)) continue;
        const nr = nearestAny(px, pz), half = nr.road.half || 5.5;
        if (nr.d < half + 14 || nearFront(px, pz, 13.5)) continue;
        const loc = City.locality(px, pz) || { leafy: 0, dense: 0 };
        const near = nr.d < half + 30;
        let kind;
        if (near) kind = r1 < 0.2 ? 'office' : r1 < 0.65 ? 'apt' : r1 < 0.8 ? 'house' : 'tree';
        else if (loc.leafy) kind = r1 < 0.2 ? 'apt' : r1 < 0.6 ? 'house' : r1 < 0.98 ? 'tree' : 'office';
        else if (loc.dense) kind = r1 < 0.5 ? 'apt' : r1 < 0.66 ? 'house' : r1 < 0.86 ? 'tree' : 'office';
        else kind = r1 < 0.36 ? 'apt' : r1 < 0.68 ? 'house' : r1 < 0.97 ? 'tree' : 'office';
        // line up with the nearest road
        const q = nr.road.at(nr.s, 0);
        let rot = Math.atan2(q.x - px, q.z - pz);
        if (!near || kind !== 'office') rot = Math.round(rot / (Math.PI / 2)) * (Math.PI / 2) + (r3 - 0.5) * 0.12;
        lots.push({ x: px, z: pz, y: Hw.groundY(px, pz).y, rot, kind, v: r2 });
        // a tree or two in the gaps
        if (kind !== 'tree' && rng() < (loc.leafy ? 0.6 : 0.3)) {
          const tx = px + (rng() < 0.5 ? -1 : 1) * 7.2, tz = pz + (rng() - 0.5) * 8;
          if (clear(tx, tz) && nearestAny(tx, tz).d > half + 8 && !nearFront(tx, tz, 7)) lots.push({ x: tx, z: tz, y: Hw.height(tx, tz), rot: rng() * 6.28, kind: 'tree', v: rng() });
        }
      }
    }
    return lots;
  }

  // ---------------------------------------------------------- textures
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = KT.maxAnisotropy;
    if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  // one bay (3 m) of one floor (3.2 m) of a wall; white, so the material
  // colour paints it. kind: 'win', 'balc', 'glass', 'house'
  const bays = {};
  function bayTex(kind) {
    if (bays[kind]) return bays[kind];
    bays[kind] = canvasTex(128, 136, (g, W, H) => {
      const rng = KT.makeRng(kind.length * 31 + 5);
      g.fillStyle = kind === 'glass' ? '#9fb4bf' : '#f4f2ec'; g.fillRect(0, 0, W, H);
      if (kind === 'glass') {
        // curtain wall: tinted panes in a metal grid
        const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#5e8aa3'); gr.addColorStop(1, '#3d6680');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.fillStyle = '#c9d2d6'; g.fillRect(0, 0, W, 6); g.fillRect(0, 0, 5, H); g.fillRect(W / 2 - 2, 0, 4, H);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(8, 10, W / 2 - 14, H - 20);
        return;
      }
      // grime under the sill and along the top
      const ww = kind === 'house' ? 46 : 54, wh = kind === 'house' ? 56 : 60, wx = (W - ww) / 2, wy = 34;
      g.fillStyle = '#3a3f44'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
      g.fillStyle = '#7fa3b6'; g.fillRect(wx, wy, ww / 2 - 2, wh); g.fillRect(wx + ww / 2 + 2, wy, ww / 2 - 2, wh);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(wx + 3, wy + 3, 6, wh - 6);
      g.strokeStyle = 'rgba(30,30,30,0.6)'; g.lineWidth = 2;
      for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(wx, wy + k * wh / 4); g.lineTo(wx + ww, wy + k * wh / 4); g.stroke(); }
      // the sunshade over the window and its shadow
      g.fillStyle = '#dcd8ce'; g.fillRect(wx - 10, wy - 14, ww + 20, 8);
      g.fillStyle = 'rgba(40,38,32,0.28)'; g.fillRect(wx - 6, wy - 6, ww + 12, 10);
      const sg = g.createLinearGradient(0, wy + wh + 4, 0, wy + wh + 40);
      sg.addColorStop(0, 'rgba(50,46,38,0.3)'); sg.addColorStop(1, 'rgba(50,46,38,0)');
      g.fillStyle = sg; g.fillRect(wx, wy + wh + 4, ww, 36);
      if (kind === 'balc') {
        g.fillStyle = '#e6e2d8'; g.fillRect(0, H - 34, W, 6);
        g.strokeStyle = '#2a2c2e'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(0, H - 30); g.lineTo(W, H - 30); g.stroke();
        for (let x = 6; x < W; x += 12) { g.beginPath(); g.moveTo(x, H - 30); g.lineTo(x, H - 4); g.stroke(); }
        // washing on the line
        if (rng() < 0.7) { g.fillStyle = ['#c4212b', '#2c5fa8', '#f2c230', '#ffffff'][Math.floor(rng() * 4)]; g.fillRect(20 + rng() * 60, H - 28, 16, 18); }
      }
      // weathering streaks
      for (let i = 0; i < 6; i++) { const x = rng() * W; g.fillStyle = 'rgba(40,40,34,' + (0.05 + rng() * 0.08) + ')'; g.fillRect(x, 0, 2 + rng() * 3, 20 + rng() * 60); }
    }, true);
    return bays[kind];
  }
  // scale a box's uvs so its bay texture repeats once per bay and floor
  function bayBox(w, h, d, bayW, floorH) {
    const geo = new T.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    // faces: +x, -x, +y, -y, +z, -z (4 vertices each)
    const fw = [d, d, 0, 0, w, w];
    for (let f = 0; f < 6; f++) {
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        if (!fw[f]) { uv.setXY(i, 0.02, 0.02); continue; }
        uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(fw[f] / bayW)), uv.getY(i) * h / floorH);
      }
    }
    return geo;
  }

  // ------------------------------------------------------------ models
  const PAINTS = [0xf3f0e8, 0xf1e6c8, 0xe6eef2, 0xf3dcd0, 0xe2ecd6, 0xefe7f2, 0xfaf7f0, 0xf2e2b4];
  function wallMat(key, color, kind) {
    const m = KT.mat(key, { color, map: bayTex(kind), roughness: 0.88 });
    if (KT.Real && KT.Real.enabled) KT.Real.surface(m, 'painted_plaster_wall', 0.6);
    return m;
  }
  // a hipped roof (4 slopes)
  function hip(g, w, d, h, mat, y) {
    const r = new T.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
    r.rotateY(Math.PI / 4);
    part(g, r, mat, 0, y + h / 2, 0, 0, 0, 0, w, h, d);
  }
  function tanks(g, w, d, H, rng) {
    const black = KT.mat('waterTank', { color: 0x1d1d1d, roughness: 0.6 }), blue = KT.mat('tankBlue', { color: 0x2f6fb8, roughness: 0.5 });
    const n = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) part(g, G.cyl(0.6, 0.6, 1.2, 12), rng() < 0.5 ? blue : black, (rng() - 0.5) * (w - 2.5), H + 0.6 + 0.05, (rng() - 0.5) * (d - 2.5));
  }
  // An apartment or office block: 4 to 9 floors of painted concrete with
  // windows, sunshades and balconies, a parapet, stair room and tanks;
  // some carry a red sheet roof over the terrace.
  function apartment(i) {
    const rng = KT.makeRng(i * 97 + 11), g = new T.Group();
    const w = 9 + Math.floor(rng() * 3), d = 9 + Math.floor(rng() * 3), floors = 4 + Math.floor(rng() * 6), H = floors * 3.2;
    const paint = PAINTS[i % PAINTS.length];
    const wall = wallMat('cityApt' + i, paint, rng() < 0.5 ? 'balc' : 'win');
    part(g, bayBox(w, H, d, 3, 3.2), wall, 0, H / 2, 0);
    // ground floor: parking under stilts, darker
    part(g, G.box(w + 0.05, 2.9, d + 0.05), KT.mat('cityStilt', { color: 0x6d6a64, roughness: 0.95 }), 0, 1.45, 0).castShadow = false;
    const trim = KT.mat('cityTrim' + (i % 4), { color: [0xd8d4ca, 0xbdb8ae, 0x9a4a36, 0xcfcac0][i % 4], roughness: 0.85 });
    part(g, G.box(w + 0.3, 0.9, d + 0.3), trim, 0, H + 0.45, 0);       // parapet
    part(g, G.box(2.4, 2.6, 2.6), wall, w / 2 - 1.6, H + 1.3, -d / 2 + 1.6);  // stair room
    tanks(g, w, d, H, rng);
    if (rng() < 0.45) {
      // the red sheet roof on steel posts over the terrace
      const roofM = KT.mat('cityRedSheet', { color: 0xb4452e, roughness: 0.6, metalness: 0.2, side: T.DoubleSide });
      hip(g, w + 0.6, d + 0.6, 2.2, roofM, H + 2.4);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(g, G.box(0.12, 2.4, 0.12), KT.M.darkGrey, sx * (w / 2 - 0.2), H + 1.2, sz * (d / 2 - 0.2)));
    }
    const o = KT.bake(g);
    o.userData.size = { w, d, H };
    return o;
  }
  function office(i) {
    const rng = KT.makeRng(i * 131 + 3), g = new T.Group();
    const w = 11, d = 11, floors = 7 + Math.floor(rng() * 6), H = floors * 3.6;
    const glass = KT.mat('cityGlass' + i, { color: [0xffffff, 0xcfe6f0, 0xd8efe6][i % 3], map: bayTex('glass'), roughness: 0.12, metalness: 0.55 });
    part(g, bayBox(w, H, d, 3, 3.6), glass, 0, H / 2 + 3, 0);
    const base = KT.mat('cityOfficeBase', { color: 0xd9d5cc, roughness: 0.7 });
    part(g, G.box(w + 1.2, 3.2, d + 1.2), base, 0, 1.6, 0);
    // white fins up the corners
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(g, G.box(0.6, H, 0.6), base, sx * w / 2, H / 2 + 3, sz * d / 2));
    part(g, G.box(w + 0.4, 1.0, d + 0.4), base, 0, H + 3.5, 0);
    part(g, G.box(3, 2.6, 3), base, -1.5, H + 5.1, 1);
    const o = KT.bake(g);
    o.userData.size = { w: w + 1.2, d: d + 1.2, H };
    return o;
  }
  // A Kerala house: one or two floors, pastel walls, a red-tiled hipped
  // roof with a gable at the front and a tiled sit-out porch.
  function house(i) {
    const rng = KT.makeRng(i * 53 + 29), g = new T.Group();
    const two = rng() < 0.55, w = 8 + rng() * 2, d = 7 + rng() * 2, H = two ? 6.4 : 3.3;
    const wall = wallMat('cityHouse' + i, PAINTS[(i + 3) % PAINTS.length], 'house');
    part(g, bayBox(w, H, d, 3, 3.2), wall, 0, H / 2, 0);
    part(g, G.box(w + 0.1, 0.45, d + 0.1), KT.mat('cityPlinth', { color: 0x7d5a46, roughness: 0.9 }), 0, 0.22, 0);
    const roof = KT.M.roof;
    hip(g, w + 1.6, d + 1.6, 2.6, roof, H);
    // the sit-out: a porch on two pillars under its own roof
    part(g, G.box(w * 0.45, 0.3, 2.4), KT.mat('cityPorchFloor', { color: 0x9a3b2a, roughness: 0.5 }), -w * 0.18, 0.3, d / 2 + 1.2);
    [-1, 1].forEach((s) => part(g, G.cyl(0.14, 0.14, 2.7, 8), KT.M.white, -w * 0.18 + s * w * 0.2, 1.65, d / 2 + 2.2));
    const pr = part(g, G.box(w * 0.5, 0.12, 2.9), roof, -w * 0.18, 3.05, d / 2 + 1.3, -0.25, 0, 0);
    pr.castShadow = true;
    if (two) part(g, G.box(w + 0.6, 0.12, d + 0.6), KT.mat('cityChajja', { color: 0xd8d4ca, roughness: 0.9 }), 0, 3.2, 0);
    const o = KT.bake(g);
    o.userData.size = { w: w + 1.6, d: d + 1.6, H };
    return o;
  }
  // (shop rows reuse the town blocks: Models.townBuilding)

  // ---------------------------------------------------------- building
  function partsOf(obj) {
    obj.updateMatrixWorld(true);
    const out = [];
    obj.traverse((o) => { if (o.isMesh) out.push({ geo: o.geometry, mat: o.material, m: o.matrixWorld.clone(), cast: o.castShadow !== false }); });
    return out;
  }
  const _m = new T.Matrix4(), _m2 = new T.Matrix4(), _q = new T.Quaternion(), _p = new T.Vector3(), _s = new T.Vector3(1, 1, 1), _up = new T.Vector3(0, 1, 0);
  function instance(group, proto, lots, scaleOf, noShadow) {
    partsOf(proto).forEach((pt) => {
      const im = new T.InstancedMesh(pt.geo, pt.mat, lots.length);
      lots.forEach((l, i) => {
        const s = scaleOf ? scaleOf(l) : 1;
        _m.compose(_p.set(l.x, l.y, l.z), _q.setFromAxisAngle(_up, l.rot), _s.set(s, s, s));
        im.setMatrixAt(i, _m2.multiplyMatrices(_m, pt.m));
      });
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = pt.cast && !noShadow;
      im.receiveShadow = true;
      im.frustumCulled = false;
      group.add(im);
    });
  }

  // cement aprons from the road's edge up to each row of shops
  function forecourts(fronts) {
    const Hw = KT.Highway, pos = [], uv = [], idx = [];
    fronts.forEach((l) => {
      const base = pos.length / 3;
      for (let i = 0; i <= 2; i++) {
        const sAl = l.s - 4.7 + i * 4.7;
        for (let j = 0; j <= 2; j++) {
          const lat = l.side * (l.half + 0.5 + j * 2.75), q = l.R.at(sAl, lat);
          pos.push(q.x, Math.max(Hw.groundY(q.x, q.z).y, Hw.height(q.x, q.z)) + 0.08, q.z);
          uv.push(sAl / 4, lat / 4);
        }
      }
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const a = base + i * 3 + j, b = a + 3;
        if (l.side < 0) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, Hw.forecourtMaterial());
    m.receiveShadow = true;
    return m;
  }

  City.build = function () {
    const Hw = KT.Highway, Models = KT.Models;
    const low = KT.Game.settings && KT.Game.settings.quality === 'low';
    const lots = planLots().filter((l) => !low || l.kind !== 'tree');
    const group = City.group = new T.Group();
    group.name = 'city';
    const kinds = {
      shop: { n: Models.TOWN_TYPES, make: (i) => Models.townBuilding(i) },
      apt: { n: 8, make: apartment },
      office: { n: 3, make: office },
      house: { n: 6, make: house },
      tree: { n: 4, make: (i) => KT.bake([() => Models.mangoTree(), () => Models.jackfruitTree(), () => Models.coconutPalm(7), () => Models.banyanTree()][i]()) }
    };
    Object.keys(kinds).forEach((k) => {
      const K = kinds[k];
      for (let v = 0; v < K.n; v++) {
        const mine = lots.filter((l) => l.kind === k && Math.floor(l.v * K.n) === v);
        if (!mine.length) continue;
        const proto = K.make(v);
        const size = proto.userData.size;
        instance(group, proto, mine, k === 'tree' ? (l) => 0.9 + (l.v * 13 % 1) * 0.5 : null, k === 'tree');
        // the player and the traffic bump into them
        mine.forEach((l) => {
          if (k === 'tree') Hw.addCollider({ type: 'circle', x: l.x, z: l.z, r: 0.6 });
          else Hw.addCollider({ type: 'box', x: l.x, z: l.z, hw: (size ? size.w : 7.5) / 2, hd: (size ? size.d : 8) / 2, rot: l.rot });
        });
      }
    });
    group.add(forecourts(lots.filter((l) => l.front)));
    Hw.scene.add(group);
    City.lots = lots;
    City.built = true;
  };

  let entered = null, locT = 0;
  City.update = function (dt, pos) {
    if (!City.box) return;
    const d = Math.hypot(pos.x - City.center.x, pos.z - City.center.z);
    if (!City.built && d < 1900 && KT.Highway.scene) City.build();
    if (City.group) City.group.visible = d < 2600;
    // a toast when you enter a new locality
    locT -= dt;
    if (locT > 0) return;
    locT = 0.5;
    const L = City.locality(pos.x, pos.z);
    if (L && L !== entered && KT.UI && KT.Game.state === 'playing') KT.UI.toast('\u{1F4CD} ' + L.name + ' • ' + L.line);
    entered = L;
  };
})();
