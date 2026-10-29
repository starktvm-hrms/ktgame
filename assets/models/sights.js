// District towns and tourist attractions on the Kerala highway: multi-storey
// town buildings, heritage halls (Napier Museum, Mattancherry Palace,
// Kottakkal), the Jatayu sculpture, waterfalls, Varkala cliff, beaches,
// a small lake temple, Theyyam, a football ground, a garden, an earth dam,
// tea hills and a bird sanctuary. Every model faces +z.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = KT.maxAnisotropy;
    return t;
  }
  // pyramid roof (4 sides) of a Kerala building, w x d at the eaves
  function hipRoof(g, w, d, h, mat, y, x, z) {
    const r = new T.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
    r.rotateY(Math.PI / 4);
    part(g, r, mat, x || 0, y + h / 2, z || 0, 0, 0, 0, w, h, d);
  }

  // ------------------------------------------------------ town buildings
  // A Kerala town block: 2-4 floors of painted concrete, a shop on the
  // ground floor with its signboard, windows with sunshades and a black
  // water tank on the flat roof.
  const TOWN = [
    { floors: 3, paint: '#f2d27a', trim: '#b0562a', sign: ['Hotel Aryaas', 'Pure Vegetarian'], sbg: '#b3261e', sfg: '#fff3c4' },
    { floors: 2, paint: '#bfe0d8', trim: '#2a7b6f', sign: ['Alukkas Jewellery', 'Gold & Diamonds'], sbg: '#7a1e2e', sfg: '#f7d774' },
    { floors: 4, paint: '#f4f1ea', trim: '#3b5b8c', sign: ['State Bank', 'ATM 24x7'], sbg: '#1f4e9a', sfg: '#ffffff' },
    { floors: 3, paint: '#f6c8b0', trim: '#8e3b2a', sign: ['Kalyan Silks', 'Sarees • Kasavu'], sbg: '#5a2a82', sfg: '#ffe48a' },
    { floors: 2, paint: '#d9e8b8', trim: '#4f7a2a', sign: ['Medical Centre', 'Clinic & Pharmacy'], sbg: '#ffffff', sfg: '#127a3a' },
    { floors: 3, paint: '#e8d8f0', trim: '#6b3fa0', sign: ['Book Stall', 'DC Books • Papers'], sbg: '#2a2a2a', sfg: '#ffd34d' },
    { floors: 4, paint: '#cfe3f2', trim: '#2c5fa8', sign: ['Hotel Paramount', 'Rooms • Restaurant'], sbg: '#0f3b6b', sfg: '#ffffff' },
    { floors: 2, paint: '#f7e3a1', trim: '#a0522d', sign: ['Bismi Electronics', 'TV • Mobile • AC'], sbg: '#d8203a', sfg: '#ffffff' },
    { floors: 3, paint: '#ffe6cc', trim: '#c4212b', sign: ['Malabar Biriyani', 'Family Restaurant'], sbg: '#1e6b3a', sfg: '#fff6d8' },
    { floors: 2, paint: '#e6e2da', trim: '#5a5a5a', sign: ['Post Office', 'India Post • തപാൽ'], sbg: '#c4212b', sfg: '#ffffff' }
  ];
  Models.TOWN_TYPES = TOWN.length;
  const townProtos = {};
  function facadeTex(v, w, floors) {
    const ppm = 48, W = Math.round(w * ppm), H = Math.round(floors * 3.2 * ppm);
    return canvasTex(W, H, (g) => {
      g.fillStyle = v.paint; g.fillRect(0, 0, W, H);
      const fh = 3.2 * ppm;
      // upper floors: windows with sunshades
      for (let f = 1; f < floors; f++) {
        const y0 = H - (f + 1) * fh;
        const n = Math.max(2, Math.floor(w / 2.3));
        for (let i = 0; i < n; i++) {
          const cx = (i + 0.5) * (W / n);
          g.fillStyle = '#2f3a44'; g.fillRect(cx - 0.55 * ppm, y0 + 0.75 * ppm, 1.1 * ppm, 1.4 * ppm);
          g.fillStyle = '#9fc4d8'; g.fillRect(cx - 0.48 * ppm, y0 + 0.82 * ppm, 0.43 * ppm, 1.26 * ppm); g.fillRect(cx + 0.05 * ppm, y0 + 0.82 * ppm, 0.43 * ppm, 1.26 * ppm);
          g.fillStyle = v.trim; g.fillRect(cx - 0.75 * ppm, y0 + 0.55 * ppm, 1.5 * ppm, 0.16 * ppm);
        }
        g.fillStyle = v.trim; g.fillRect(0, y0 + fh - 0.12 * ppm, W, 0.12 * ppm);
      }
      // ground floor: rolling shutters and a glass door
      const gy = H - fh;
      g.fillStyle = '#d9d6cf'; g.fillRect(0, gy, W, fh);
      const doors = Math.max(1, Math.floor(w / 3));
      for (let i = 0; i < doors; i++) {
        const x0 = (i + 0.08) * (W / doors), dw = (W / doors) * 0.84;
        g.fillStyle = i === 0 ? '#4b5a63' : '#8c9297'; g.fillRect(x0, gy + 1.0 * ppm, dw, 2.2 * ppm);
        if (i > 0) { g.strokeStyle = '#6d7378'; g.lineWidth = 2; for (let y = gy + 1.0 * ppm; y < H; y += 6) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + dw, y); g.stroke(); } }
        else { g.fillStyle = '#a9cfe0'; g.fillRect(x0 + 6, gy + 1.0 * ppm + 6, dw - 12, 2.2 * ppm - 12); }
      }
      // signboard band
      g.fillStyle = v.sbg; g.fillRect(0, gy + 0.08 * ppm, W, 0.85 * ppm);
      g.fillStyle = v.sfg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold ' + Math.round(0.42 * ppm) + 'px Arial, sans-serif';
      g.fillText(v.sign[0], W / 2, gy + 0.36 * ppm);
      g.font = 'bold ' + Math.round(0.24 * ppm) + 'px "Nirmala UI", "Noto Sans Malayalam", Arial, sans-serif';
      g.fillText(v.sign[1], W / 2, gy + 0.72 * ppm);
    });
  }
  function buildTown(i) {
    const v = TOWN[i % TOWN.length];
    const w = 7.5, d = 8, floors = v.floors, H = floors * 3.2;
    const g = new T.Group();
    const paint = KT.mat('townPaint' + i, { color: new T.Color(v.paint), roughness: 0.9 });
    const front = new T.MeshStandardMaterial({ map: facadeTex(v, w, floors), roughness: 0.85 });
    front.name = 'townFront' + i;
    part(g, G.box(w, H, d), paint, 0, H / 2, 0);
    // painted front with windows, shutters and the shop sign
    part(g, G.plane(w, H), front, 0, H / 2, d / 2 + 0.02).castShadow = false;
    const trim = KT.mat('townTrim' + i, { color: new T.Color(v.trim), roughness: 0.8 });
    part(g, G.box(w + 0.3, 0.5, d + 0.3), trim, 0, H + 0.25, 0);                 // roof parapet
    part(g, G.box(w + 0.4, 0.12, 1.2), trim, 0, 3.2 - 0.2, d / 2 + 0.6);         // shop canopy
    part(g, G.cyl(0.55, 0.55, 1.1, 12), KT.mat('waterTank', { color: 0x1d1d1d, roughness: 0.6 }), w / 2 - 1.2, H + 1.05, -d / 2 + 1.4);
    if (floors > 2) part(g, G.box(1.6, 0.9, 0.5), M().white, -w / 2 + 1.4, H + 0.95, -d / 2 + 1); // stair head
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: w / 2, hd: d / 2 }];
    baked.userData.size = { w, d };
    return baked;
  }
  Models.townBuilding = function (i) {
    const k = i % TOWN.length;
    if (!townProtos[k]) townProtos[k] = buildTown(k);
    const o = townProtos[k].clone(true);
    o.userData = Object.assign({}, townProtos[k].userData);
    return o;
  };


  // ------------------------------------------------------- shared details
  // brass finial on a roof peak
  function kalasam(g, x, y, z, s) {
    s = s || 1;
    part(g, G.cyl(0.12 * s, 0.2 * s, 0.25 * s, 10), M().gold, x, y + 0.12 * s, z);
    part(g, G.sph(0.2 * s, 10, 8), M().gold, x, y + 0.42 * s, z);
    part(g, G.cone(0.1 * s, 0.45 * s, 8), M().gold, x, y + 0.8 * s, z);
  }
  // wooden lattice for the triangular gables (mukhappu) of Kerala roofs
  let latticeMat = null;
  function lattice() {
    if (latticeMat) return latticeMat;
    const t = canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#3b2414'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#7a4b28';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) c.fillRect(i * 16 + 3, j * 16 + 3, 10, 10);
    });
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(2, 2);
    latticeMat = new T.MeshStandardMaterial({ map: t, roughness: 0.8, side: T.DoubleSide });
    return latticeMat;
  }
  function gableFace(g, w, h, x, y, z, rotY) {
    const sh = new T.Shape();
    sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.lineTo(-w / 2, 0);
    const m = part(g, new T.ShapeGeometry(sh), lattice(), x, y, z, 0, rotY || 0, 0);
    m.castShadow = false;
    // barge boards
    const len = Math.hypot(w / 2, h), ang = Math.atan2(h, w / 2);
    const c = Math.cos(rotY || 0), s = Math.sin(rotY || 0);
    [-1, 1].forEach((sd) => {
      const lx = sd * w / 4, lz = 0.05;
      part(g, G.box(len + 0.3, 0.18, 0.12), M().woodDark, x + lx * c + lz * s, y + h / 2, z - lx * s + lz * c, 0, rotY || 0, -sd * ang);
    });
  }
  // Kerala roof: steep hipped roof with gables near the ridge and finials
  function keralaRoof(g, w, d, h, y, x, z, mat, opts) {
    x = x || 0; z = z || 0;
    hipRoof(g, w, d, h, mat, y, x, z);
    // the flared eaves: a thin skirt below
    hipRoof(g, w + 1.2, d + 1.2, h * 0.28, mat, y - h * 0.2, x, z);
    if (!opts || opts.gables !== false) {
      const gh = h * 0.5, gw = Math.min(w, d) * 0.42;
      gableFace(g, gw, gh, x, y + h * 0.42, z + d * 0.21 + 0.02, 0);
      gableFace(g, gw, gh, x, y + h * 0.42, z - d * 0.21 - 0.02, Math.PI);
    }
    kalasam(g, x, y + h - 0.1, z, Math.max(0.8, w / 10));
  }
  function railing(g, x0, z0, x1, z1, y, h, mat) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 1.5));
    for (let i = 0; i <= n; i++) part(g, G.box(0.08, h, 0.08), mat || M().white, KT.lerp(x0, x1, i / n), y + h / 2, KT.lerp(z0, z1, i / n));
    part(g, G.box(0.07, 0.07, len), mat || M().white, (x0 + x1) / 2, y + h, (z0 + z1) / 2, 0, ang, 0);
    part(g, G.box(0.05, 0.05, len), mat || M().white, (x0 + x1) / 2, y + h * 0.5, (z0 + z1) / 2, 0, ang, 0);
  }
  function steps(g, w, n, x, y, z, rotY, mat) {
    const c = Math.cos(rotY || 0), s = Math.sin(rotY || 0);
    for (let i = 0; i < n; i++) {
      const lz = (n - i) * 0.35;
      part(g, G.box(w, 0.18, 0.4), mat || M().stoneGrey, x + lz * s, y + i * 0.18 + 0.09, z + lz * c, 0, rotY || 0, 0);
    }
  }
  // brass lamp tower (deepasthambham) with rings of little lamps
  function lampTower(g, x, z, h) {
    h = h || 4;
    part(g, G.cyl(0.6, 0.75, 0.4, 16), M().brass, x, 0.2, z);
    part(g, G.cyl(0.12, 0.18, h, 10), M().brass, x, h / 2, z);
    for (let i = 0; i < 6; i++) {
      const y = 0.9 + i * (h - 1) / 6, r = 0.75 - i * 0.08;
      part(g, G.cyl(r, r * 0.9, 0.06, 16), M().brass, x, y, z);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + i; part(g, G.sph(0.05, 5, 4), M().lampGlow, x + Math.cos(a) * r * 0.9, y + 0.07, z + Math.sin(a) * r * 0.9); }
    }
    kalasam(g, x, h, z, 0.8);
  }
  function addProto(g, obj, x, y, z, rot, s) {
    obj.position.set(x, y, z);
    obj.rotation.y = rot || 0;
    if (s) obj.scale.setScalar(s);
    g.add(obj);
    return obj;
  }
  // a person standing still (not merged, so it can be animated)
  function person(list, root, cfg, x, z, rot, state) {
    const ch = Models.character(Object.assign({ lite: true, acc: {} }, cfg));
    ch.position.set(x, 0, z);
    ch.rotation.y = rot || 0;
    root.add(ch);
    list.push({ obj: ch, state: state || 'idle' });
    return ch;
  }

  // --------------------------------------------- heritage hall / museum
  // Kerala-style heritage building: banded walls, arched windows, a pillared
  // verandah, steep tiled roofs with lattice gables and brass finials, set in
  // a garden with lamps and benches (Napier Museum, Mattancherry Palace,
  // Kottakkal Arya Vaidya Sala).
  Models.heritageHall = function (colors) {
    const [wallC, bandC, roofC] = colors || [0xb5452e, 0xf2e2c4, 0x4a4a52];
    const g = new T.Group();
    const wall = KT.mat('hallWall' + wallC, { color: wallC, roughness: 0.85 });
    const band = KT.mat('hallBand' + bandC, { color: bandC, roughness: 0.8 });
    const roof = KT.mat('hallRoof' + roofC, { color: roofC, roughness: 0.7 });
    const dark = KT.mat('hallWindow', { color: 0x1d2228, roughness: 0.4, metalness: 0.2 });
    const trim = KT.mat('hallTrim', { color: 0x2a2a2e, roughness: 0.7 });
    // garden, path and plinth
    const lawn = new T.Mesh(G.plane(40, 30), KT.mat('hallLawn', { color: 0x6aa844, roughness: 0.95 }));
    lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.03; lawn.receiveShadow = true; g.add(lawn);
    part(g, G.box(3.2, 0.06, 9), M().stoneGrey, 0, 0.05, 11);
    part(g, G.box(26, 0.9, 14), M().stoneGrey, 0, 0.45, 0);
    steps(g, 6, 5, 0, 0, 7.2, 0);
    // banded main hall
    for (let i = 0; i < 7; i++) part(g, G.box(22, 0.9, 10), i % 2 ? band : wall, 0, 1.35 + i * 0.9, 0);
    part(g, G.box(22.4, 0.25, 10.4), trim, 0, 7.6, 0);
    // arched windows on two floors, front and back
    for (let f = 0; f < 2; f++) for (let i = 0; i < 7; i++) {
      const x = -9 + i * 3, y = 2.4 + f * 2.9;
      [5.02, -5.02].forEach((z) => {
        part(g, G.box(1.1, 1.5, 0.08), dark, x, y, z);
        part(g, new T.CylinderGeometry(0.55, 0.55, 0.08, 12, 1, false, 0, Math.PI), dark, x, y + 0.75, z, Math.PI / 2, 0, Math.PI / 2);
        part(g, G.box(1.4, 0.12, 0.25), band, x, y - 0.8, z + Math.sign(z) * 0.1);
      });
    }
    for (let i = 0; i < 3; i++) [11.02, -11.02].forEach((x) => part(g, G.box(0.08, 1.5, 1.1), dark, x, 3.0, -3 + i * 3));
    // pillared verandah with arches
    for (let i = 0; i < 9; i++) {
      const x = -10 + i * 2.5;
      part(g, G.box(0.6, 0.3, 0.6), band, x, 1.05, 6.2);
      part(g, G.cyl(0.24, 0.28, 3.8, 10), band, x, 3.0, 6.2);
      part(g, G.box(0.6, 0.3, 0.6), band, x, 5.0, 6.2);
      if (i < 8) part(g, G.torus(1.0, 0.12, 6, 14, Math.PI), wall, x + 1.25, 4.6, 6.2);
    }
    part(g, G.box(22, 0.6, 2.4), wall, 0, 5.4, 6.0);
    railing(g, -10.5, 7.1, -3, 7.1, 0.9, 0.8, trim);
    railing(g, 3, 7.1, 10.5, 7.1, 0.9, 0.8, trim);
    // roofs: main roof, verandah lean-to, three front towers, corner towers
    keralaRoof(g, 23.5, 12, 4.2, 7.7, 0, 0, roof);
    part(g, G.box(23, 0.2, 3.2), roof, 0, 5.85, 6.2, -0.25, 0, 0);
    [-8, 0, 8].forEach((x, i) => {
      const hgt = i === 1 ? 4.2 : 2.8;
      part(g, G.box(4, hgt, 4), i === 1 ? wall : band, x, 7.7 + hgt / 2, 3.2);
      for (let k = 0; k < 2; k++) part(g, G.box(0.8, 1.1, 0.08), dark, x - 0.8 + k * 1.6, 7.7 + hgt / 2, 5.23);
      keralaRoof(g, 5.2, 5.2, i === 1 ? 3.8 : 2.8, 7.7 + hgt, x, 3.2, roof);
    });
    [[-11, -4.5], [11, -4.5], [-11, 4.5], [11, 4.5]].forEach(([x, z]) => {
      part(g, G.box(2.6, 9, 2.6), wall, x, 5.4, z);
      part(g, G.box(2.9, 0.3, 2.9), band, x, 9.9, z);
      keralaRoof(g, 3.6, 3.6, 2.4, 10.05, x, z, roof, { gables: false });
    });
    part(g, G.box(2.4, 3.6, 0.2), M().woodDark, 0, 2.7, 5.15);
    const baked = KT.bake(g);
    // garden furniture (merged copies)
    const deco = new T.Group();
    [[-6, 12], [6, 12], [-6, 17], [6, 17]].forEach(([x, z]) => addProto(deco, Models.lampPost(), x, 0, z));
    [[-9, 13, Math.PI / 2], [9, 13, -Math.PI / 2]].forEach(([x, z, r]) => addProto(deco, Models.bench(), x, 0, z, r));
    for (let i = 0; i < 6; i++) addProto(deco, Models.flowerPatch(), -15 + i * 6, 0, 9.5 + (i % 2));
    [[-17, -8], [17, -8], [-17, 10], [17, 10]].forEach(([x, z], i) => addProto(deco, Models.coconutPalm(i + 3), x, 0, z));
    baked.add(KT.bake(deco));
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0.5, hw: 13, hd: 7.2 }, { type: 'circle', x: -17, z: -8, r: 0.4 }, { type: 'circle', x: 17, z: -8, r: 0.4 }, { type: 'circle', x: -17, z: 10, r: 0.4 }, { type: 'circle', x: 17, z: 10, r: 0.4 }];
    return baked;
  };

  // ------------------------------------------------- Jatayu sculpture
  // The fallen bird Jatayu on Jatayupara (Kollam): one wing raised to the
  // sky, talons up, head turned, on a granite hill with a stairway and a
  // viewing deck.
  Models.jatayu = function () {
    const g = new T.Group();
    const stone = KT.mat('jatayuStone', { color: 0xc4bdb0, roughness: 0.7 });
    const stone2 = KT.mat('jatayuStone2', { color: 0xa9a294, roughness: 0.75 });
    const rock = KT.mat('jatayuRock', { color: 0x7f766a, roughness: 0.95 });
    // granite hill
    part(g, KT.blob(9, 2, 0.16, 21), rock, 0, 0.5, -1, 0, 0, 0, 2.3, 0.5, 1.5);
    part(g, KT.blob(5, 1, 0.2, 22), rock, -12, 0.5, 6, 0, 0, 0, 1.4, 0.45, 1.2);
    part(g, KT.blob(4, 1, 0.2, 23), rock, 13, 0.3, -7, 0, 0, 0, 1.3, 0.5, 1.1);
    // stairway up the rock and a viewing deck
    for (let i = 0; i < 12; i++) part(g, G.box(2.4, 0.25, 0.8), M().stoneGrey, -16 + i * 0.75, 0.15 + i * 0.32, 12 - i * 0.6, 0, -0.9, 0);
    part(g, G.box(6, 0.3, 4), M().stoneGrey, -9, 3.9, 6);
    railing(g, -12, 8, -6, 8, 4.05, 1, M().darkGrey);
    // body lying on its back-side, rich with layered feather ridges
    part(g, G.sph(4, 24, 16), stone, 0, 6.4, 0, 0, 0, 0.22, 2.1, 1.05, 1.2);
    for (let i = 0; i < 9; i++) part(g, G.torus(3.2 - Math.abs(i - 4) * 0.25, 0.18, 6, 22, Math.PI), stone2, -6 + i * 1.4, 6.6, 0, 0, Math.PI / 2, 0, 1, 1.05, 1.2);
    // raised wing: primaries fanned out, coverts layered over them
    const wing = new T.Group();
    wing.position.set(-1, 9.5, -1.5);
    wing.rotation.set(-0.45, 0.25, 0.85);
    g.add(wing);
    part(wing, G.box(7, 1, 3.4), stone, 3.2, 0, 0);
    for (let i = 0; i < 11; i++) {
      const a = -0.55 + i * 0.11;
      const f = new T.Group();
      f.position.set(6 + i * 0.2, 0, -1.6 + i * 0.32);
      f.rotation.set(0, a, 0);
      wing.add(f);
      part(f, G.box(1.0 - i * 0.03, 0.28, 9.5 - Math.abs(i - 5) * 0.55), i % 2 ? stone : stone2, 0, 0, 4.4 - Math.abs(i - 5) * 0.27);
    }
    for (let i = 0; i < 8; i++) part(wing, G.box(1.4, 0.36, 4.2), stone2, 1 + i * 0.95, 0.3, 1.2 + (i % 2) * 0.4, 0, 0.1, 0);
    // folded wing beneath
    for (let i = 0; i < 6; i++) part(g, G.box(6 - i * 0.5, 0.35, 1.0), stone2, -2 + i * 0.4, 4.4 + i * 0.12, 3.6 + i * 0.25, 0.2, 0.15, 0.1);
    // neck, head with crest, eye and hooked beak
    for (let i = 0; i < 5; i++) part(g, G.sph(1.7 - i * 0.12, 14, 10), stone, 7.2 + i * 1.15, 6.8 + i * 0.45, 0.8 + i * 0.12);
    part(g, G.sph(1.9, 16, 12), stone, 12.6, 9.0, 1.4, 0, 0, 0, 1.15, 1, 1);
    for (let i = 0; i < 5; i++) part(g, G.cone(0.35, 1.8, 6), stone2, 11.6 - i * 0.3, 10.4 + i * 0.12, 1.2 + (i - 2) * 0.35, 0, 0, 0.9 + i * 0.1);
    part(g, G.cone(0.85, 2.6, 10), KT.mat('jatayuBeak', { color: 0xd9b45a, roughness: 0.55 }), 14.6, 8.6, 1.5, 0, 0, -1.85);
    part(g, G.cone(0.35, 0.9, 8), KT.mat('jatayuBeak', { color: 0xd9b45a }), 15.7, 8.0, 1.5, 0, 0, -2.8);
    part(g, G.sph(0.32, 10, 8), M().black, 13.1, 9.6, 3.0);
    part(g, G.torus(0.42, 0.08, 6, 14), stone2, 13.1, 9.6, 2.95);
    // legs with talons in the air
    [[2.5, 0.8], [4.2, -1.2]].forEach(([x, z], k) => {
      part(g, G.cyl(0.45, 0.6, 3.2, 10), stone2, x, 10.3, z, 0.3 * (k ? -1 : 1), 0, -0.4);
      for (let c = 0; c < 4; c++) part(g, G.cone(0.22, 1.4, 6), stone2, x - 0.6 + c * 0.4, 12.2, z + (c - 1.5) * 0.3, (c - 1.5) * 0.35, 0, -0.5);
    });
    // tail fan
    for (let i = 0; i < 9; i++) part(g, G.box(5.2, 0.3, 1.0), i % 2 ? stone : stone2, -9.6, 5.4 + i * 0.12, -3.2 + i * 0.8, 0, -0.45 + i * 0.11, 0.28);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'circle', x: 0, z: -1, r: 13 }, { type: 'circle', x: 13, z: -7, r: 4 }];
    return baked;
  };

  // ------------------------------------------------------- waterfall
  // A gorge with a wide main fall in two tiers and side streams, mossy
  // ledges, ferns and forest on top, spray, and a wooden viewing deck.
  let sprayTex = null;
  function spray() {
    if (sprayTex) return sprayTex;
    sprayTex = canvasTex(64, 64, (c, w) => {
      const gr = c.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, w);
    });
    return sprayTex;
  }
  Models.waterfall = function (height) {
    const H = height || 16;
    const g = new T.Group();
    const rock = KT.mat('fallRock', { color: 0x58534c, roughness: 0.95 });
    const rock2 = KT.mat('fallRock2', { color: 0x6b655c, roughness: 0.95 });
    const moss = KT.mat('fallMoss', { color: 0x4a6b34, roughness: 0.95 });
    // back wall of stacked ledges, side walls of the gorge
    for (let t = 0; t < 4; t++) for (let i = -4; i <= 4; i++) {
      const y = t * (H / 4) + H / 8;
      part(g, KT.blob(3.2, 1, 0.28, 40 + i * 7 + t), (i + t) % 3 === 0 ? moss : (i + t) % 2 ? rock : rock2, i * 4.2, y, -7 - Math.abs(i) * 0.6 + (t % 2) * 0.6, 0, i, 0, 1.4, 1.1, 1);
    }
    [-1, 1].forEach((sd) => {
      for (let t = 0; t < 4; t++) part(g, KT.blob(4, 1, 0.25, 70 + t + sd), t % 2 ? rock : moss, sd * 19, t * (H / 4) + 2, -1 + t, 0, t, 0, 1, 1.2, 1.6);
    });
    // a ledge in the middle the water breaks on
    part(g, G.box(9, 0.8, 2.4), rock2, 0, H * 0.45, -3.6);
    // forest and ferns
    const top = new T.Group();
    for (let i = 0; i < 8; i++) addProto(top, Models.forestTree ? Models.forestTree(i + 3) : Models.mangoTree(), -17 + i * 5, H + 0.5, -10 - (i % 2) * 3, i, 0.8);
    for (let i = 0; i < 14; i++) {
      const x = -16 + i * 2.4, y = 0.3 + (i % 4) * (H / 5), z = -4.5 + (i % 3);
      for (let f = 0; f < 5; f++) part(g, G.cone(0.12, 1.3, 4), M().leafLight, x + Math.cos(f) * 0.3, y + 0.5, z + Math.sin(f) * 0.3, Math.cos(f) * 0.7, 0, Math.sin(f) * 0.7);
    }
    // boulders round the pool and a viewing deck with railing
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.05 + i * 0.11); part(g, KT.blob(1.2 + (i % 3) * 0.4, 1, 0.3, 90 + i), i % 2 ? rock : rock2, Math.cos(a) * 10.5, 0.4, 1.5 + Math.sin(a) * 6.5); }
    part(g, G.box(8, 0.25, 3), M().wood, 9, 1.1, 9);
    for (let x = 5.2; x <= 12.8; x += 1.9) part(g, G.box(0.18, 1.1, 0.18), M().woodDark, x, 0.55, 7.6);
    railing(g, 5.1, 7.6, 12.9, 7.6, 1.2, 1, M().woodDark);
    const baked = KT.bake(g);
    baked.add(KT.bake(top));
    // flowing water (one moving texture for every stream)
    const tex = canvasTex(64, 256, (c, w, h) => {
      c.fillStyle = '#d5ecf2'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        c.fillStyle = 'rgba(' + (140 + Math.random() * 70) + ',' + (185 + Math.random() * 45) + ',215,0.75)';
        c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 12 + Math.random() * 50);
      }
    });
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(3, 2);
    const waterMat = new T.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.9, roughness: 0.15, emissive: 0x9fc6d0, emissiveIntensity: 0.3, side: T.DoubleSide });
    const sheet = (w, h, x, y, z, tilt) => { const m = new T.Mesh(G.plane(w, h), waterMat); m.position.set(x, y, z); m.rotation.x = tilt || -0.06; baked.add(m); };
    sheet(10, H * 0.55, 0, H * 0.72, -4.6);           // upper fall
    sheet(12, H * 0.45, 0, H * 0.23, -2.2, -0.12);    // lower fall off the ledge
    sheet(2.4, H * 0.8, -9, H * 0.42, -5.6);           // side streams
    sheet(1.8, H * 0.6, 8.5, H * 0.32, -5.4);
    // foam and spray
    const foam = new T.Mesh(new T.RingGeometry(1.5, 6.5, 28), new T.MeshStandardMaterial({ color: 0xf2f8f8, transparent: true, opacity: 0.55, roughness: 0.3 }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.25, 0); baked.add(foam);
    const sm = new T.SpriteMaterial({ map: spray(), transparent: true, depthWrite: false, opacity: 0.55 });
    for (let i = 0; i < 7; i++) { const s = new T.Sprite(sm); s.position.set(-5 + i * 1.7, 1.6 + (i % 3) * 1.1, -0.8 + (i % 2)); s.scale.set(5, 4, 1); baked.add(s); }
    baked.userData.flow = tex;
    baked.userData.colliders = [{ type: 'box', x: 0, z: -7, hw: 22, hd: 5 }, { type: 'box', x: 19, z: 2, hw: 4, hd: 6 }, { type: 'box', x: -19, z: 2, hw: 4, hd: 6 }];
    return baked;
  };

  // ----------------------------------------------------- Varkala cliff
  // Layered red laterite cliffs above the beach: grassy cliff top with
  // palms, a railed walkway, colourful cafés, and steps down to the sand.
  Models.cliff = function () {
    const g = new T.Group();
    const laterite = [0xb5532e, 0xc76a3e, 0x9a4428, 0xd7884f].map((c, i) => KT.mat('cliffLat' + i, { map: KT.tex('laterite', 2, 2), color: c }, 0.2));
    const top = KT.mat('cliffTop', { color: 0x6d9a42, roughness: 0.95 });
    const rng = KT.makeRng(42);
    for (let i = -5; i <= 5; i++) {
      const h = 9 + Math.sin(i * 1.7) * 1.2;
      let y = 0;
      const zf = -2 + Math.cos(i * 1.3) * 0.8;
      // strata with ragged edges
      for (let l = 0; l < 5; l++) {
        const lh = h / 5 * (0.8 + rng() * 0.4);
        part(g, G.box(5.4 + rng() * 0.8, lh, 9 + rng() * 1.2), laterite[(l + i + 8) % 4], i * 5.2, y + lh / 2, zf - l * 0.25 + rng() * 0.4);
        y += lh;
      }
      part(g, G.box(5.6, 0.6, 9), top, i * 5.2, y + 0.3, zf - 1);
      // eroded gullies
      if (i % 2) part(g, G.box(0.8, h * 0.8, 0.6), laterite[2], i * 5.2 + 2.6, h * 0.4, zf + 4.4);
    }
    // walkway and railing along the top edge
    part(g, G.box(56, 0.12, 2), M().stoneGrey, 0, 10.45, 1.2);
    railing(g, -28, 2.3, -5, 2.3, 10.5, 1, M().white);
    railing(g, -1, 2.3, 28, 2.3, 10.5, 1, M().white);
    // steps down the cliff face to the beach
    for (let i = 0; i < 16; i++) part(g, G.box(2.2, 0.3, 0.9), M().stoneGrey, -3 + (i % 2) * 0.2, 10.2 - i * 0.65, 2.6 + i * 0.5);
    // cafés
    const cafeCols = [0x2a9d8f, 0xe07a1f, 0x6b3fa0, 0xd8203a];
    [-20, -9, 7, 19].forEach((x, i) => {
      part(g, G.box(5, 2.6, 3.6), M().woodLight, x, 11.7, -3.2);
      part(g, G.box(5.4, 0.15, 2.2), KT.mat('cafeAwning' + i, { color: cafeCols[i], roughness: 0.6 }), x, 12.9, -0.6, 0.25, 0, 0);
      hipRoof(g, 5.8, 4.4, 1.6, M().thatch, 13.0, x, -3.2);
      for (let k = 0; k < 2; k++) {
        part(g, G.cyl(0.5, 0.5, 0.06, 12), M().woodDark, x - 1.2 + k * 2.4, 11.25, 0.2);
        part(g, G.cyl(0.06, 0.06, 0.8, 6), M().woodDark, x - 1.2 + k * 2.4, 10.85, 0.2);
      }
    });
    const baked = KT.bake(g);
    const palms = new T.Group();
    [-25, -14, -2, 13, 24].forEach((x, i) => addProto(palms, Models.coconutPalm(i + 11), x, 10.3, -6.5 + (i % 2) * 2));
    baked.add(KT.bake(palms));
    baked.userData.colliders = [{ type: 'box', x: 0, z: -2, hw: 29, hd: 5.5 }];
    return baked;
  };

  // ------------------------------------------------- beach umbrellas
  // Striped umbrellas with loungers, a lifeguard tower, fishing boats
  // pulled up on the sand and palms.
  Models.beachSet = function (n) {
    n = n || 4;
    const g = new T.Group();
    const cols = [0xd8203a, 0xf2c230, 0x2c5fa8, 0x2a9d8f, 0xe07a1f];
    const rng = KT.makeRng(5 + n);
    for (let i = 0; i < n; i++) {
      const x = (i - n / 2) * 5 + rng() * 2, z = rng() * 6 - 3;
      part(g, G.cyl(0.05, 0.05, 2.4, 6), M().white, x, 1.2, z);
      for (let k = 0; k < 8; k++) {
        const seg = new T.ConeGeometry(1.7, 0.65, 8, 1, false, k * Math.PI / 4, Math.PI / 4);
        part(g, seg, k % 2 ? M().white : KT.mat('umbrella' + i % 5, { color: cols[i % 5], roughness: 0.6 }), x, 2.5, z);
      }
      [-0.6, 0.6].forEach((dx) => {
        part(g, G.box(0.65, 0.08, 1.8), M().white, x + 1.3 + dx, 0.35, z + 0.6, 0.0, 0, 0);
        part(g, G.box(0.65, 0.08, 0.7), M().white, x + 1.3 + dx, 0.55, z - 0.25, -0.6, 0, 0);
        part(g, G.box(0.6, 0.06, 1.2), KT.mat('towel' + i % 5, { color: cols[(i + 2) % 5] }), x + 1.3 + dx, 0.41, z + 0.7);
      });
    }
    // lifeguard tower
    const lx = (n / 2) * 5 + 3;
    [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([a, b]) => part(g, G.box(0.15, 3, 0.15), M().woodLight, lx + a, 1.5, b));
    part(g, G.box(2, 0.15, 2), M().wood, lx, 3, 0);
    part(g, G.box(2, 1, 0.1), KT.mat('lifeguardRed', { color: 0xd8203a }), lx, 3.5, 1);
    hipRoof(g, 2.4, 2.4, 0.8, M().thatch, 4.4, lx, 0);
    for (let i = 0; i < 8; i++) part(g, G.box(0.9, 0.08, 0.3), M().wood, lx, 0.3 + i * 0.35, 1.4 + i * 0.12, 0.3, 0, 0);
    part(g, G.cyl(0.03, 0.03, 2.2, 6), M().white, lx + 0.9, 5.2, 0.9);
    part(g, G.box(0.9, 0.5, 0.02), KT.mat('flagRed', { color: 0xd8203a }), lx + 1.35, 6, 0.9);
    const baked = KT.bake(g);
    const extra = new T.Group();
    addProto(extra, Models.canoe(), -(n / 2) * 5 - 4, 0.05, -2, 0.6);
    addProto(extra, Models.canoe(), -(n / 2) * 5 - 2, 0.05, 2, 0.3);
    [-(n / 2) * 5 - 7, (n / 2) * 5 + 7].forEach((x, i) => addProto(extra, Models.coconutPalm(i + 21), x, 0, -5));
    baked.add(KT.bake(extra));
    return baked;
  };

  // ------------------------------------------------------ lake temple
  // Ananthapura: a laterite shrine with a pillared verandah, two-tier copper
  // roof and gables, a brass lamp tower, a stone footbridge to the shore and
  // lotus leaves on the water.
  Models.lakeShrine = function () {
    const g = new T.Group();
    const lat = KT.mat('shrineLaterite', { map: KT.tex('laterite', 1, 1), color: 0xc98a62 }, 0.25);
    const copper = KT.mat('copperRoof', { color: 0x4f8f7a, roughness: 0.5, metalness: 0.4 });
    // island platform with steps into the water
    part(g, G.box(11, 1.4, 11), lat, 0, 0.7, 0);
    for (let i = 0; i < 3; i++) part(g, G.box(12.4 - i * 0.6, 0.2, 12.4 - i * 0.6), M().stoneGrey, 0, 0.1 + i * 0.2, 0);
    part(g, G.box(11.2, 0.15, 11.2), M().stoneGrey, 0, 1.45, 0);
    // stone railing round the edge
    [[-5.4, -5.4, 5.4, -5.4], [-5.4, 5.4, -1.2, 5.4], [1.2, 5.4, 5.4, 5.4], [-5.4, -5.4, -5.4, 5.4], [5.4, -5.4, 5.4, 5.4]].forEach(([a, b, c, d]) => railing(g, a, b, c, d, 1.5, 0.7, M().stoneGrey));
    // verandah pillars, sanctum, door
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if (i > 0 && i < 3 && j > 0 && j < 3) continue;
      const x = -3.3 + i * 2.2, z = -3.3 + j * 2.2;
      part(g, G.cyl(0.18, 0.2, 2.6, 8), M().woodDark, x, 2.85, z);
      part(g, G.box(0.45, 0.2, 0.45), M().brass, x, 1.65, z);
    }
    part(g, G.box(4.2, 3, 4.2), lat, 0, 3, 0);
    part(g, G.box(1.2, 2.2, 0.1), M().woodDark, 0, 2.6, 2.12);
    part(g, G.box(1.5, 0.15, 0.15), M().brass, 0, 3.75, 2.15);
    // two-tier copper roof
    keralaRoof(g, 8.6, 8.6, 2.2, 4.1, 0, 0, copper, { gables: false });
    part(g, G.box(4.6, 1.0, 4.6), lat, 0, 6.3, 0);
    keralaRoof(g, 5.6, 5.6, 2.6, 6.8, 0, 0, copper);
    // lamp tower and footbridge to the shore (+z)
    const bridge = new T.Group();
    lampTower(bridge, 0, 7.5, 3.2);
    bridge.position.y = 1.5;
    g.add(bridge);
    part(g, G.box(2, 0.3, 13), M().stoneGrey, 0, 1.2, 12.5);
    for (let z = 7; z <= 18; z += 2.2) [-1, 1].forEach((s) => part(g, G.box(0.3, 1.6, 0.3), M().stoneGrey, s * 0.75, 0.4, z));
    railing(g, -0.95, 6.5, -0.95, 19, 1.35, 0.7, M().stoneGrey);
    railing(g, 0.95, 6.5, 0.95, 19, 1.35, 0.7, M().stoneGrey);
    // lotus leaves and flowers
    const leaf = KT.mat('lotusLeaf', { color: 0x3f8a3a, roughness: 0.6, side: T.DoubleSide });
    const lotus = KT.mat('lotusPink', { color: 0xf08ab0, roughness: 0.5 });
    const rng = KT.makeRng(8);
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2, r = 7 + rng() * 7;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 2 && z > 5) continue;
      const lf = part(g, new T.CircleGeometry(0.5 + rng() * 0.4, 12, 0.3, Math.PI * 1.8), leaf, x, 0.62, z, -Math.PI / 2, 0, rng() * 6);
      lf.castShadow = false;
      if (i % 4 === 0) part(g, G.cone(0.2, 0.35, 6), lotus, x + 0.3, 0.8, z, Math.PI);
    }
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 5.8, hd: 5.8 }];
    return baked;
  };

  // ------------------------------------------------------------ Theyyam
  // A Theyyam performance in front of a small shrine (kavu): the giant
  // figure with its palm-leaf skirt, breastplate, sword and shield, the
  // great round headdress with its flame border, flaming torches, and two
  // chenda drummers.
  Models.theyyam = function () {
    const g = new T.Group();
    const red = KT.mat('theyyamRed', { color: 0xc4171c, roughness: 0.55 });
    const yel = KT.mat('theyyamYellow', { color: 0xf2b21b, roughness: 0.45 });
    const white = KT.mat('theyyamWhite', { color: 0xf4efe4, roughness: 0.6 });
    const black = KT.mat('theyyamBlack', { color: 0x1d1d1d, roughness: 0.6 });
    // courtyard and kavu behind
    part(g, G.cyl(8, 8.3, 0.4, 32), M().stoneGrey, 0, 0.2, 0);
    part(g, G.box(6, 3, 4), KT.mat('kavuLaterite', { map: KT.tex('laterite', 1, 1), color: 0xc98a62 }, 0.25), 0, 1.9, -10);
    keralaRoof(g, 7.4, 5.4, 3, 3.4, 0, -10, M().roof);
    part(g, G.box(1.2, 2, 0.1), M().woodDark, 0, 1.4, -7.95);
    lampTower(g, -4.5, -7, 2.6);
    lampTower(g, 4.5, -7, 2.6);
    // palm-leaf skirt: many strands in a bell
    part(g, G.cone(2.4, 3.6, 24), KT.mat('palmSkirtIn', { color: 0xb59a52, roughness: 0.8 }), 0, 2.4, 0);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      part(g, G.box(0.18, 3.8, 0.04), KT.mat('palmSkirt' + (i % 2), { color: i % 2 ? 0xe2cd85 : 0xd2b866, roughness: 0.8 }), Math.cos(a) * 1.75, 2.35, Math.sin(a) * 1.75, Math.sin(a) * 0.32, -a + Math.PI / 2, -Math.cos(a) * 0.32 * 0);
    }
    part(g, G.torus(1.25, 0.18, 6, 24), yel, 0, 4.25, 0, Math.PI / 2);
    // body, breastplate and ornaments
    part(g, G.cyl(1.1, 1.3, 2.8, 16), red, 0, 5.6, 0);
    part(g, G.sph(1.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), white, 0, 6.1, 0.35, 0, 0, 0, 1, 0.8, 0.8);
    for (let i = 0; i < 5; i++) part(g, G.torus(0.9 - i * 0.12, 0.06, 5, 18, Math.PI), i % 2 ? yel : red, 0, 6.6 - i * 0.22, 0.55, Math.PI / 2 + 0.2, 0, 0);
    part(g, G.torus(1.15, 0.1, 6, 20), yel, 0, 7.0, 0, Math.PI / 2);
    // arms with bangles, sword and shield
    [-1, 1].forEach((s) => {
      part(g, G.cyl(0.32, 0.28, 2.4, 10), red, s * 1.7, 6.0, 0.4, 0.25, 0, s * 0.75);
      for (let k = 0; k < 3; k++) part(g, G.torus(0.33, 0.07, 5, 12), k % 2 ? white : yel, s * (1.45 + k * 0.28), 6.2 - k * 0.2, 0.4, Math.PI / 2, 0, s * 0.75);
    });
    part(g, G.box(0.12, 3.2, 0.3), M().darkGrey, -3.0, 6.6, 0.7, 0, 0, 0.3);
    part(g, G.box(0.5, 0.15, 0.5), M().gold, -2.75, 5.1, 0.7);
    part(g, G.cyl(1.0, 1.0, 0.15, 20), red, 2.8, 5.6, 1.0, Math.PI / 2, 0, 0.4);
    part(g, G.torus(1.0, 0.1, 6, 20), yel, 2.8, 5.6, 1.08, 0, 0.4, 0);
    // face: red with white-rimmed eyes and black patterns, ear ornaments
    part(g, G.sph(0.95, 18, 14), red, 0, 8.1, 0.2);
    part(g, G.box(1.5, 0.22, 0.25), yel, 0, 8.45, 0.95);
    [-0.33, 0.33].forEach((x) => {
      part(g, G.sph(0.17, 10, 8), white, x, 8.3, 1.02);
      part(g, G.sph(0.08, 8, 6), black, x, 8.3, 1.16);
      part(g, G.torus(0.3, 0.05, 5, 12), yel, x * 3.1, 8.0, 0.2, 0, Math.PI / 2, 0);
    });
    part(g, G.box(0.9, 0.08, 0.1), black, 0, 7.8, 1.08, 0, 0, 0);
    part(g, G.cone(0.12, 0.6, 6), white, -0.3, 7.6, 1.0, 0, 0, 2.6);
    part(g, G.cone(0.12, 0.6, 6), white, 0.3, 7.6, 1.0, 0, 0, -2.6);
    // the great mudi: painted disc, spokes and a border of flames
    const mudi = canvasTex(256, 256, (c, w) => {
      const cx = w / 2;
      [['#c4171c', 128], ['#f2b21b', 116], ['#f4efe4', 104], ['#c4171c', 92], ['#1d1d1d', 80], ['#f2b21b', 70], ['#c4171c', 52], ['#f4efe4', 36], ['#c4171c', 22]].forEach(([col, r]) => { c.fillStyle = col; c.beginPath(); c.arc(cx, cx, r, 0, Math.PI * 2); c.fill(); });
      c.strokeStyle = '#f2b21b'; c.lineWidth = 3;
      for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * 38, cx + Math.sin(a) * 38); c.lineTo(cx + Math.cos(a) * 90, cx + Math.sin(a) * 90); c.stroke(); }
      c.fillStyle = '#f4efe4';
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(a) * 98, cx + Math.sin(a) * 98, 5, 0, Math.PI * 2); c.fill(); }
    });
    const disc = new T.Mesh(new T.CircleGeometry(3.8, 48), new T.MeshStandardMaterial({ map: mudi, side: T.DoubleSide, roughness: 0.5 }));
    disc.position.set(0, 10.2, -0.7);
    disc.castShadow = true;
    g.add(disc);
    part(g, G.torus(3.85, 0.18, 6, 48), yel, 0, 10.2, -0.68);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      part(g, G.cone(0.28, 0.9, 5), i % 2 ? red : yel, Math.cos(a) * 4.3, 10.2 + Math.sin(a) * 4.3, -0.72, 0, 0, a - Math.PI / 2);
    }
    // flaming torches round the courtyard
    const flame = KT.mat('torchFlame', { color: 0xffb030, emissive: 0xff7a10, emissiveIntensity: 2.2, roughness: 0.5 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const x = Math.cos(a) * 7, z = Math.sin(a) * 7;
      part(g, G.cyl(0.07, 0.1, 2.6, 8), M().woodDark, x, 1.3, z);
      part(g, G.cyl(0.18, 0.12, 0.3, 8), M().darkGrey, x, 2.65, z);
      part(g, G.cone(0.2, 0.7, 7), flame, x, 3.1, z);
    }
    const baked = KT.bake(g);
    // two chenda drummers
    const actors = [];
    [-3.8, 3.8].forEach((x, i) => {
      const ch = person(actors, baked, { gender: 'male', outfit: 'mundu', hair: 'short', skin: i ? 0x8d5a3b : 0xa8704c }, x, 3.5, x < 0 ? 0.6 : -0.6, 'idle');
      part(ch, G.cyl(0.32, 0.32, 0.75, 14), KT.mat('chenda', { color: 0x8a3b24, roughness: 0.6 }), 0, 1.05, 0.45, Math.PI / 2 - 0.3, 0, 0);
      part(ch, G.cyl(0.33, 0.33, 0.03, 14), M().white, 0, 1.17, 0.83, Math.PI / 2 - 0.3, 0, 0);
    });
    baked.userData.actors = actors;
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 2.8 }, { type: 'box', x: 0, z: -10, hw: 3.4, hd: 2.4 }];
    return baked;
  };

  // ------------------------------------------------------ football ground
  // A Malappuram sevens ground: striped pitch, nets, floodlights, a
  // scoreboard, fenced gallery with fans, and a match in progress.
  Models.footballGround = function () {
    const g = new T.Group();
    const L = 44, W = 28;
    const tex = canvasTex(512, 330, (c, w, h) => {
      for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#4f9a3a' : '#5aa844'; c.fillRect(i * w / 10, 0, w / 10, h); }
      c.strokeStyle = '#ffffff'; c.lineWidth = 4;
      c.strokeRect(12, 12, w - 24, h - 24);
      c.beginPath(); c.moveTo(w / 2, 12); c.lineTo(w / 2, h - 12); c.stroke();
      c.beginPath(); c.arc(w / 2, h / 2, 40, 0, Math.PI * 2); c.stroke();
      c.strokeRect(12, h / 2 - 70, 60, 140); c.strokeRect(w - 72, h / 2 - 70, 60, 140);
      c.strokeRect(12, h / 2 - 34, 24, 68); c.strokeRect(w - 36, h / 2 - 34, 24, 68);
    });
    const field = new T.Mesh(G.plane(L, W), new T.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    field.rotation.x = -Math.PI / 2; field.position.y = 0.04; field.receiveShadow = true;
    g.add(field);
    const netTex = canvasTex(64, 64, (c, w) => { c.strokeStyle = '#ffffff'; c.lineWidth = 2; for (let i = 0; i <= w; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, w); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } });
    netTex.wrapS = netTex.wrapT = T.RepeatWrapping; netTex.repeat.set(3, 3);
    const net = new T.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: T.DoubleSide, roughness: 0.8 });
    [-1, 1].forEach((s) => {
      const x = s * (L / 2 - 0.8);
      part(g, G.box(0.15, 2.4, 0.15), M().white, x, 1.2, -3.6);
      part(g, G.box(0.15, 2.4, 0.15), M().white, x, 1.2, 3.6);
      part(g, G.box(0.15, 0.15, 7.4), M().white, x, 2.4, 0);
      const back = new T.Mesh(G.plane(7.2, 2.4), net); back.position.set(x + s * 1.6, 1.2, 0); back.rotation.y = Math.PI / 2; g.add(back);
      [-3.6, 3.6].forEach((z) => { const sd = new T.Mesh(G.plane(1.6, 2.4), net); sd.position.set(x + s * 0.8, 1.2, z); g.add(sd); });
      const top = new T.Mesh(G.plane(1.6, 7.2), net); top.position.set(x + s * 0.8, 2.4, 0); top.rotation.set(-Math.PI / 2, 0, Math.PI / 2); g.add(top);
    });
    // fence round the pitch
    railing(g, -L / 2 - 2, W / 2 + 2, L / 2 + 2, W / 2 + 2, 0, 1.1, M().darkGrey);
    railing(g, -L / 2 - 2, -W / 2 - 2, -L / 2 - 2, W / 2 + 2, 0, 1.1, M().darkGrey);
    railing(g, L / 2 + 2, -W / 2 - 2, L / 2 + 2, W / 2 + 2, 0, 1.1, M().darkGrey);
    // gallery and roof
    for (let r = 0; r < 4; r++) part(g, G.box(L - 6, 0.45, 1.2), M().stoneGrey, 0, 0.22 + r * 0.45, -W / 2 - 1.6 - r * 1.2);
    for (let i = 0; i < 5; i++) part(g, G.cyl(0.1, 0.1, 4.2, 8), M().darkGrey, -16 + i * 8, 2.1, -W / 2 - 6.4);
    part(g, G.box(L - 4, 0.15, 6), KT.mat('galleryRoof', { color: 0x2c5fa8, roughness: 0.5, metalness: 0.3 }), 0, 4.3, -W / 2 - 3.6, 0.12, 0, 0);
    // floodlights
    [[-L / 2 - 3, -W / 2 - 3], [L / 2 + 3, -W / 2 - 3], [-L / 2 - 3, W / 2 + 3], [L / 2 + 3, W / 2 + 3]].forEach(([x, z]) => {
      part(g, G.cyl(0.18, 0.28, 14, 8), M().darkGrey, x, 7, z);
      part(g, G.box(2.4, 1.4, 0.3), M().darkGrey, x, 14.2, z, 0, Math.atan2(-x, -z), 0);
      for (let k = 0; k < 6; k++) part(g, G.box(0.5, 0.4, 0.05), M().lampGlow, x - 0.8 + (k % 3) * 0.8, 13.9 + Math.floor(k / 3) * 0.5, z - Math.sign(z) * 0.18, 0, Math.atan2(-x, -z), 0);
    });
    // scoreboard
    const score = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd34d'; c.font = 'bold 28px Arial'; c.textAlign = 'center'; c.fillText('MALAPPURAM 2 : 1 MANJERI', w / 2, 40); c.fillStyle = '#3ddc84'; c.font = 'bold 24px Arial'; c.fillText('SEVENS FINAL  64:12', w / 2, 78); });
    part(g, G.box(0.2, 5, 0.2), M().darkGrey, L / 2 + 6, 2.5, -4);
    part(g, G.box(0.2, 5, 0.2), M().darkGrey, L / 2 + 6, 2.5, 4);
    const board = new T.Mesh(G.plane(8, 3), new T.MeshStandardMaterial({ map: score, emissive: 0xffffff, emissiveMap: score, emissiveIntensity: 0.4 }));
    board.position.set(L / 2 + 5.9, 5.5, 0); board.rotation.y = -Math.PI / 2;
    g.add(board);
    part(g, G.sph(0.22, 12, 10), M().white, 3, 0.22, 2);
    const baked = KT.bake(g);
    // players and fans
    const actors = [];
    const team = (top) => ({ gender: 'male', outfit: 'tee', colors: { top, bottom: 0xffffff }, hair: 'short' });
    [[-8, -4, 0x0f4fa8], [-4, 6, 0x0f4fa8], [-14, 2, 0x0f4fa8], [5, -6, 0xd8203a], [9, 4, 0xd8203a], [14, -1, 0xd8203a]].forEach(([x, z, c], i) => person(actors, baked, Object.assign(team(c), { skin: [0xd9a27c, 0xa8704c, 0x8d5a3b][i % 3] }), x, z, i < 3 ? Math.PI / 2 : -Math.PI / 2, 'run'));
    for (let i = 0; i < 6; i++) person(actors, baked, { gender: i % 3 ? 'male' : 'female', outfit: i % 3 ? 'mundu' : 'churidar', hair: 'default', lite: 'far' }, -14 + i * 5.5, -W / 2 - 2.8 - (i % 2) * 1.2, 0, i % 2 ? 'wave' : 'idle').position.y = 0.6 + (i % 2) * 0.45;
    baked.userData.actors = actors;
    baked.userData.colliders = [{ type: 'box', x: 0, z: -W / 2 - 3.5, hw: L / 2 - 2, hd: 3 }, { type: 'box', x: L / 2 + 6, z: 0, hw: 0.4, hd: 4.2 }];
    return baked;
  };

  // --------------------------------------------- Malampuzha garden
  // Lawns, flower beds and topiary, a three-tier fountain, benches and
  // lamps, the reclining Yakshi sculpture and the ropeway.
  Models.garden = function () {
    const g = new T.Group();
    const hedge = KT.mat('hedge', { color: 0x2f6b2a, roughness: 0.9 });
    const lawn = new T.Mesh(new T.CircleGeometry(21, 48), KT.mat('lawn', { color: 0x6fae4a, roughness: 0.95 }));
    lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.03; lawn.receiveShadow = true;
    g.add(lawn);
    // paths
    [0, Math.PI / 2].forEach((a) => part(g, G.box(42, 0.05, 2.4), KT.mat('gardenPath', { color: 0xd8c7a3, roughness: 0.9 }), 0, 0.06, 0, 0, a, 0));
    const flowers = [0xe0447a, 0xf2c230, 0xe85d2a, 0xb04ad8, 0xffffff];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
      part(g, G.box(4.4, 0.6, 1.0), hedge, Math.cos(a) * 16, 0.3, Math.sin(a) * 16, 0, -a + Math.PI / 2, 0);
      for (let k = 0; k < 10; k++) {
        const r = 9.5 + (k % 2) * 1.2, aa = a - 0.18 + k * 0.04;
        part(g, G.sph(0.32, 6, 5), KT.mat('flowerBed' + ((i + k) % 5), { color: flowers[(i + k) % 5], roughness: 0.8 }), Math.cos(aa) * r, 0.3, Math.sin(aa) * r);
      }
    }
    // topiary: balls on stems and an elephant
    [[12, 12], [-12, 12], [12, -12]].forEach(([x, z]) => { part(g, G.cyl(0.12, 0.15, 1.2, 6), M().woodDark, x, 0.6, z); part(g, G.sph(1.1, 12, 10), hedge, x, 1.8, z); });
    const ex = -12, ez = -12;
    part(g, G.sph(1.6, 14, 10), hedge, ex, 2.1, ez, 0, 0, 0, 1.4, 1, 1);
    part(g, G.sph(0.95, 12, 10), hedge, ex + 2.2, 2.6, ez);
    part(g, G.cyl(0.25, 0.4, 1.8, 8), hedge, ex + 3.0, 1.7, ez, 0, 0, 0.3);
    [[-1, -0.7], [-1, 0.7], [1, -0.7], [1, 0.7]].forEach(([a, b]) => part(g, G.cyl(0.38, 0.4, 1.1, 8), hedge, ex + a, 0.55, ez + b));
    // three-tier fountain
    const water = KT.mat('fountainWater', { color: 0x6fc6d8, roughness: 0.1, transparent: true, opacity: 0.85 });
    part(g, G.cyl(4.8, 5.1, 0.8, 40), M().stoneGrey, 0, 0.4, 0);
    part(g, G.cyl(4.4, 4.4, 0.1, 40), water, 0, 0.76, 0);
    [[2.4, 2.0], [1.4, 3.1], [0.7, 4.0]].forEach(([r, y]) => {
      part(g, G.cyl(0.35, 0.45, y - 0.8, 10), M().white, 0, (y + 0.8) / 2, 0);
      part(g, G.cyl(r, r * 0.6, 0.35, 24), M().white, 0, y, 0);
      part(g, G.cyl(r * 0.92, r * 0.92, 0.05, 24), water, 0, y + 0.17, 0);
      part(g, new T.CylinderGeometry(r * 1.02, r * 1.1, y - 0.85, 24, 1, true), water, 0, (y + 0.8) / 2 - 0.05, 0);
    });
    part(g, G.cone(0.25, 1.4, 8), water, 0, 4.9, 0);
    // benches and lamps along the paths
    const deco = new T.Group();
    [[6, 3, 0], [-6, -3, Math.PI], [3, -6, Math.PI / 2], [-3, 6, -Math.PI / 2]].forEach(([x, z, r]) => addProto(deco, Models.bench(), x, 0, z, r));
    [[8, 2], [-8, -2], [2, -8], [-2, 8], [17, 2], [-17, -2]].forEach(([x, z]) => addProto(deco, Models.lampPost(), x, 0, z));
    // the reclining Yakshi on her plinth
    const y = KT.mat('yakshi', { color: 0xc9c2b4, roughness: 0.8 });
    part(g, G.box(9, 1.4, 3.6), M().stoneGrey, 0, 0.7, -18);
    part(g, G.capsule(1.1, 3.6, 4, 12), y, -0.4, 2.6, -18, 0, 0, Math.PI / 2 - 0.25);
    part(g, G.capsule(0.75, 3.4, 4, 10), y, -3.8, 2.0, -17.6, 0, 0.15, Math.PI / 2 + 0.15);
    part(g, G.capsule(0.65, 3.0, 4, 10), y, -3.6, 1.9, -18.6, 0, -0.15, Math.PI / 2 + 0.1);
    part(g, G.sph(0.85, 14, 12), y, 2.9, 3.8, -18);
    part(g, G.sph(0.6, 10, 8), y, 3.5, 4.4, -18.3);
    part(g, G.capsule(0.35, 2.4, 4, 8), y, 1.6, 4.4, -17.4, 0, 0, -0.9);
    part(g, G.capsule(0.32, 2.2, 4, 8), y, 1.4, 2.8, -16.9, 0.3, 0, 0.5);
    // ropeway: two towers, a cable and cabins
    [[-20, 8], [20, 8]].forEach(([x, z]) => {
      part(g, G.box(0.5, 12, 0.5), M().darkGrey, x, 6, z);
      part(g, G.box(3, 0.4, 0.4), M().darkGrey, x, 12, z);
    });
    part(g, G.box(40, 0.06, 0.06), M().black, 0, 11.6, 7.1);
    part(g, G.box(40, 0.06, 0.06), M().black, 0, 11.6, 8.9);
    [-10, 0, 10].forEach((x, i) => {
      part(g, G.box(0.06, 1.4, 0.06), M().black, x, 10.9, 7.1);
      part(g, G.box(1.6, 1.3, 1.3), KT.mat('cabin' + i, { color: [0xd8203a, 0xf2c230, 0x2c5fa8][i], roughness: 0.5 }), x, 9.6, 7.1);
    });
    const baked = KT.bake(g);
    baked.add(KT.bake(deco));
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 5.2 }, { type: 'box', x: 0, z: -18, hw: 4.6, hd: 1.9 }, { type: 'circle', x: ex, z: ez, r: 2.4 }];
    return baked;
  };

  // ---------------------------------------------------- earth dam
  // Grassy embankment with a stone-pitched water face, a crest road with
  // lamps, a spillway with shutters and a control tower.
  Models.earthDam = function () {
    const g = new T.Group();
    const grass = KT.mat('damGrass', { color: 0x6d9a42, roughness: 0.95 });
    const shape = new T.Shape();
    shape.moveTo(-9, 0); shape.lineTo(-2, 8); shape.lineTo(2, 8); shape.lineTo(9, 0); shape.lineTo(-9, 0);
    const geo = new T.ExtrudeGeometry(shape, { depth: 70, bevelEnabled: false });
    geo.translate(0, 0, -35);
    geo.rotateY(Math.PI / 2);
    part(g, geo, grass, 0, 0, 0);
    // stone pitching on the water side (-z)
    part(g, G.box(70, 0.2, 8.5), KT.mat('damStone', { color: 0x8f8a80, roughness: 0.95 }), 0, 4.1, -5.6, -0.85, 0, 0);
    part(g, G.box(70, 0.3, 4), KT.mat('damRoad', { color: 0x6b6b6b, roughness: 0.9 }), 0, 8.1, 0);
    railing(g, -35, -1.9, 35, -1.9, 8.25, 0.9, M().white);
    railing(g, -35, 1.9, 35, 1.9, 8.25, 0.9, M().white);
    // spillway section with gates
    part(g, G.box(18, 8.2, 6), KT.mat('damConcrete', { color: 0xbdb8ac, roughness: 0.92 }), 22, 4.1, 0.5);
    for (let i = 0; i < 5; i++) {
      part(g, G.box(0.8, 9.5, 6.6), KT.mat('damConcrete', { color: 0xbdb8ac }), 14 + i * 4, 4.75, 0.5);
      if (i < 4) part(g, G.box(3.0, 3.2, 0.25), KT.mat('damGate', { color: 0x3a5f7a, roughness: 0.5, metalness: 0.5 }), 16 + i * 4, 6.2, -2.4);
    }
    part(g, G.box(18, 0.5, 2), KT.mat('damConcrete', { color: 0xbdb8ac }), 22, 9.6, 0.5);
    // control tower
    part(g, G.box(4, 5, 4), M().white, -28, 10.6, 3.5);
    for (let k = 0; k < 3; k++) part(g, G.box(0.9, 1.1, 0.06), M().windowDark, -29.2 + k * 1.2, 11, 5.52);
    keralaRoof(g, 5.2, 5.2, 2.2, 13.1, -28, 3.5, M().roof, { gables: false });
    for (let x = -32; x <= 32; x += 8) part(g, G.box(0.1, 2.2, 0.1), M().darkGrey, x, 9.4, 1.9);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 35, hd: 7 }];
    return baked;
  };

  // --------------------------------------------------------- tea hill
  // Munnar: tea bushes in contour rows, silver oak shade trees, a winding
  // path with tea pickers, and the estate's tea factory.
  Models.teaHill = function () {
    const g = new T.Group();
    const soil = KT.mat('teaHillSoil', { color: 0x5f8f3a, roughness: 0.95 });
    part(g, G.sph(22, 40, 20), soil, 0, -10, 0, 0, 0, 0, 1, 0.75, 1);
    const hy = (r) => Math.sqrt(Math.max(0, 22 * 22 - r * r)) * 0.75 - 10;
    const bush = Models.teaBush();
    const items = [];
    bush.updateMatrixWorld(true);
    for (let ring = 5; ring <= 19.5; ring += 1.6) {
      const n = Math.floor(ring * 2.6);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        if (Math.abs(Math.sin(a * 0.5 + ring * 0.15)) < 0.06) continue; // the winding path
        const x = Math.cos(a) * ring, z = Math.sin(a) * ring;
        bush.children.forEach((m) => items.push({ geometry: m.geometry, matrix: new T.Matrix4().makeTranslation(x, hy(ring) - 0.25, z).multiply(new T.Matrix4().makeScale(0.85, 0.85, 0.85)).multiply(m.matrix), material: m.material }));
      }
    }
    const merged = new T.Mesh(KT.mergeGeometries(items), items[0].material);
    merged.castShadow = merged.receiveShadow = true;
    // silver oaks
    const oak = KT.mat('silverOak', { color: 0x5c7f4a, roughness: 0.9 });
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.4, r = 6 + (i % 3) * 5;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = hy(r);
      part(g, G.cyl(0.18, 0.28, 9, 6), M().woodDark, x, y + 4.5, z);
      for (let k = 0; k < 3; k++) part(g, KT.blob(1.2, 1, 0.25, 30 + i * 3 + k), oak, x + (k - 1) * 0.6, y + 6 + k * 1.4, z, 0, 0, 0, 1, 1.4, 1);
    }
    // the tea factory at the foot of the hill (front)
    part(g, G.box(12, 5, 7), M().white, -27, 2.5, 8);
    keralaRoof(g, 13, 8, 2.4, 5, -27, 8, KT.mat('factoryRoof', { color: 0x8a3b24, roughness: 0.7 }), { gables: false });
    part(g, G.cyl(0.5, 0.6, 9, 10), KT.mat('factoryChimney', { color: 0x8a4a3a }), -22, 4.5, 6);
    for (let k = 0; k < 4; k++) part(g, G.box(1.2, 1.4, 0.06), M().windowDark, -31 + k * 2.6, 3, 11.53);
    const sign = canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#1f5a2e'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4ecd8'; c.font = 'bold 54px Georgia'; c.textAlign = 'center'; c.fillText('MUNNAR TEA ESTATE', w / 2, 62); c.font = '30px Georgia'; c.fillText('Est. 1880 • Tea Factory', w / 2, 106); });
    const sm = new T.Mesh(G.plane(9, 2.2), new T.MeshStandardMaterial({ map: sign, roughness: 0.7 }));
    sm.position.set(-27, 4.2, 11.56);
    const baked = KT.bake(g);
    baked.add(merged);
    baked.add(sm);
    // tea pickers with baskets
    const actors = [];
    [[4, 12], [-6, 10], [11, 5], [2, -14]].forEach(([x, z], i) => {
      const r = Math.hypot(x, z);
      const ch = person(actors, baked, { gender: 'female', outfit: i % 2 ? 'saree' : 'churidar', hair: 'bun', skin: [0xa8704c, 0x8d5a3b][i % 2] }, x, z, Math.atan2(x, z), 'idle');
      ch.position.y = hy(r) - 0.1;
      part(ch, G.cone(0.38, 0.7, 10), KT.mat('teaBasket', { color: 0xb08a4a, roughness: 0.9 }), 0, 1.25, -0.32, Math.PI);
    });
    baked.userData.actors = actors;
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 17 }, { type: 'box', x: -27, z: 8, hw: 6.2, hd: 3.6 }];
    return baked;
  };

  // ------------------------------------------- snake boat pavilion
  // The riverside pavilion where crowds watch the Aranmula boat race.
  Models.racePavilion = function () {
    const g = new T.Group();
    part(g, G.box(24, 1.2, 6), M().stoneGrey, 0, 0.6, 0);
    for (let r = 0; r < 4; r++) part(g, G.box(22, 0.4, 1.2), M().wood, 0, 1.4 + r * 0.45, -1.8 + r * 1.2);
    for (let i = 0; i < 7; i++) [-2.8, 2.8].forEach((z) => part(g, G.cyl(0.18, 0.2, 5, 8), M().woodDark, -10.5 + i * 3.5, 3.5, z));
    keralaRoof(g, 25, 7.4, 2.6, 6, 0, 0, M().roof);
    const cols = [0xd8203a, 0xf2c230, 0x2c5fa8, 0x2a9d8f, 0xe07a1f, 0xffffff];
    for (let i = 0; i < 12; i++) part(g, G.cone(0.35, 0.6, 3), KT.mat('bunting' + (i % 6), { color: cols[i % 6] }), -11 + i * 2, 5.6, 3.3, Math.PI, 0, 0);
    const baked = KT.bake(g);
    const actors = [];
    for (let i = 0; i < 7; i++) person(actors, baked, { gender: i % 2 ? 'female' : 'male', outfit: i % 2 ? 'saree' : 'mundu', lite: 'far' }, -9 + i * 3, -0.6 + (i % 3) * 1.2, Math.PI, i % 3 ? 'wave' : 'idle').position.y = 1.6 + (i % 3) * 0.45;
    baked.userData.actors = actors;
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 12, hd: 3 }];
    return baked;
  };

  Models.lampTower = function (h) {
    const g = new T.Group();
    lampTower(g, 0, 0, h || 5);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 0.8 }];
    return baked;
  };

  // ------------------------------------------------------ hill viewpoint
  // A grassy hilltop (Ponmudi, Vagamon, Chembra, Ranipuram): rocky knolls,
  // a winding path of steps to a watchtower, a flag and pine trees.
  Models.hillView = function () {
    const g = new T.Group();
    const grass = KT.mat('hillGrass', { color: 0x7fae4a, roughness: 0.95 });
    const rock = KT.mat('hillRock', { color: 0x8a8378, roughness: 0.95 });
    part(g, G.sph(18, 36, 18), grass, 0, -9, -2, 0, 0, 0, 1, 0.8, 1);
    const hy = (x, z) => Math.sqrt(Math.max(0, 18 * 18 - x * x - (z + 2) * (z + 2))) * 0.8 - 9;
    for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.5, r = 6 + (i % 3) * 3; part(g, KT.blob(1.6 + (i % 2), 1, 0.3, 140 + i), rock, Math.cos(a) * r, hy(Math.cos(a) * r, Math.sin(a) * r - 2) + 0.3, Math.sin(a) * r - 2); }
    // steps winding up from the front
    for (let i = 0; i < 24; i++) {
      const t = i / 23, a = Math.PI / 2 + t * 2.4, r = 14 - t * 11;
      const x = Math.cos(a) * r * -1, z = Math.sin(a) * r - 2;
      part(g, G.box(1.6, 0.25, 0.8), M().stoneGrey, x, hy(x, z) + 0.1, z, 0, -a, 0);
    }
    // the watchtower on top
    const top = hy(0, -2);
    [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(([x, z]) => part(g, G.box(0.25, 6, 0.25), M().woodDark, x, top + 3, z - 2));
    part(g, G.box(4, 0.25, 4), M().wood, 0, top + 6, -2);
    railing(g, -2, -4, 2, -4, top + 6.1, 1, M().woodDark);
    railing(g, -2, 0, 2, 0, top + 6.1, 1, M().woodDark);
    railing(g, -2, -4, -2, 0, top + 6.1, 1, M().woodDark);
    railing(g, 2, -4, 2, 0, top + 6.1, 1, M().woodDark);
    keralaRoof(g, 5, 5, 1.8, top + 8.3, 0, -2, M().roof, { gables: false });
    for (let i = 0; i < 6; i++) part(g, G.box(1, 0.2, 0.3), M().wood, 1.9, top + 0.5 + i, -0.4 - i * 0.55, 0.5, 0, 0);
    part(g, G.cyl(0.05, 0.05, 4, 6), M().white, 2.3, top + 10.5, -3.8);
    part(g, G.box(1.4, 0.8, 0.03), KT.mat('flagSaffron', { color: 0xf28c28 }), 3.0, top + 12.0, -3.8);
    // pines
    const pine = KT.mat('pine', { color: 0x2f5a34, roughness: 0.9 });
    for (let i = 0; i < 9; i++) {
      const a = i * 0.75 + 3.4, r = 10 + (i % 3) * 2.5;
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 2, y = hy(x, z);
      part(g, G.cyl(0.15, 0.22, 2, 6), M().woodDark, x, y + 1, z);
      for (let k = 0; k < 3; k++) part(g, G.cone(1.4 - k * 0.35, 2, 8), pine, x, y + 2.4 + k * 1.2, z);
    }
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'circle', x: 0, z: -2, r: 13 }];
    return baked;
  };

  // --------------------------------------------------------- spice garden
  // Pepper vines climbing their poles, cardamom clumps, a drying yard of
  // pepper and chillies on mats, and a spice shop.
  Models.spiceGarden = function () {
    const g = new T.Group();
    const vine = KT.mat('pepperVine', { color: 0x2f6b2a, roughness: 0.85 });
    const card = KT.mat('cardamom', { color: 0x4f8f3a, roughness: 0.9 });
    const rng = KT.makeRng(77);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
      const x = -12 + i * 6, z = -12 + j * 5;
      part(g, G.cyl(0.12, 0.15, 4.5, 6), M().woodDark, x, 2.25, z);
      for (let k = 0; k < 4; k++) part(g, KT.blob(0.55, 1, 0.3, i * 9 + j * 3 + k), vine, x + (rng() - 0.5) * 0.3, 0.8 + k * 1.0, z + (rng() - 0.5) * 0.3);
      if (k2(i, j)) part(g, G.sph(0.08, 6, 4), KT.mat('pepperRed', { color: 0xb3261e }), x + 0.3, 2.6, z + 0.3);
      // cardamom clump between the poles
      for (let k = 0; k < 6; k++) part(g, G.cone(0.18, 1.8, 4), card, x + 3 + Math.cos(k) * 0.4, 0.9, z + 2.5 + Math.sin(k) * 0.4, Math.cos(k) * 0.35, 0, Math.sin(k) * 0.35);
    }
    function k2(i, j) { return (i + j) % 2 === 0; }
    // drying yard with mats of black pepper, red chillies and turmeric
    [[0x1d1d1d, -7], [0xc4211b, -2], [0xe6a817, 3], [0x8a5a2a, 8]].forEach(([c, x], i) => {
      part(g, G.box(4, 0.04, 3), KT.mat('dryMat', { color: 0xc9b083, roughness: 0.95 }), x, 0.03, 12);
      part(g, G.box(3.6, 0.08, 2.6), KT.mat('spiceHeap' + i, { color: c, roughness: 0.9 }), x, 0.08, 12);
    });
    // shop
    part(g, G.box(8, 3, 4), M().plasterCream, 12, 1.5, 12);
    keralaRoof(g, 9, 5.2, 2, 3, 12, 12, M().roof, { gables: false });
    const sign = canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#5a2a12'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffe48a'; c.font = 'bold 52px Georgia'; c.textAlign = 'center'; c.fillText('KERALA SPICES', w / 2, 60); c.font = '28px Georgia'; c.fillText('Pepper • Cardamom • Cinnamon • Clove', w / 2, 104); });
    const sm = new T.Mesh(G.plane(7, 1.75), new T.MeshStandardMaterial({ map: sign, roughness: 0.7 }));
    sm.position.set(12, 2.2, 14.03);
    for (let i = 0; i < 4; i++) part(g, G.cyl(0.35, 0.3, 0.6, 10), KT.mat('spiceSack', { color: 0xb59a6a, roughness: 0.95 }), 9.5 + i * 1.6, 0.3, 14.8);
    const baked = KT.bake(g);
    baked.add(sm);
    baked.userData.colliders = [{ type: 'box', x: 12, z: 12, hw: 4.2, hd: 2.2 }];
    return baked;
  };

  // --------------------------------------------------- elephant shelter
  // Konni / Punnathur Kotta: an open thatched shelter with pillars, a
  // water trough and chains; the elephants are placed beside it.
  Models.elephantShelter = function () {
    const g = new T.Group();
    part(g, G.box(18, 0.3, 10), KT.mat('campFloor', { color: 0x8a6a4a, roughness: 0.95 }), 0, 0.15, 0);
    for (let i = 0; i < 5; i++) [-4.5, 4.5].forEach((z) => part(g, G.cyl(0.3, 0.35, 6, 8), M().woodDark, -8 + i * 4, 3, z));
    keralaRoof(g, 19, 11, 3.4, 6, 0, 0, M().thatch, { gables: false });
    part(g, G.box(5, 0.8, 1.4), M().stoneGrey, 0, 0.55, 6.5);
    part(g, G.box(4.6, 0.1, 1.0), KT.mat('troughWater', { color: 0x4f9fb0, roughness: 0.1 }), 0, 0.9, 6.5);
    for (let i = 0; i < 6; i++) part(g, G.box(1.2, 0.4, 0.6), KT.mat('palmFodder', { color: 0x6f9a3a }), -7 + i * 0.9, 0.5 + (i % 2) * 0.35, -3.6);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: -4.5, hw: 9, hd: 0.5 }, { type: 'box', x: 0, z: 6.5, hw: 2.6, hd: 0.8 }];
    return baked;
  };

  // ------------------------------------------------- ground cover
  // A thick grass clump with blades of different heights and shades.
  Models.grassClump = function () {
    const g = new T.Group();
    const geo = new T.ConeGeometry(0.035, 0.7, 3, 1, true);
    geo.translate(0, 0.35, 0);
    const mats = [KT.M.grassBlade, KT.mat('grassBladeLight', { color: 0x8fbf4a, roughness: 0.9, side: T.DoubleSide }), KT.mat('grassBladeDry', { color: 0xb8b060, roughness: 0.95, side: T.DoubleSide })];
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39996, r = 0.05 + (i % 5) * 0.045;
      part(g, geo, mats[i % 7 === 0 ? 2 : i % 2], Math.cos(a) * r, 0, Math.sin(a) * r, Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45, 1, 0.6 + ((i * 7) % 5) * 0.16, 1);
    }
    return KT.bake(g, { castShadow: false });
  };
  // A fern: arching fronds of paired leaflets.
  Models.fern = function () {
    const g = new T.Group();
    const leaf = KT.mat('fernLeaf', { color: 0x3f7a2e, roughness: 0.85, side: T.DoubleSide });
    const lg = new T.PlaneGeometry(0.16, 0.05);
    for (let f = 0; f < 7; f++) {
      const frond = new T.Group();
      frond.rotation.y = (f / 7) * Math.PI * 2;
      g.add(frond);
      for (let i = 0; i < 9; i++) {
        const t = i / 8, x = 0.06 + t * 0.62, y = 0.08 + Math.sin(t * 2.6) * 0.42 - t * t * 0.2;
        const sz = 1 - t * 0.7;
        [-1, 1].forEach((s) => part(frond, lg, leaf, x, y, s * 0.06 * sz, -Math.PI / 2 + 0.3, 0, s * 0.5, sz, 1, 1));
      }
      part(frond, G.box(0.66, 0.012, 0.012), leaf, 0.38, 0.32, 0, 0, 0, 0.35);
    }
    return KT.bake(g, { castShadow: false });
  };

  // ------------------------------------------------------- beach pier
  Models.pier = function (len) {
    len = len || 30;
    const g = new T.Group();
    part(g, G.box(3.2, 0.4, len), KT.mat('pierConcrete', { color: 0xb8b2a6, roughness: 0.9 }), 0, 2.2, -len / 2);
    for (let z = 0; z <= len; z += 4) [-1.3, 1.3].forEach((x) => part(g, G.cyl(0.25, 0.3, 3, 8), KT.mat('pierPile', { color: 0x6d675c }), x, 0.6, -z));
    railing(g, -1.5, 0, -1.5, -len, 2.4, 0.9, M().white);
    railing(g, 1.5, 0, 1.5, -len, 2.4, 0.9, M().white);
    for (let i = 0; i < 4; i++) part(g, G.box(3, 0.25, 0.8), M().stoneGrey, 0, 0.3 + i * 0.5, 1.6 - i * 0.5);
    return KT.bake(g);
  };

  // --------------------------------------------- birdwatch boardwalk
  Models.boardwalk = function (len) {
    len = len || 14;
    const g = new T.Group();
    part(g, G.box(2, 0.15, len), M().wood, 0, 0.9, 0);
    for (let z = -len / 2; z <= len / 2; z += 2) [-0.9, 0.9].forEach((x) => part(g, G.cyl(0.08, 0.08, 1.6, 6), M().woodDark, x, 0.4, z));
    railing(g, -1, -len / 2, -1, len / 2, 0.98, 0.9, M().woodDark);
    railing(g, 1, -len / 2, 1, len / 2, 0.98, 0.9, M().woodDark);
    return KT.bake(g);
  };
})();
