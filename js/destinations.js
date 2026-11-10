// Destinations: tourist sights that stand on their own roads, away from the
// district towns (Thiruvananthapuram first). Their places come from
// KT.Highway.sightList(); here they get level ground, lakes, info boards
// and their models, built when the player comes near.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part, Models = KT.Models;
  const D = KT.Dest = { items: [] };
  const HP = Math.PI / 2;

  // ---------------------------------------------------------- planning
  // Called once when the highway is built, before any terrain: flat pads
  // for the buildings and lakes for the water sights.
  D.prepare = function () {
    const Hw = KT.Highway;
    D.items = Hw.sightList().filter((sg) => sg.dest).map((sg) => {
      const R = sg.road, end = sg.def.place.stop === 'end';
      const f = R.frame(sg.s), side = sg.lat < 0 ? -1 : 1;
      // models face the road (or, at a road end, the way the visitor comes)
      const rot = end ? f.heading + Math.PI : f.heading + (side < 0 ? -HP : HP);
      // away from the road, in the world
      const out = end ? { x: f.fx, z: f.fz } : { x: f.rx * side, z: f.rz * side };
      return { sg, R, f, end, side, rot, out, y: R.y(Math.min(sg.s, R.len)) - 0.12, built: false, group: null, flows: [], anim: [] };
    });
    const pads = [], lakes = [];
    D.items.forEach((it) => {
      const sg = it.sg, k = sg.kind;
      if (k === 'mermaidBeach') return; // the beach itself
      if (k === 'lakeVillage') {
        // the backwater: a long river along the far side of the park, straight
        // by the promenade and winding beyond it (clear of the roads and the
        // beach), made of a chain of lake circles with walled banks
        const f = it.f, pts = [], D0 = 86, rw = 22;
        for (let t = -330; t <= 130; t += 12) {
          const m = D0 + 9 * Math.sin(t / 80) * KT.smoothstep(60, 140, Math.abs(t));
          pts.push({ x: sg.x + it.out.x * m + f.fx * t, z: sg.z + it.out.z * m + f.fz * t });
        }
        it.river = { pts, r: rw, y: it.y - 0.9 };
        pts.forEach((q) => lakes.push({ x: q.x, z: q.z, r: rw, y: it.river.y, edge: 5 }));
        // level, low banks on both sides (as on the backwaters)
        pts.forEach((q, i) => { if (i % 2 === 0) pads.push({ x: q.x, z: q.z, r: rw + 26, y: it.y - 0.1 }); });
        pads.push({ x: sg.x - it.out.x * 4, z: sg.z - it.out.z * 4, r: 66, y: it.y, paved: true });
      } else if (k === 'islandTemple') {
        it.lake = { x: sg.x, z: sg.z, r: 46, y: it.y - 1.3, island: { x: sg.x + it.out.x * 6, z: sg.z + it.out.z * 6, r: 15 } };
      } else if (k === 'reservoir') {
        it.lake = { x: sg.x + it.out.x * 46, z: sg.z + it.out.z * 46, r: 34, y: it.y - 0.8 };
        pads.push({ x: sg.x, z: sg.z, r: 18, y: it.y });
      } else if (k === 'waterfall') {
        pads.push({ x: sg.x - it.out.x * 10, z: sg.z - it.out.z * 10, r: 14, y: it.y });
      } else {
        // (the zoo compound is square: its corners need the extra room)
        pads.push({ x: sg.x, z: sg.z, r: sg.r + (k === 'zoo' ? 14 : 0), y: it.y + (k === 'hillPalace' ? 2.2 : 0), paved: k === 'zoo' });
      }
      if (it.lake) lakes.push(it.lake);
    });
    pads.forEach((p) => Hw.PADS.push(p));
    lakes.forEach((l) => Hw.LAKES.push(l));
  };

  // ---------------------------------------------------------- building
  function place(it, obj, dx, dz, rot, opts) {
    // dx along the road (towards rising s), dz away from it
    const Hw = KT.Highway, f = it.f;
    const ax = it.end ? -f.rx : f.fx, az = it.end ? -f.rz : f.fz;
    const x = it.sg.x + ax * dx + it.out.x * dz, z = it.sg.z + az * dx + it.out.z * dz;
    const r = it.rot + (rot || 0);
    obj.position.set(x, opts && opts.y !== undefined ? opts.y : Hw.groundY(x, z).y, z);
    obj.rotation.y = r;
    it.group.add(obj);
    if (!(opts && opts.colliders === false)) {
      (obj.userData.colliders || []).forEach((c) => {
        const cs = Math.cos(r), sn = Math.sin(r);
        const wx = x + c.x * cs + c.z * sn, wz = z - c.x * sn + c.z * cs;
        const lim = {};
        if (c.minY !== undefined) lim.minY = c.minY + obj.position.y;
        if (c.maxY !== undefined) lim.maxY = c.maxY + obj.position.y;
        if (c.type === 'circle') Hw.addCollider(Object.assign({ type: 'circle', x: wx, z: wz, r: c.r }, lim));
        else Hw.addCollider(Object.assign({ type: 'box', x: wx, z: wz, hw: c.hw, hd: c.hd, rot: r + (c.rot || 0) }, lim));
      });
    }
    return obj;
  }
  const mat = (name, color, rough) => KT.mat(name, { color, roughness: rough === undefined ? 0.8 : rough });
  function waterOf(it, lake) {
    const m = new T.Mesh(new T.CircleGeometry(lake.r + 6, 48), KT.Highway.waterMaterial());
    m.rotation.x = -HP;
    m.position.set(lake.x, lake.y, lake.z);
    it.group.add(m);
    return m;
  }
  function infoBoard(it) {
    const Hw = KT.Highway, sg = it.sg, R = it.R;
    const s = it.end ? R.len - 12 : sg.s - 14, lat = it.end ? -8.5 : it.side * 8.5;
    const q = R.at(s, lat), f = R.frame(s);
    const board = Models.signboard([sg.name.length > 22 ? sg.name.split(' ').slice(0, 3).join(' ') : sg.name, sg.district.name]);
    board.position.set(q.x, Hw.groundY(q.x, q.z).y, q.z);
    board.rotation.y = f.heading + (lat < 0 ? -HP : HP);
    it.group.add(board);
    Hw.interactables.push({ label: 'About ' + sg.name, radius: 3, pos: () => board.position, action: () => KT.Game.readSight(sg) });
    Hw.addCollider({ type: 'circle', x: q.x, z: q.z, r: 0.5 });
  }

  // a few custom models -------------------------------------------------
  function secretariat() {
    const g = new T.Group();
    const white = mat('secWhite', 0xf2eee3, 0.7), grey = mat('secGrey', 0x8d8a83), dark = mat('secWin', 0x2f3a44, 0.4);
    part(g, G.box(54, 10, 12), white, 0, 5, 0);
    part(g, G.box(55, 0.8, 13), grey, 0, 10.4, 0);
    for (let x = -25; x <= 25; x += 2.6) {
      if (Math.abs(x) < 7.5) continue;
      part(g, G.cyl(0.38, 0.42, 8.6, 10), white, x, 4.9, 6.6);
      part(g, G.box(1.1, 2.6, 0.1), dark, x + 1.3, 6.3, 6.02);
      part(g, G.box(1.1, 2.6, 0.1), dark, x + 1.3, 2.4, 6.02);
    }
    // the central portico, pediment and dome
    part(g, G.box(15, 12.5, 7), white, 0, 6.25, 6.5);
    for (let x = -6; x <= 6; x += 2.4) part(g, G.cyl(0.55, 0.6, 10.5, 12), white, x, 5.25, 10.2);
    const ped = part(g, G.cyl(0.01, 8.2, 3.2, 3), white, 0, 14.1, 10.1, 0, 0, 0);
    ped.rotation.set(-HP, 0, 0); ped.scale.set(1, 0.18, 1);
    part(g, G.box(16, 0.7, 7.6), grey, 0, 12.6, 6.6);
    part(g, G.cyl(4.6, 4.8, 3.2, 24), white, 0, 12.8, 0);
    const dome = part(g, new T.SphereGeometry(4.6, 24, 12, 0, Math.PI * 2, 0, HP), mat('secDome', 0xd9d4c7, 0.6), 0, 14.4, 0);
    void dome;
    part(g, G.cyl(0.25, 0.25, 2.2, 8), grey, 0, 19.8, 0);
    part(g, G.box(3, 4.2, 0.12), dark, 0, 2.1, 10.05);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 27, hd: 6.2 }, { type: 'box', x: 0, z: 7.5, hw: 7.6, hd: 3.4 }];
    return g;
  }
  function fortGate() {
    const g = new T.Group();
    const lat = mat('lateriteWall', 0xb0623e, 0.95), roof = mat('fortRoof', 0x8e3b24, 0.7), dark = mat('gateDark', 0x2a1d16, 0.9);
    [-6.5, 6.5].forEach((x) => part(g, G.box(5.5, 9, 6.5), lat, x, 4.5, 0));
    part(g, G.box(8, 3.2, 6.5), lat, 0, 7.4, 0);
    part(g, G.box(7.6, 5.8, 0.4), dark, 0, 2.9, 3.0);
    [-1, 1].forEach((sd) => part(g, G.box(16, 6.5, 2.4), lat, sd * 17.2, 3.25, -0.5));
    // Kerala-style tiled roof over the gateway
    const r1 = part(g, G.box(11, 0.4, 5.2), roof, 0, 10.6, 1.7); r1.rotation.x = -0.55;
    const r2 = part(g, G.box(11, 0.4, 5.2), roof, 0, 10.6, -1.7); r2.rotation.x = 0.55;
    part(g, G.box(10, 0.9, 0.9), roof, 0, 11.9, 0);
    for (let x = -24; x <= 24; x += 3) if (Math.abs(x) > 10) part(g, G.box(1.2, 1, 2.4), lat, x, 7, -0.5);
    g.userData.colliders = [{ type: 'box', x: -6.5, z: 0, hw: 2.8, hd: 3.3 }, { type: 'box', x: 6.5, z: 0, hw: 2.8, hd: 3.3 },
      { type: 'box', x: -17.2, z: -0.5, hw: 8, hd: 1.2 }, { type: 'box', x: 17.2, z: -0.5, hw: 8, hd: 1.2 }];
    return g;
  }
  function clockFace() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#f7f1df'; x.beginPath(); x.arc(128, 128, 124, 0, Math.PI * 2); x.fill();
    x.lineWidth = 10; x.strokeStyle = '#3b2a1a'; x.stroke();
    x.fillStyle = '#3b2a1a'; x.font = 'bold 30px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((t, i) => {
      const a = (i / 12) * Math.PI * 2;
      x.fillText(t, 128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92);
    });
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    return tex;
  }
  function meshanFace() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#d9a36b'; x.beginPath(); x.arc(64, 60, 50, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2b1c12';
    x.beginPath(); x.arc(44, 48, 6, 0, Math.PI * 2); x.arc(84, 48, 6, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#4a3322'; x.beginPath(); x.moveTo(24, 70); x.quadraticCurveTo(64, 128, 104, 70); x.quadraticCurveTo(64, 92, 24, 70); x.fill();
    x.fillRect(40, 30, 16, 5); x.fillRect(72, 30, 16, 5);
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    return tex;
  }
  function clockTower(it) {
    const g = new T.Group();
    const cream = mat('clockCream', 0xefe3c8, 0.8), roof = mat('fortRoof', 0x8e3b24, 0.7), brass = KT.mat('brass', { color: 0x6b4a1f, roughness: 0.4, metalness: 0.5 });
    part(g, G.box(5, 12, 5), cream, 0, 6, 0);
    part(g, G.box(5.6, 0.5, 5.6), roof, 0, 12.2, 0);
    part(g, G.box(4.6, 4.4, 4.6), cream, 0, 14.6, 0);
    const pyr = part(g, G.cone(4.2, 3.6, 4), roof, 0, 18.6, 0); pyr.rotation.y = Math.PI / 4;
    part(g, G.cyl(0.12, 0.12, 1.4, 6), brass, 0, 21, 0);
    const faceM = new T.MeshStandardMaterial({ map: clockFace(), roughness: 0.6 });
    const hands = [];
    for (let k = 0; k < 4; k++) {
      const a = k * HP, sx = Math.sin(a), cz = Math.cos(a);
      const face = new T.Mesh(new T.CircleGeometry(1.7, 32), faceM);
      face.position.set(sx * 2.33, 14.6, cz * 2.33); face.rotation.y = a;
      g.add(face);
      const hub = new T.Group(); hub.position.set(sx * 2.4, 14.6, cz * 2.4); hub.rotation.y = a; g.add(hub);
      const hr = new T.Group(), mn = new T.Group();
      part(hr, G.box(0.16, 0.9, 0.05), brass, 0, 0.45, 0); part(mn, G.box(0.1, 1.35, 0.05), brass, 0, 0.67, 0.03);
      hub.add(hr); hub.add(mn);
      hands.push({ hr, mn });
    }
    // Meshan: a bearded face under the clock, with two rams to butt his cheeks
    const fm = new T.MeshStandardMaterial({ map: meshanFace(), roughness: 0.7 });
    const face = new T.Mesh(new T.CircleGeometry(1.15, 24), fm);
    face.position.set(0, 10.2, 2.52); g.add(face);
    const jaw = new T.Group(); jaw.position.set(0, 9.45, 2.56); g.add(jaw);
    part(jaw, G.box(1.2, 0.3, 0.08), mat('meshanJaw', 0x4a3322), 0, -0.15, 0);
    const rams = [-1, 1].map((sd) => {
      const r = new T.Group(); r.position.set(sd * 1.85, 10.1, 2.7); g.add(r);
      const wool = mat('ramWool', 0xf1ece0, 0.95);
      part(r, G.box(0.9, 0.55, 0.5), wool, 0, 0, 0);
      part(r, G.box(0.35, 0.35, 0.4), wool, -sd * 0.55, 0.12, 0);
      part(r, G.cyl(0.12, 0.05, 0.4, 6), brass, -sd * 0.6, 0.35, 0.14, HP);
      return { r, sd };
    });
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 2.6, hd: 2.6 }];
    it.anim.push((t) => {
      // the hands show the real time; on the hour-minute Meshan's mouth moves
      const now = new Date(), h = now.getHours() % 12, m = now.getMinutes() + now.getSeconds() / 60;
      hands.forEach((hd) => { hd.hr.rotation.z = -((h + m / 60) / 12) * Math.PI * 2; hd.mn.rotation.z = -(m / 60) * Math.PI * 2; });
      const strike = now.getSeconds() < 12 ? Math.abs(Math.sin(t * 6)) : 0;
      jaw.position.y = 9.45 - strike * 0.25;
      rams.forEach(({ r, sd }) => { r.position.x = sd * (1.85 - strike * 0.45); });
    });
    return g;
  }
  function mermaid() {
    // the Jalakanyaka: a huge reclining mermaid in pale concrete
    const g = new T.Group();
    const c = mat('mermaidConcrete', 0xbdb6a8, 0.95);
    const ell = (rx, ry, rz, x, y, z, rotZ) => { const m = part(g, new T.SphereGeometry(1, 20, 14), c, x, y, z); m.scale.set(rx, ry, rz); if (rotZ) m.rotation.z = rotZ; return m; };
    ell(4.2, 1.6, 2.4, 0, 1.4, 0);           // body
    ell(2.6, 1.3, 2.0, -3.8, 2.2, 0.2, 0.5);  // chest, raised
    ell(1.2, 1.35, 1.2, -6.2, 4.0, 0.3);      // head
    ell(1.6, 0.6, 2.2, -7.2, 4.6, -0.6, 0.4); // flowing hair
    ell(3.4, 1.0, 1.4, 4.8, 0.9, 0.4, -0.15); // tail
    ell(1.8, 0.35, 1.5, 8.6, 0.6, 0.6, 0.3);  // tail fin
    ell(2.4, 0.5, 0.6, -2.4, 1.0, 2.2, -0.4); // arm
    part(g, G.box(20, 0.5, 8), mat('mermaidBase', 0x9c9488, 0.95), 0, 0.2, 0);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 10, hd: 3.8 }];
    return g;
  }
  // ------------------------------------------------- Thiruvananthapuram Zoo
  // The red-brick gate with its pointed arch, banded pillars and gabled
  // roof; a walled compound with paths, lawns and trees; and enclosures for
  // tigers, black bears, zebras, an elephant and spotted deer.
  const ZOO = 56; // half the compound's width (model space; +z faces the road)
  function archShape(w, h, spring) {
    // a pointed (Gothic) arch, w wide, h to its point, straight up to spring
    const s = new T.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(-w / 2, spring);
    s.quadraticCurveTo(-w / 2, h - (h - spring) * 0.15, 0, h);
    s.quadraticCurveTo(w / 2, h - (h - spring) * 0.15, w / 2, spring);
    s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
    return s;
  }
  function wallWithArch(g, mat, x, z, w, h, depth, aw, ah, aspring) {
    const s = new T.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
    s.holes.push(new T.Path(archShape(aw, ah, aspring).getPoints(16)));
    const geo = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 16 });
    geo.translate(0, 0, -depth / 2);
    const m = new T.Mesh(geo, mat);
    m.position.set(x, 0, z);
    g.add(m);
    // a cream band round the arch
    const ring = new T.Shape(archShape(aw + 0.5, ah + 0.3, aspring).getPoints(16));
    ring.holes.push(new T.Path(archShape(aw, ah, aspring).getPoints(16)));
    const rg = new T.ExtrudeGeometry(ring, { depth: depth + 0.08, bevelEnabled: false });
    rg.translate(0, 0, -(depth + 0.08) / 2);
    const rm = new T.Mesh(rg, mat.userData.band || mat);
    rm.position.set(x, 0, z);
    g.add(rm);
  }
  function zooGate() {
    const g = new T.Group();
    const brick = mat('zooBrick', 0xb24a32, 0.9), cream = mat('zooCream', 0xf0e0c0, 0.8), dark = mat('zooBrickDark', 0x7e2c1e, 0.9);
    const tile = mat('zooTile', 0x9c4a2c, 0.75), trim = mat('zooTrim', 0x6b8072, 0.7), iron = mat('zooIron', 0x2f6b4a, 0.5);
    brick.userData.band = cream;
    // the main arch between two banded pillars
    wallWithArch(g, brick, 0, 0, 6.4, 7.4, 1.6, 4.2, 5.6, 3.4);
    [-1, 1].forEach((sd) => {
      const x = sd * 4.0;
      part(g, G.box(1.7, 8.2, 1.9), brick, x, 4.1, 0);
      for (let y = 0.9; y < 8; y += 1.15) part(g, G.box(1.74, 0.14, 1.94), cream, x, y, 0);
      for (let y = 1.45; y < 7.5; y += 1.15) [-0.4, 0.4].forEach((dx) => part(g, G.box(0.22, 0.22, 1.96), dark, x + dx, y, 0, 0, 0, Math.PI / 4));
      // the side wings with smaller arches and their own tiled roofs
      wallWithArch(g, brick, sd * 7.9, 0.1, 6, 4.3, 1.3, 2.6, 3.2, 2.0);
      for (let y = 1.1; y < 4.2; y += 1.0) part(g, G.box(6, 0.12, 1.36), cream, sd * 7.9, y, 0.1);
      [-1, 1].forEach((e) => part(g, G.box(3.5, 0.16, 2.6), tile, sd * 7.9 + e * 1.5, 4.85, 0.1, 0, 0, -e * 0.45));
      part(g, G.box(6.4, 0.2, 2.2), cream, sd * 7.9, 4.35, 0.1);
    });
    // a cream cornice, the name plaque and the gable over the arch
    part(g, G.box(9.8, 0.35, 2.3), cream, 0, 7.55, 0);
    const tex = KT.textTexture([{ text: 'THIRUVANANTHAPURAM ZOO', size: 40 }, { text: 'Since 1857', size: 30 }], { width: 768, height: 160, bg: '#2f6b4a', color: '#fdf6e0', borderColor: '#f0e0c0' });
    const plaque = new T.Mesh(G.box(4.2, 0.9, 0.08), [cream, cream, cream, cream, new T.MeshStandardMaterial({ map: tex, roughness: 0.6 }), cream]);
    plaque.position.set(0, 6.55, 0.84);
    plaque.userData.noBake = true;
    g.add(plaque);
    const gable = new T.Shape();
    gable.moveTo(-4.6, 0); gable.lineTo(4.6, 0); gable.lineTo(0, 2.6); gable.lineTo(-4.6, 0);
    const gg = new T.ExtrudeGeometry(gable, { depth: 0.3, bevelEnabled: false });
    const gm = new T.Mesh(gg, brick); gm.position.set(0, 7.7, 0.7); g.add(gm);
    [-1, 1].forEach((sd) => {
      part(g, G.box(5.6, 0.2, 3.4), tile, sd * 2.3, 9.0, -0.2, 0, 0, -sd * 0.52);         // roof slopes
      part(g, G.box(5.4, 0.32, 0.12), trim, sd * 2.3, 8.95, 1.1, 0, 0, -sd * 0.52);       // carved barge boards
      for (let k = 0; k < 6; k++) part(g, G.cone(0.09, 0.28, 4), trim, sd * (0.5 + k * 0.72), 9.85 - k * 0.42, 1.12, Math.PI);
    });
    part(g, G.cone(0.14, 0.9, 6), trim, 0, 10.75, 1.05);                                   // finial
    // the green iron gates, swung open
    [-1, 1].forEach((sd) => {
      const leaf = new T.Group();
      leaf.position.set(sd * 2.1, 0, -0.9);
      leaf.rotation.y = sd * 1.25;
      for (let x = 0.1; x < 2.0; x += 0.16) part(leaf, G.box(0.04, 1.9, 0.04), iron, -sd * x, 0.95, 0);
      [0.15, 1.85].forEach((y) => part(leaf, G.box(2.0, 0.07, 0.06), iron, -sd * 1.0, y, 0));
      g.add(leaf);
    });
    const baked = KT.bake(g);
    baked.userData.colliders = [-1, 1].map((sd) => ({ type: 'box', x: sd * 7.0, z: 0, hw: 3.9, hd: 1.0 }));
    return baked;
  }

  // a low brick wall topped with green railings, from (x0, z0) to (x1, z1)
  function railing(g, x0, z0, x1, z1, mats) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0) + HP;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    part(g, G.box(len, 0.7, 0.4), mats.brick, cx, 0.35, cz, 0, ang, 0);
    part(g, G.box(len, 0.08, 0.46), mats.cream, cx, 0.72, cz, 0, ang, 0);
    part(g, G.box(len, 0.06, 0.06), mats.iron, cx, 1.85, cz, 0, ang, 0);
    for (let d = 0.2; d < len; d += 0.32) part(g, G.box(0.04, 1.15, 0.04), mats.iron, x0 + ux * d, 1.3, z0 + uz * d);
    for (let d = 0; d <= len + 0.01; d += 3.2) part(g, G.box(0.36, 1.25, 0.36), mats.brick, x0 + ux * d, 0.62, z0 + uz * d);
  }
  function groundPatch(g, mat, x0, z0, x1, z1, y) {
    const m = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), mat);
    m.rotation.x = -HP;
    m.position.set((x0 + x1) / 2, y || 0.03, (z0 + z1) / 2);
    m.receiveShadow = true;
    g.add(m);
  }
  // an animal walking a loop of points (model space), pausing at each
  function patrol(it, root, obj, pts, speed, pause, off) {
    root.add(obj);
    const legs = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return { p, q, d: Math.hypot(q[0] - p[0], q[1] - p[1]) / speed }; });
    const T0 = legs.reduce((a, l) => a + l.d + pause, 0);
    let face = 0;
    it.anim.push((t) => {
      let u = (t + off) % T0;
      for (let i = 0; i < legs.length; i++) {
        const L = legs[i];
        if (u < L.d) {
          const k = u / L.d;
          obj.position.set(L.p[0] + (L.q[0] - L.p[0]) * k, 0, L.p[1] + (L.q[1] - L.p[1]) * k);
          face = Math.atan2(L.q[0] - L.p[0], L.q[1] - L.p[1]);
          obj.rotation.y = face;
          if (obj.userData.animate) obj.userData.animate(t, true, speed * 4);
          return;
        }
        u -= L.d;
        if (u < pause) {
          obj.position.set(L.q[0], 0, L.q[1]);
          if (obj.userData.animate) obj.userData.animate(t, false);
          return;
        }
        u -= pause;
      }
    });
  }
  // landscape pieces for the enclosures (all in the zoo's model space)
  function mound(g, m, x, z, rx, rz, h) {
    const o = new T.Mesh(new T.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, HP), m);
    o.scale.set(rx, h, rz); o.position.set(x, 0, z);
    o.receiveShadow = true;
    g.add(o);
  }
  function rockBlob(g, x, y, z, sx, sy, sz, seed, moss) {
    part(g, KT.blob(1, 2, 0.22, seed), moss ? KT.M.rockMoss : KT.M.rock, x, y, z, 0, seed, 0, sx, sy, sz);
  }
  // a rock den: a back wall, two shoulders and a roof slab round a dark
  // hollow, with a flat ledge in front
  function cave(g, x, z, rot, k) {
    const c = new T.Group();
    rockBlob(c, 0, 1.6 * k, -2.2 * k, 4.4 * k, 2.6 * k, 1.8 * k, 3);
    rockBlob(c, -3.4 * k, 1.2 * k, -0.4 * k, 1.6 * k, 2.0 * k, 2.4 * k, 5, true);
    rockBlob(c, 3.4 * k, 1.2 * k, -0.4 * k, 1.6 * k, 2.0 * k, 2.4 * k, 7);
    rockBlob(c, 0, 3.2 * k, -0.6 * k, 4.4 * k, 0.9 * k, 2.6 * k, 9, true);
    part(c, new T.SphereGeometry(2.3 * k, 16, 8, 0, Math.PI, 0, HP), mat('caveDark', 0x1f1a16, 1), 0, 0, -0.6 * k, 0, Math.PI, 0, 1, 1.05, 0.9);
    part(c, G.cyl(3.2 * k, 3.4 * k, 0.35, 16), KT.M.rock, 0, 0.17, 1.4 * k, 0, 0, 0, 1, 1, 0.55);
    c.position.set(x, 0, z); c.rotation.y = rot;
    g.add(c);
  }
  function pond(g, x, z, rx, rz) {
    const w = new T.Mesh(new T.CircleGeometry(1, 28), KT.Highway.waterMaterial());
    w.rotation.x = -HP; w.scale.set(rx, rz, 1); w.position.set(x, 0.13, z);
    g.add(w);
    const n = Math.round((rx + rz) * 1.6);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      rockBlob(g, x + Math.cos(a) * (rx + 0.3), 0.15, z + Math.sin(a) * (rz + 0.3), 0.55, 0.3, 0.45, 20 + i, i % 3 === 0);
    }
  }
  function reeds(g, x, z, n, seed) {
    const rng = KT.makeRng(seed);
    const green = mat('reed', 0x5f8a3a, 0.9), brown = mat('reedHead', 0x6b4a2a, 0.9);
    for (let i = 0; i < n; i++) {
      const px = x + (rng() - 0.5) * 3, pz = z + (rng() - 0.5) * 3, h = 1 + rng() * 0.8;
      part(g, G.cyl(0.02, 0.03, h, 4), green, px, h / 2, pz, (rng() - 0.5) * 0.3, 0, (rng() - 0.5) * 0.3);
      if (rng() < 0.5) part(g, G.cyl(0.05, 0.05, 0.25, 5), brown, px, h - 0.05, pz);
    }
  }
  function bamboo(g, x, z, seed) {
    const rng = KT.makeRng(seed), cane = mat('bamboo', 0x7fa040, 0.6), leaf = mat('bambooLeaf', 0x4f8a2e, 0.9);
    for (let i = 0; i < 9; i++) {
      const a = rng() * 6.28, r = rng() * 0.9, h = 5 + rng() * 3, lean = (rng() - 0.5) * 0.25;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      part(g, G.cyl(0.06, 0.08, h, 6), cane, px, h / 2, pz, lean, 0, lean);
      part(g, G.sph(0.9, 7, 5), leaf, px + lean * h * 0.5, h, pz - lean * h * 0.5, 0, 0, 0, 1, 0.5, 1);
    }
  }
  // poles, logs, ropes and platforms for the apes to climb
  function climbingFrame(g, x, z) {
    const wood = KT.M.bark, rope = mat('rope', 0xb59a6a, 1), plank = mat('plank', 0x8a6a48, 0.9);
    const P = [[-4, -3, 6], [4, -3, 6.5], [-4, 3, 5], [4, 3, 5.5], [0, 0, 8]];
    P.forEach(([px, pz, h]) => part(g, G.cyl(0.22, 0.28, h, 8), wood, x + px, h / 2, z + pz));
    [[0, 1, 4.2], [2, 3, 3.6], [0, 2, 3.2], [1, 3, 4.6]].forEach(([a, b, y]) => {
      const A = P[a], B = P[b], len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      part(g, G.cyl(0.16, 0.16, len, 7), wood, x + (A[0] + B[0]) / 2, y, z + (A[1] + B[1]) / 2, HP, Math.atan2(B[0] - A[0], B[1] - A[1]), 0);
    });
    [0, 1, 2, 3].forEach((i) => {
      const A = P[i], B = P[4], len = Math.hypot(B[0] - A[0], B[1] - A[1], 2);
      part(g, G.cyl(0.03, 0.03, len, 4), rope, x + (A[0] + B[0]) / 2, 5.8, z + (A[1] + B[1]) / 2, HP - 0.25, Math.atan2(B[0] - A[0], B[1] - A[1]), 0);
    });
    part(g, G.box(2.4, 0.15, 2.4), plank, x + 4, 4.0, z - 3);
    part(g, G.box(2.2, 0.15, 2.2), plank, x - 4, 3.0, z + 3);
    part(g, G.cyl(1.4, 1.4, 0.15, 12), plank, x, 6.4, z);
  }

  // Visitors: families, couples and school children walk in at the gate,
  // stop at a few enclosures to watch (waving, pointing), and walk out
  // again. Each follows the paths: the main path (x = 0) and the two cross
  // paths (z = +-20).
  const VIEW = {
    zebra: [-39, 22.4, 0], stork: [-15, 22.4, 0], elephant: [30, 22.4, 0],
    lion: [-41, 17.6, Math.PI], leopard: [-17, 17.6, Math.PI], orangutan: [18, 17.6, Math.PI], macaque: [42, 17.6, Math.PI],
    tiger: [-30, -22.4, Math.PI], bear: [18, -22.4, Math.PI], deer: [42, -22.4, Math.PI]
  };
  const VISIT_LOOKS = [['male', 'casual'], ['female', 'saree'], ['male', 'tee'], ['female', 'churidar'], ['male', 'mundu'], ['female', 'casual'], ['male', 'hiking'], ['female', 'hiking']];
  function zooVisitors(it, parent) {
    const rng = KT.makeRng(1857);
    const line = (p) => (p[1] > 0 ? 20 : -20);
    // from one stop to the next along the paths (with a little sideways offset)
    function legsBetween(a, b, off) {
      const out = [];
      const la = a.gate ? null : line(a), lb = b.gate ? null : line(b);
      out.push([a[0], la === null ? a[1] : la + off]);
      if (la !== null && la !== lb) out.push([off, la + off]);
      if (la === null || la !== lb) {
        if (lb !== null) out.push([off, lb + off]);
      }
      out.push([b[0], lb === null ? b[1] : lb + off]);
      return out;
    }
    const groups = [
      { people: 3, kids: 1, stops: ['elephant', 'zebra', 'stork', 'lion', 'tiger'] },
      { people: 2, kids: 0, stops: ['tiger', 'bear', 'deer'] },
      { people: 4, kids: 2, stops: ['orangutan', 'macaque', 'elephant'] },
      { people: 1, kids: 0, stops: ['leopard', 'lion', 'zebra'] },
      { people: 2, kids: 1, stops: ['deer', 'bear', 'orangutan'] },
      { people: 5, kids: 4, stops: ['lion', 'leopard', 'tiger', 'stork'] }, // a school group
      { people: 2, kids: 0, stops: ['stork', 'elephant', 'macaque'] },
      { people: 1, kids: 0, stops: ['bear', 'tiger'] }
    ];
    const gate = Object.assign([0, ZOO - 3], { gate: true });
    let n = 0;
    groups.forEach((G0, gi) => {
      // the group's walk: gate -> each stop -> gate, then round again
      const pts = [], speed = 1.0 + rng() * 0.25, stops = [gate].concat(G0.stops.map((k) => VIEW[k]), [gate]);
      const plan = [];
      for (let i = 0; i < stops.length - 1; i++) {
        legsBetween(stops[i], stops[i + 1], (rng() - 0.5) * 1.6).forEach((p, j) => { if (!pts.length || Math.hypot(p[0] - pts[pts.length - 1][0], p[1] - pts[pts.length - 1][1]) > 0.05) pts.push(p); });
        plan.push({ at: pts.length - 1, face: stops[i + 1].gate ? null : stops[i + 1][2], wait: stops[i + 1].gate ? 6 + rng() * 10 : 9 + rng() * 9 });
      }
      // timeline: walk each leg, wait at the stops
      const tl = [];
      let T0 = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / speed;
        tl.push({ a: pts[i], b: pts[i + 1], t0: T0, t1: T0 + d });
        T0 += d;
        const st = plan.find((p) => p.at === i + 1);
        if (st) { tl.push({ a: pts[i + 1], b: pts[i + 1], t0: T0, t1: T0 + st.wait, face: st.face, stop: true }); T0 += st.wait; }
      }
      const start = rng() * T0;
      for (let k = 0; k < G0.people; k++) {
        const kid = k >= G0.people - G0.kids && k > 0 || (G0.kids >= 4 && k > 0);
        const look = VISIT_LOOKS[(n * 3 + gi) % VISIT_LOOKS.length], female = look[0] === 'female';
        const ch = Models.character({
          gender: look[0], outfit: kid ? (G0.kids >= 4 ? 'tee' : 'casual') : look[1], lite: true,
          hair: female ? ['default', 'braid', 'bun', 'loose', 'curly'][n % 5] : ['default', 'short', 'wavy', 'curly'][n % 4],
          skin: [0xd9a27c, 0xc08660, 0xa8704c, 0x8d5a3b][n % 4], beard: !female && !kid && n % 3 === 0,
          colors: kid && G0.kids >= 4 ? { top: 0xf4f4f0, bottom: 0x1f3a6b } : undefined,
          acc: { backpack: kid || rng() < 0.3, hat: rng() < 0.3, sunglasses: !kid && rng() < 0.4, camera: !kid && rng() < 0.35 },
          scale: kid ? 0.66 + rng() * 0.08 : 0.92 + rng() * 0.1, seed: 300 + n
        });
        parent.add(ch);
        n++;
        // each member walks a step or two behind or beside the others
        const side = ((k % 3) - 1) * 0.8, behind = Math.floor(k / 3) * 1.2 + (k % 2) * 0.4;
        const lag = behind / speed, gesture = ['idle', 'wave', 'idle', 'namaskaram'][(k + gi) % 4];
        let last = null;
        it.anim.push((t) => {
          const dt = last === null ? 0 : Math.min(0.1, Math.max(0, t - last));
          last = t;
          const u = (t + start - lag + T0 * 4) % T0;
          let L = tl[tl.length - 1];
          for (let i = 0; i < tl.length; i++) if (u < tl[i].t1) { L = tl[i]; break; }
          const k2 = L.t1 > L.t0 ? (u - L.t0) / (L.t1 - L.t0) : 0;
          const x = L.a[0] + (L.b[0] - L.a[0]) * k2, z = L.a[1] + (L.b[1] - L.a[1]) * k2;
          const dx = L.b[0] - L.a[0], dz = L.b[1] - L.a[1], len = Math.hypot(dx, dz) || 1;
          // step sideways from the line of walk
          ch.position.set(x + (dz / len) * side, 0, z - (dx / len) * side);
          if (L.stop) {
            // spread along the railing, facing the animals
            if (L.face !== null && L.face !== undefined) {
              ch.position.set(L.a[0] + (k - (G0.people - 1) / 2) * 1.1, 0, L.a[1] + (L.face ? -1 : 1) * (1.4 + (k % 2) * 0.6));
              ch.rotation.y = KT.angleLerp(ch.rotation.y, L.face, Math.min(1, dt * 4));
            }
            const late = u - L.t0;
            KT.Models.animateCharacter(ch, late > 2 && late < 4.5 && !kid ? gesture : late > 3 && kid ? 'wave' : 'idle', dt, 1);
          } else {
            ch.rotation.y = KT.angleLerp(ch.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
            KT.Models.animateCharacter(ch, 'walk', dt, speed / 1.1);
          }
        });
      }
    });
  }

  // People resting on the benches: a couple or one on their own, looking
  // about, now and then turning to each other
  function benchSitters(it, parent, benches) {
    const rng = KT.makeRng(611);
    let n = 0;
    benches.forEach(([bx, bz, br], bi) => {
      if (bi % 5 === 4) return; // a few benches stay free for the player
      const two = rng() < 0.6;
      [-0.42, 0.42].slice(0, two ? 2 : 1).forEach((off, k) => {
        const o = two ? off : (rng() - 0.5) * 0.5;
        const look = VISIT_LOOKS[(n * 5 + 3) % VISIT_LOOKS.length], female = look[0] === 'female';
        const old = rng() < 0.25;
        const ch = Models.character({
          gender: look[0], outfit: look[1], lite: true,
          hair: female ? ['bun', 'braid', 'default', 'loose'][n % 4] : ['short', 'default', 'wavy'][n % 3],
          hairColor: old ? 0xb4b2ac : 0x24170f, skin: [0xc08660, 0xd9a27c, 0x8d5a3b, 0xa8704c][n % 4],
          beard: !female && old, glasses: old || rng() < 0.2, mustache: !female && rng() < 0.5,
          acc: { backpack: false, hat: rng() < 0.2, sunglasses: !old && rng() < 0.3, camera: false },
          carry: rng() < 0.3 ? 'phone' : null, scale: 0.92 + rng() * 0.08, seed: 700 + n
        });
        // on the seat (the bench faces its local +z; the seat is just in front of the back rest)
        const c = Math.cos(br), sn = Math.sin(br), lx = o, lz = 0.06;
        ch.position.set(bx + lx * c + lz * sn, 0.0, bz - lx * sn + lz * c);
        ch.rotation.y = br;
        parent.add(ch);
        const turn = two ? (k ? 0.5 : -0.5) : 0, ph = rng() * 10;
        let last = null;
        it.anim.push((t) => {
          const dt = last === null ? 0 : Math.min(0.1, Math.max(0, t - last));
          last = t;
          KT.Models.animateCharacter(ch, 'sit', dt, 1);
          // look about, and now and then at the person beside
          const head = ch.userData.rig && ch.userData.rig.head;
          if (head) head.rotation.y = Math.sin((t + ph) * 0.25) > 0.6 ? turn : Math.sin((t + ph) * 0.4) * 0.5;
        });
        n++;
      });
    });
  }

  // ------------------------------------------------- Akkulam Tourist Village
  // A walled park on the backwater: a brick-arch gate, lawns with crotons, a
  // children's play tower with slides, the glass bridge with its draped
  // canopy, a boat jetty, and a red-paved promenade along the river under
  // rain trees, with posts and pipe rails, lamps and benches. Model space:
  // +z towards the road, the river beyond z = -59.
  function brickArch(w, h) {
    const g = new T.Group();
    const brick = mat('akkBrick', 0xa8452e, 0.95), cap = mat('akkCap', 0xe8e0d0, 0.8);
    const s = new T.Shape();
    s.moveTo(-w / 2 - 0.7, 0); s.lineTo(w / 2 + 0.7, 0); s.lineTo(w / 2 + 0.7, h); s.absarc(0, h, w / 2 + 0.7, 0, Math.PI, false); s.lineTo(-w / 2 - 0.7, 0);
    const hole = new T.Path();
    hole.moveTo(-w / 2, 0); hole.lineTo(w / 2, 0); hole.lineTo(w / 2, h); hole.absarc(0, h, w / 2, 0, Math.PI, false); hole.lineTo(-w / 2, 0);
    s.holes.push(hole);
    const geo = new T.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: false, curveSegments: 20 });
    geo.translate(0, 0, -0.35);
    g.add(new T.Mesh(geo, brick));
    [-1, 1].forEach((sd) => { part(g, G.box(1.6, 1.6, 1.6), brick, sd * (w / 2 + 2.2), 0.8, 0); part(g, G.box(1.8, 0.2, 1.8), cap, sd * (w / 2 + 2.2), 1.7, 0); part(g, G.cone(0.4, 0.7, 4), cap, sd * (w / 2 + 2.2), 2.15, 0, 0, Math.PI / 4, 0); });
    return KT.bake(g);
  }
  // the children's play tower: platforms on posts, cone roofs, slides and steps
  function playTower() {
    const g = new T.Group();
    const post = mat('playPost', 0x2e8a5a, 0.5), red = mat('playRed', 0xd8352a, 0.5), yel = mat('playYellow', 0xf2b724, 0.5), blue = mat('playBlue', 0x2a86c8, 0.5);
    const purple = mat('playPurple', 0x8a4ab0, 0.5), pink = mat('playPink', 0xe86a9a, 0.5), green = mat('playGreen', 0x6cc04a, 0.5);
    const tower = (x, z, h, roof, k) => {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => part(g, G.cyl(0.08, 0.08, h + 1.6, 8), post, x + a * k, (h + 1.6) / 2, z + b * k));
      part(g, G.box(2 * k + 0.3, 0.15, 2 * k + 0.3), yel, x, h, z);
      [[0, -1], [1, 0], [-1, 0]].forEach(([a, b]) => part(g, G.box(a ? 0.06 : 2 * k, 0.9, a ? 2 * k : 0.06), b < 0 ? red : blue, x + a * k, h + 0.5, z + b * k));
      part(g, G.cyl(k * 1.45, k * 1.45, 0.25, 12), red, x, h + 1.7, z);
      part(g, G.cone(k * 1.3, k * 1.6, 12), roof, x, h + 2.6, z);
      part(g, G.cyl(0.02, 0.02, 0.6, 4), post, x, h + 3.7, z);
      part(g, G.box(0.35, 0.22, 0.02), red, x + 0.18, h + 3.9, z);
    };
    tower(0, 0, 3.4, purple, 1.2);
    tower(-4.2, 0.6, 2.2, pink, 0.95);
    tower(4.0, -0.4, 1.6, green, 0.9);
    // a tube between the towers, arches on top, a frog panel
    part(g, G.cyl(0.45, 0.45, 2.2, 14, 1, true), yel, -2.1, 2.6, 0.3, 0, 0, HP);
    [[-4.2, 0.6, 3.2], [4, -0.4, 2.6]].forEach(([x, z, y]) => part(g, G.torus(0.6, 0.12, 6, 12, Math.PI), red, x, y, z + 0.9));
    const frog = new T.Group();
    part(frog, G.box(1.6, 1.2, 0.06), mat('playPanel', 0xf4f0e0, 0.6), 0, 0, 0);
    part(frog, G.sph(0.42, 10, 8), green, 0, -0.08, 0.04, 0, 0, 0, 1.3, 0.8, 0.3);
    [-1, 1].forEach((sd) => { part(frog, G.sph(0.14, 8, 6), green, sd * 0.25, 0.28, 0.05); part(frog, G.sph(0.06, 6, 5), KT.M.white, sd * 0.25, 0.3, 0.12); });
    frog.position.set(0, 0.9, 1.25); g.add(frog);
    // a straight slide and a spiral slide
    const slide = new T.Group();
    part(slide, G.box(0.9, 0.08, 4.6), red, 0, 0, 0);
    [-1, 1].forEach((sd) => part(slide, G.box(0.08, 0.3, 4.6), red, sd * 0.45, 0.15, 0));
    slide.position.set(-4.2, 1.15, 3.9); slide.rotation.x = 0.5; g.add(slide);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2.2, y = 3.3 - i * 0.18;
      part(g, G.box(1.0, 0.1, 0.9), i % 2 ? yel : mat('playOrange', 0xf08a24, 0.5), 2.2 + Math.cos(a) * 1.4, y, 2.4 + Math.sin(a) * 1.4, 0, -a, 0.2);
    }
    part(g, G.cyl(0.12, 0.12, 3.6, 8), post, 2.2, 1.8, 2.4);
    // blue steps up to the small tower
    for (let i = 0; i < 6; i++) part(g, G.box(1.2, 0.12, 0.35), blue, 4.0, 0.2 + i * 0.27, 1.7 + (5 - i) * 0.32);
    [-1, 1].forEach((sd) => part(g, G.box(0.06, 0.06, 2.4), blue, 4.0 + sd * 0.6, 1.4, 2.5, 0.6));
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0.5, hw: 6, hd: 2.4 }];
    return baked;
  }
  // the glass bridge: a raised walk with a glass floor, white rails and, at
  // its end over the water, a canopy draped in yellow with a flower garland
  function glassBridge(len, y) {
    const g = new T.Group();
    const white = mat('gbWhite', 0xf4f4f0, 0.5), steel = mat('gbSteel', 0x9aa3a8, 0.4);
    const glass = KT.mat('gbGlass', { color: 0x9fd8e8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.4, depthWrite: false });
    part(g, G.box(3.6, 0.08, len), glass, 0, y, -len / 2);
    [-1, 1].forEach((sd) => {
      part(g, G.box(0.25, 0.35, len), white, sd * 1.9, y - 0.1, -len / 2);
      part(g, G.box(0.08, 0.08, len), white, sd * 1.9, y + 1.15, -len / 2);
      part(g, G.box(0.04, 0.95, len), glass, sd * 1.88, y + 0.6, -len / 2);
      for (let z = 0; z <= len; z += 2.5) part(g, G.box(0.08, 1.15, 0.08), white, sd * 1.9, y + 0.58, -z);
    });
    for (let z = 4; z < len; z += 9) [-1, 1].forEach((sd) => part(g, G.cyl(0.22, 0.26, y, 10), steel, sd * 1.4, y / 2, -z));
    // the stair tower at the land end
    for (let i = 0; i < 18; i++) part(g, G.box(1.6, 0.12, 0.45), white, 0, 0.3 + i * (y - 0.3) / 18, 9 - i * 0.5);
    [-1, 1].forEach((sd) => part(g, G.box(0.08, 0.08, 9.6), white, sd * 0.85, y / 2 + 1, 4.5, Math.atan2(y, 9)));
    part(g, G.box(3.6, 0.2, 2.5), white, 0, y - 0.05, 0.6);
    // the draped canopy
    const cz = -len + 3, gold = mat('gbYellow', 0xf2b12a, 0.8), dk = mat('gbGreen', 0x2f5a2a, 0.7);
    [[-1.5, cz - 1.5], [1.5, cz - 1.5], [-1.5, cz + 1.5], [1.5, cz + 1.5]].forEach(([x, z]) => part(g, G.box(0.18, 3.2, 0.18), dk, x, y + 1.6, z));
    part(g, G.box(3.6, 0.3, 3.6), dk, 0, y + 3.25, cz);
    [-1, 1].forEach((sd) => [-1, 1].forEach((e) => part(g, G.box(0.6, 2.8, 0.05), gold, sd * 1.25, y + 1.8, cz + e * 1.62, 0, 0, sd * 0.12)));
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2, rr = 1.8;
      part(g, G.sph(0.18, 6, 5), i % 3 ? mat('gbRose', 0xb8305a, 0.7) : mat('gbWhiteF', 0xf6eef0, 0.7), Math.cos(a) * rr * (Math.abs(Math.cos(a)) > 0.7 ? 1 : 1.0), y + 3.45, cz + Math.sin(a) * rr);
    }
    const baked = KT.bake(g);
    const up = { minY: y - 0.9 };
    baked.userData.colliders = [
      Object.assign({ type: 'box', x: -1.95, z: -len / 2, hw: 0.12, hd: len / 2 }, up), Object.assign({ type: 'box', x: 1.95, z: -len / 2, hw: 0.12, hd: len / 2 }, up),
      Object.assign({ type: 'box', x: 0, z: -len - 0.1, hw: 1.9, hd: 0.12 }, up),
      { type: 'box', x: -0.95, z: 4.8, hw: 0.08, hd: 4.4, minY: 0.6 }, { type: 'box', x: 0.95, z: 4.8, hw: 0.08, hd: 4.4, minY: 0.6 },
      { type: 'box', x: 0, z: 3.6, hw: 0.9, hd: 3.2, maxY: 0.5 }  // under the stair
    ];
    for (let z = 4; z < len; z += 9) [-1, 1].forEach((sd) => baked.userData.colliders.push({ type: 'circle', x: sd * 1.4, z: -z, r: 0.3, maxY: y - 1.5 }));
    return baked;
  }
  // red interlocking pavers with little yellow flower motifs (the promenade)
  let promMat = null;
  function promenadeMat() {
    if (promMat) return promMat;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#9a3a2a'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#6e2418'; g.lineWidth = 2;
    for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? 0 : 12; x < 256; x += 24) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y); g.lineTo(x + 12, y + 8); g.lineTo(x + 8, y + 16); g.lineTo(x, y + 16); g.lineTo(x - 4, y + 8); g.closePath(); g.stroke();
    }
    g.fillStyle = '#e8c23a';
    [[64, 64], [192, 192]].forEach(([x, y]) => { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 6, 3, a, 0, 7); g.fill(); } });
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(1, 1);
    return (promMat = new T.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  }
  function pavedStrip(g, x0, z0, x1, z1, scale) {
    const geo = new T.PlaneGeometry(x1 - x0, z1 - z0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / scale, uv.getY(i) * (z1 - z0) / scale);
    const m = new T.Mesh(geo, promenadeMat());
    m.rotation.x = -HP; m.position.set((x0 + x1) / 2, 0.05, (z0 + z1) / 2);
    m.receiveShadow = true;
    g.add(m);
  }
  // croton bushes: yellow-green variegated leaves
  function croton(g, x, z, k) {
    const a = mat('crotonY', 0xc9c23a, 0.8), b = mat('crotonG', 0x5f8a2a, 0.8);
    part(g, G.sph(0.55 * k, 8, 6), b, x, 0.5 * k, z, 0, 0, 0, 1, 0.9, 1);
    for (let i = 0; i < 5; i++) part(g, G.sph(0.25 * k, 6, 5), i % 2 ? a : b, x + Math.cos(i * 1.3) * 0.4 * k, 0.65 * k + (i % 2) * 0.2 * k, z + Math.sin(i * 1.3) * 0.4 * k);
  }
  // people walking back and forth along a line, or round a loop
  function strollers(it, parent, routes, seed) {
    const rng = KT.makeRng(seed);
    let n = 0;
    routes.forEach((pts) => {
      const speed = 0.9 + rng() * 0.4, legs = [];
      let T0 = 0;
      for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / speed; legs.push({ a: pts[i], b: pts[i + 1], t0: T0, t1: T0 + d }); T0 += d; legs.push({ a: pts[i + 1], b: pts[i + 1], t0: T0, t1: T0 + 3 + rng() * 6, stop: true }); T0 = legs[legs.length - 1].t1; }
      const people = 1 + Math.floor(rng() * 2.6), start = rng() * T0;
      for (let k = 0; k < people; k++) {
        const look = VISIT_LOOKS[(n * 3 + seed) % VISIT_LOOKS.length], female = look[0] === 'female', kid = k === 2;
        const ch = Models.character({ gender: look[0], outfit: kid ? 'casual' : look[1], lite: true, hair: female ? ['bun', 'braid', 'default', 'loose', 'curly'][n % 5] : ['short', 'default', 'wavy', 'curly'][n % 4],
          skin: [0xc08660, 0xd9a27c, 0x8d5a3b, 0xa8704c][n % 4], acc: { backpack: rng() < 0.2, hat: rng() < 0.25, sunglasses: rng() < 0.3, camera: rng() < 0.2 }, scale: kid ? 0.7 : 0.92 + rng() * 0.1, seed: 900 + n });
        parent.add(ch);
        n++;
        const side = (k - (people - 1) / 2) * 0.9, lag = k * 0.4 / speed;
        let last = null;
        it.anim.push((t) => {
          const dt = last === null ? 0 : Math.min(0.1, Math.max(0, t - last));
          last = t;
          const u = (t + start - lag + T0 * 4) % T0;
          let L = legs[legs.length - 1];
          for (let i = 0; i < legs.length; i++) if (u < legs[i].t1) { L = legs[i]; break; }
          const q = L.t1 > L.t0 ? (u - L.t0) / (L.t1 - L.t0) : 0;
          if (L.stop) { KT.Models.animateCharacter(ch, 'idle', dt, 1); return; }
          const dx = L.b[0] - L.a[0], dz = L.b[1] - L.a[1], len = Math.hypot(dx, dz) || 1;
          ch.position.set(L.a[0] + dx * q + (dz / len) * side, 0, L.a[1] + dz * q - (dx / len) * side);
          ch.rotation.y = KT.angleLerp(ch.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
          KT.Models.animateCharacter(ch, 'walk', dt, speed / 1.1);
        });
      }
    });
  }
  function sitters(it, parent, seats, seed) {
    const rng = KT.makeRng(seed);
    seats.forEach(([bx, bz, br], i) => {
      const two = rng() < 0.6;
      (two ? [-0.42, 0.42] : [(rng() - 0.5) * 0.5]).forEach((o, k) => {
        const look = VISIT_LOOKS[(i * 2 + k + seed) % VISIT_LOOKS.length], female = look[0] === 'female';
        const ch = Models.character({ gender: look[0], outfit: look[1], lite: true, hair: female ? ['bun', 'braid', 'loose'][i % 3] : ['short', 'default'][i % 2],
          skin: [0xc08660, 0xd9a27c, 0x8d5a3b, 0xa8704c][(i + k) % 4], glasses: rng() < 0.25, acc: { hat: rng() < 0.2 }, carry: rng() < 0.3 ? 'phone' : null, scale: 0.93 + rng() * 0.07, seed: 1000 + i * 2 + k });
        const c = Math.cos(br), sn = Math.sin(br);
        ch.position.set(bx + o * c + 0.06 * sn, 0, bz - o * sn + 0.06 * c);
        ch.rotation.y = br;
        parent.add(ch);
        const ph = rng() * 9, turn = two ? (k ? 0.5 : -0.5) : 0;
        let last = null;
        it.anim.push((t) => {
          const dt = last === null ? 0 : Math.min(0.1, Math.max(0, t - last));
          last = t;
          KT.Models.animateCharacter(ch, 'sit', dt, 1);
          const head = ch.userData.rig && ch.userData.rig.head;
          if (head) head.rotation.y = Math.sin((t + ph) * 0.25) > 0.6 ? turn : Math.sin((t + ph) * 0.35) * 0.45;
        });
      });
    });
  }
  function akkulam(it) {
    const root = new T.Group(), g = new T.Group(), people = new T.Group();
    root.add(people);
    const lam = mat('akkLaterite', 0xa4553a, 0.95), cap = mat('akkCap', 0xe8e0d0, 0.8), moss = mat('akkPost', 0x8f8a7c, 0.95);
    const lawn = mat('akkLawn', 0x6aa043, 1), path = mat('akkPath', 0xb8774f, 1), sand = mat('akkSand', 0xd9c49a, 1), pipe = mat('akkPipe', 0xc9c6bc, 0.4);
    const X = 55, ZF = 42, ZB = -50;
    const GHATS = [-39, 49], RAIL = [[-80, -42.5], [-35.5, 7.5], [12.5, 45.5], [52.5, 80]];
    it.ghats = GHATS;
    groundPatch(g, lawn, -80, -58, 80, ZF, 0.02);
    // the compound wall (open to the river) with the arch gate in front
    const wall = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0) + HP;
      part(g, G.box(len, 1.4, 0.45), lam, (x0 + x1) / 2, 0.7, (z0 + z1) / 2, 0, ang, 0);
      part(g, G.box(len, 0.12, 0.6), cap, (x0 + x1) / 2, 1.45, (z0 + z1) / 2, 0, ang, 0);
    };
    wall(-X, ZF, -4, ZF); wall(4, ZF, X, ZF); wall(-X, ZF, -X, -50); wall(X, ZF, X, -50);
    groundPatch(g, path, -3, ZB, 3, ZF + 4, 0.04);
    groundPatch(g, path, -X + 2, -2.5, X - 2, 2.5, 0.04);
    // the promenade along the river: pavers, a low wall at the water's edge,
    // square posts with pyramid caps and two pipe rails
    pavedStrip(g, -80, -58.6, 80, -50, 6);
    part(g, G.box(160, 2.2, 0.6), moss, 0, -0.9, -59.1);
    // the rail along the water, open at the jetty and at two flights of steps
    // down to the water
    RAIL.forEach(([x0, x1]) => {
      for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.max(1, Math.round((x1 - x0) / 3.2))) {
        part(g, G.box(0.42, 1.1, 0.42), moss, x, 0.55, -58.4);
        part(g, G.cone(0.34, 0.32, 4), moss, x, 1.26, -58.4, 0, Math.PI / 4, 0);
      }
      [0.55, 0.9].forEach((y) => part(g, G.cyl(0.04, 0.04, x1 - x0, 6), pipe, (x0 + x1) / 2, y, -58.4, 0, 0, HP));
    });
    GHATS.forEach((gx) => {
      for (let k = 0; k < 6; k++) part(g, G.box(6, 0.18, 0.6), moss, gx, -0.12 - k * 0.17, -59.0 - k * 0.55);
    });
    // children's play area on sand
    groundPatch(g, sand, -50, 8, -22, 36, 0.05);
    for (let i = 0; i < 6; i++) croton(g, -52 + i * 5.6, 38.5, 1.1);
    root.add(KT.bake(g));
    const deco = (obj, x, z, r, sc) => { obj.position.set(x, 0, z); obj.rotation.y = r || 0; if (sc) obj.scale.setScalar(sc); root.add(obj); return obj; };
    const gate = deco(brickArch(5, 3.6), 0, ZF, 0);
    const tag = Models.signboard(['Akkulam Tourist Village', 'Boating • Children’s park • Glass bridge']);
    deco(tag, 7.5, ZF + 2.5, 0, 0.9);
    deco(brickArch(3.0, 2.4), 10, -57.2, 0);
    const jb = Models.signboard(['Boat jetty', 'Motor boats • Canoes']); jb.scale.setScalar(0.8);
    deco(jb, 15, -55.5, 0.4);
    const tower = deco(playTower(), -36, 22, 0.3);
    const bridge = deco(glassBridge(44, 7), 36, 18, 0);
    it.bridge = { x: 36, z: 18, len: 44, y: 7 };
    // the boat jetty, with pedal boats and motor boats moored
    const jetty = new T.Group();
    for (let k = 0; k < 6; k++) { const js = Models.jettySection(); js.position.z = -k * 3; jetty.add(js); }
    deco(jetty, 10, -60, 0).position.y = -0.3;
    // (the boats moored at the jetty are real: see akkulamBoats)
    it.jetty = { x: 10, z: -60 };
    // rain trees along the promenade, and trees and crotons on the lawns
    for (let x = -74; x <= 74; x += 16) deco(Models.mangoTree(), x, -46.5, x * 0.1, 1.25);
    [[-46, -20], [-20, -30], [-46, 0], [48, -32], [20, -12], [-14, 26], [46, 36]].forEach(([x, z], i) => deco(i % 2 ? Models.mangoTree() : Models.banyanTree(), x, z, i, 0.85));
    const cro = new T.Group();
    [[-6, 30], [6, 30], [-6, 14], [6, 14], [-6, -10], [6, -10], [-6, -30], [6, -30], [-30, -44], [40, -44], [30, 30], [16, 34], [-16, -18], [26, -24]].forEach(([x, z], i) => croton(cro, x, z, 0.8 + (i % 3) * 0.2));
    root.add(KT.bake(cro));
    for (let x = -72; x <= 72; x += 14.4) deco(Models.lampPost(), x + 7, -50.6, Math.PI);
    // benches along the promenade facing the water, and a few on the lawns
    const SEATS = [];
    for (let x = -70; x <= 70; x += 11.6) SEATS.push([x, -51.6, Math.PI]);
    SEATS.push([-8, 20, -HP], [8, -20, HP], [-24, 4.5, Math.PI], [26, -4.5, 0]);
    SEATS.forEach(([x, z, r]) => deco(Models.bench(), x, z, r));
    sitters(it, people, SEATS.filter((s, i) => i % 3 !== 1), 31);
    // strollers on the promenade, on the paths, and children at play
    strollers(it, people, [
      [[-76, -54.5], [76, -54.5], [-76, -54.5]], [[60, -53.5], [-60, -53.5], [60, -53.5]], [[-20, -55.5], [40, -55.5], [-20, -55.5]],
      [[0, 44], [0, -48], [-50, -53], [-70, -54], [-50, -53], [0, -48], [0, 44]], [[0, 40], [0, 0], [40, 0], [40, -10], [40, 0], [0, 0], [0, 40]],
      [[0, 38], [0, 0], [-30, 0], [-30, 6], [-30, 0], [0, 0], [0, 38]], [[70, -55], [10, -55], [10, -57], [10, -55], [70, -55]]
    ], 47);
    const kids = new T.Group(); people.add(kids);
    strollers(it, kids, [[[-46, 12], [-28, 14], [-30, 32], [-46, 30], [-46, 12]], [[-26, 30], [-44, 18], [-26, 30]]], 53);
    // a few people up on the glass bridge, at the canopy
    [[35.2, 18 - 44 + 4.5], [36.8, 18 - 44 + 5.2]].forEach(([x, z], i) => {
      const ch = Models.character({ gender: i ? 'female' : 'male', outfit: i ? 'saree' : 'formal', lite: true, hair: i ? 'bun' : 'short', skin: 0xc08660, acc: {}, scale: 0.95, seed: 1200 + i });
      ch.position.set(x, 7.05, z); ch.rotation.y = i ? 2.6 : -0.5;
      people.add(ch);
      let last = null;
      it.anim.push((t) => { const dt = last === null ? 0 : Math.min(0.1, Math.max(0, t - last)); last = t; KT.Models.animateCharacter(ch, i && Math.sin(t * 0.3) > 0.7 ? 'wave' : 'idle', dt, 1); });
    });
    it.fauna = people; // drawn and moved only nearby
    // walls stop the player; the gate's opening, the promenade and the river's edge
    const C = [];
    const box = (x0, z0, x1, z1) => C.push({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: Math.max(0.3, Math.abs(x1 - x0) / 2), hd: Math.max(0.3, Math.abs(z1 - z0) / 2) });
    box(-X, ZF, -4, ZF); box(4, ZF, X, ZF); box(-X, ZF, -X, -50); box(X, ZF, X, -50);
    RAIL.forEach(([x0, x1]) => box(x0, -58.6, x1, -58.2));   // the river rail, open at the jetty and the steps
    // the play tower's and the glass bridge's own colliders, moved into the park
    [tower, bridge].forEach((o) => (o.userData.colliders || []).forEach((c) => {
      const cr = Math.cos(o.rotation.y), sr = Math.sin(o.rotation.y);
      C.push(Object.assign({}, c, { x: o.position.x + c.x * cr + c.z * sr, z: o.position.z - c.x * sr + c.z * cr, rot: (c.rot || 0) + o.rotation.y }));
    }));
    root.userData.colliders = C;
    return root;
  }
  // the glass bridge and the jetty can be walked on; the boats at the jetty
  // can be taken out on the river
  function akkulamWalkways(it, root) {
    const Hw = KT.Highway, r = root.rotation.y, c = Math.cos(r), sn = Math.sin(r), y0 = root.position.y;
    const W = (mx, mz) => ({ x: root.position.x + mx * c + mz * sn, z: root.position.z - mx * sn + mz * c });
    const B = it.bridge, bp = W(B.x, B.z);
    // (the bridge's own axes match the park's; its stair climbs from z = 9 to the landing)
    Hw.addPlatform(bp.x, bp.z, r, B.len + 12, (lx, lz) => {
      // the stair: its 18 steps climb from z = 9 (0.3 m up) to z = 0.5 (at the deck)
      if (Math.abs(lx) < 0.9 && lz > 0.5 && lz <= 9.5) return y0 + 0.36 + KT.clamp((9.2 - lz) / 8.7, 0, 1) * (B.y - 0.3);
      if (Math.abs(lx) < 1.85 && lz <= 1.85 && lz >= -B.len) return y0 + B.y + 0.05;
      return null;
    });
    // the steps down to the water
    it.ghats.forEach((gx) => {
      const gp = W(gx, -58.6);
      Hw.addPlatform(gp.x, gp.z, r, 8, (lx, lz) => (Math.abs(lx) < 3 && lz <= 0.2 && lz >= -3.4 ? y0 - 0.03 - KT.clamp(-lz / 3.3, 0, 1) * 0.85 : null));
    });
    const J = it.jetty, jp = W(J.x, J.z);
    Hw.addPlatform(jp.x, jp.z, r, 20, (lx, lz) => (Math.abs(lx) < 2.0 && lz <= 1.3 && lz >= -16.4 ? y0 + 0.3 : null));
    // the boats: two motor boats and two canoes, moored alongside the jetty
    const V = KT.Vehicle;
    [[J.x - 6.2, J.z - 6, 'boat'], [J.x - 3.0, J.z - 6, 'canoe'], [J.x + 3.0, J.z - 8, 'canoe'], [J.x + 6.2, J.z - 8, 'boat']].forEach(([mx, mz, type]) => {
      const q = W(mx, mz), veh = V.create(Hw.scene, q.x, q.z, r + Math.PI, type);
      Hw.interactables.push({ label: 'Take the ' + veh.spec.name + ' out on the river', radius: 4.5 + veh.spec.length / 2, pos: () => veh.obj.position,
        enabled: () => !veh.occupied, action: () => { KT.Player.boardBus(veh); KT.UI.toast('W/S for speed, A/D to steer. Bring it back to the jetty and press E to get out.', 'info'); } });
    });
  }
  // ------------------------------------------------------------- Ponmudi
  // The grassy top of Ponmudi: a dirt trail winding up from the car park to
  // the peak with its telecom station (a blue dome and masts), the Nilgiri
  // tahr pair on their rock cairn behind a pole fence, low mist drifting
  // over the hills, and visitors walking the trail and taking photographs.
  function tahrStatue() {
    const g = new T.Group(), stone = mat('tahrStone', 0x5c5d5a, 0.6);
    part(g, G.sph(0.42, 12, 10), stone, 0, 0.95, 0, 0, 0, 0, 0.75, 0.7, 1.4);
    part(g, G.sph(0.3, 10, 8), stone, 0, 1.05, 0.42, 0, 0, 0, 0.8, 0.85, 0.8);
    [[-0.18, 0.4], [0.18, 0.4], [-0.18, -0.38], [0.18, -0.38]].forEach(([x, z]) => part(g, G.cyl(0.07, 0.05, 0.75, 6), stone, x, 0.4, z));
    part(g, G.cyl(0.11, 0.15, 0.5, 8), stone, 0, 1.3, 0.62, 0.6);
    part(g, G.box(0.18, 0.2, 0.38), stone, 0, 1.52, 0.86, 0.5);
    [-1, 1].forEach((s) => part(g, G.torus(0.16, 0.03, 5, 10, Math.PI * 0.9), stone, s * 0.07, 1.68, 0.72, 0, HP, -0.4));
    part(g, G.cone(0.05, 0.16, 5), stone, 0, 1.0, -0.62, -1.2);
    return KT.bake(g);
  }
  function ponmudi(it) {
    const Hw = KT.Highway, PM = Hw.PONMUDI, g = new T.Group(), people = new T.Group();
    it.group.add(g); it.group.add(people);
    const fw = PM.fwd, rt = { x: -fw.z, z: fw.x };
    const W = (d, l) => ({ x: PM.x + fw.x * d + rt.x * l, z: PM.z + fw.z * d + rt.z * l });
    // the trail: switchbacks up the peak from beyond the car park
    const way = [[18, 0], [55, 22], [80, -26], [108, 24], [130, -18], [148, 12], [162, -4], [168, 0]];
    const curve = new T.CatmullRomCurve3(way.map(([d, l]) => { const q = W(d, l); return new T.Vector3(q.x, 0, q.z); }));
    const N = 160, pts = curve.getSpacedPoints(N), pos = [], idx = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
      [-1.3, 1.3].forEach((o) => { const x = p.x - dz / l * o, z = p.z + dx / l * o; pos.push(x, Hw.height(x, z) + 0.3, z); });
      if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const trailMat = KT.mat('hillTrail', { color: 0xc2a45e, roughness: 1, side: T.DoubleSide });
    trailMat.polygonOffset = true; trailMat.polygonOffsetFactor = -2; trailMat.polygonOffsetUnits = -6;
    const trail = new T.Mesh(geo, trailMat); trail.receiveShadow = true; g.add(trail);
    // stones along the trail
    for (let i = 4; i < N; i += 3) {
      const p = pts[i], s = (i % 2 ? 1 : -1) * (1.6 + (i % 5) * 0.2);
      const a = pts[i - 1], dx = p.x - a.x, dz = p.z - a.z, l = Math.hypot(dx, dz) || 1;
      const x = p.x - dz / l * s, z = p.z + dx / l * s;
      part(g, KT.blob(0.25 + (i % 3) * 0.12, 1, 0.3, i), KT.M.rock, x, Hw.height(x, z) + 0.05, z, 0, i, 0, 1, 0.6, 1);
    }
    // the summit station: a hut, a blue dome and three masts, fenced
    const top = W(170, 0), ty = Hw.height(top.x, top.z);
    const white = mat('stnWhite', 0xe8e8e2, 0.7), blue = mat('stnBlue', 0x2f6fc0, 0.4), steel = mat('stnSteel', 0x9aa2a8, 0.4);
    const stn = new T.Group();
    part(stn, G.box(5, 3, 4), white, 0, 1.5, 0);
    part(stn, new T.SphereGeometry(2.2, 18, 10, 0, Math.PI * 2, 0, HP), blue, 3.5, 2.6, -1.5);
    part(stn, G.cyl(2.2, 2.2, 2.6, 18), blue, 3.5, 1.3, -1.5);
    [[-3.5, 1.5, 18], [-1.5, -3.5, 14], [5.5, 2.5, 12]].forEach(([x, z, h]) => {
      [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach(([a, b]) => part(stn, G.cyl(0.05, 0.05, h, 4), steel, x + a * (1 - 0), h / 2, z + b));
      for (let y = 2; y < h; y += 2) part(stn, G.box(0.9, 0.05, 0.9), steel, x, y, z);
      part(stn, G.sph(0.18, 6, 5), mat('stnRed', 0xd83a2a, 0.4), x, h + 0.2, z);
    });
    for (let a = 0; a < 6.28; a += 0.35) part(stn, G.cyl(0.05, 0.05, 1.4, 4), steel, Math.cos(a) * 9, 0.7, Math.sin(a) * 9);
    // (baked first, then put in place: baking works in the group's own space)
    const station = KT.bake(stn);
    station.position.set(top.x, ty - 0.2, top.z); station.rotation.y = Math.atan2(fw.x, fw.z);
    g.add(station);
    Hw.addCollider({ type: 'box', x: top.x, z: top.z, hw: 4, hd: 3, rot: station.rotation.y });
    // the Nilgiri tahr pair on their cairn, behind a pole fence, by the car park
    const cair = W(14, 16), cy = Hw.height(cair.x, cair.z);
    const cairn = new T.Group();
    for (let i = 0; i < 14; i++) { const a = i * 2.3, r = 0.4 + (i % 4) * 0.45; part(cairn, KT.blob(0.7 + (i % 3) * 0.2, 1, 0.25, 200 + i), KT.M.rock, Math.cos(a) * r, 0.4 + Math.floor(i / 4) * 0.55, Math.sin(a) * r * 0.7); }
    const t1 = tahrStatue(); t1.position.set(0.1, 2.0, 0); t1.rotation.y = 0.6; cairn.add(t1);
    const t2 = tahrStatue(); t2.position.set(-1.6, 0.1, 1.4); t2.rotation.y = -0.9; cairn.add(t2);
    const pole = mat('fencePole', 0x8a6a48, 0.9);
    for (let a = 0; a < 6.28; a += 0.5) part(cairn, G.cyl(0.05, 0.05, 1.0, 5), pole, Math.cos(a) * 3.2, 0.5, Math.sin(a) * 2.6);
    [0.45, 0.85].forEach((y) => part(cairn, G.torus(2.9, 0.035, 4, 24), pole, 0, y, 0, HP, 0, 0, 1.1, 0.9, 1));
    const cairnB = KT.bake(cairn);
    cairnB.position.set(cair.x, cy, cair.z);
    g.add(cairnB);
    Hw.addCollider({ type: 'circle', x: cair.x, z: cair.z, r: 3.2 });
    // low mist drifting over the hills
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const cg = c.getContext('2d'), gr = cg.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(250,250,252,0.45)'); gr.addColorStop(1, 'rgba(250,250,252,0)');
    cg.fillStyle = gr; cg.fillRect(0, 0, 128, 128);
    const mistMat = new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, opacity: 0.55, depthWrite: false, fog: false });
    const mists = [];
    for (let i = 0; i < 14; i++) {
      const s = new T.Sprite(mistMat), q = W(60 + (i * 97) % 520, ((i * 173) % 700) - 350), y = Math.max(Hw.height(q.x, q.z), PM.endY) + 8 + (i % 4) * 9;
      s.scale.set(90 + (i % 3) * 40, 32 + (i % 2) * 14, 1);
      s.position.set(q.x, y, q.z);
      g.add(s); mists.push({ s, x0: q.x, z0: q.z, ph: i * 1.7 });
    }
    it.anim.push((t) => mists.forEach((m) => { m.s.position.x = m.x0 + Math.sin(t * 0.03 + m.ph) * 40 * rt.x; m.s.position.z = m.z0 + Math.sin(t * 0.03 + m.ph) * 40 * rt.z; }));
    // visitors walking up and down the trail, and two photographers
    const L = curve.getLength(), rng = KT.makeRng(1100);
    for (let k = 0; k < 9; k++) {
      const look = VISIT_LOOKS[(k * 3 + 1) % VISIT_LOOKS.length], female = look[0] === 'female';
      const ch = Models.character({ gender: look[0], outfit: k % 3 === 0 ? 'hiking' : look[1], lite: true, hair: female ? ['bun', 'braid', 'loose'][k % 3] : ['short', 'default', 'wavy'][k % 3], skin: [0xc08660, 0xd9a27c, 0x8d5a3b, 0xa8704c][k % 4], acc: { backpack: rng() < 0.6, hat: rng() < 0.3, sunglasses: rng() < 0.4, camera: rng() < 0.4 }, scale: 0.92 + rng() * 0.1, seed: 1300 + k });
      people.add(ch);
      const speed = 0.7 + rng() * 0.35, off = rng() * 600, side = (rng() - 0.5) * 1.4;
      let last = null;
      it.anim.push((t) => {
        const dt = last === null ? 0 : Math.min(0.1, Math.max(0, t - last));
        last = t;
        // up the trail, a rest at the top, then back down
        const T2 = 2 * L / speed + 16, u = (t + off) % T2;
        let d, dir;
        if (u < L / speed) { d = u * speed; dir = 1; } else if (u < L / speed + 16) { d = L; dir = 0; } else { d = L - (u - L / speed - 16) * speed; dir = -1; }
        const s = KT.clamp(d / L, 0, 1), p = curve.getPointAt(s), tg = curve.getTangentAt(s);
        const x = p.x - tg.z * side, z = p.z + tg.x * side;
        ch.position.set(x, Hw.height(x, z) + 0.1, z);
        if (dir) ch.rotation.y = KT.angleLerp(ch.rotation.y, Math.atan2(tg.x * dir, tg.z * dir), Math.min(1, dt * 5));
        KT.Models.animateCharacter(ch, dir ? 'walk' : 'idle', dt, speed / 1.1);
      });
    }
    [[40, 30, 0.6], [95, -38, -0.8]].forEach(([d, l, r], k) => {
      const q = W(d, l), ch = Models.character({ gender: k ? 'male' : 'female', outfit: k ? 'hiking' : 'casual', lite: true, hair: k ? 'short' : 'bun', skin: 0xc08660, acc: { backpack: true, camera: true }, seed: 1350 + k });
      ch.position.set(q.x, Hw.height(q.x, q.z) + 0.1, q.z);
      ch.rotation.y = Math.atan2(rt.x * (l > 0 ? 1 : -1), rt.z * (l > 0 ? 1 : -1)) + r;
      people.add(ch);
      let last = null;
      it.anim.push((t) => { const dt = last === null ? 0 : Math.min(0.1, Math.max(0, t - last)); last = t; KT.Models.animateCharacter(ch, 'idle', dt, 1); });
    });
    it.fauna = people;
  }

  function riverWater(it) {
    // one water surface along the river, with water hyacinth by the banks
    const R = it.river, pos = [], idx = [];
    const n = R.pts.length;
    for (let i = 0; i < n; i++) {
      const a = R.pts[Math.max(0, i - 1)], b = R.pts[Math.min(n - 1, i + 1)], p = R.pts[i];
      const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, w = R.r + 5;
      pos.push(p.x - dz / l * w, R.y, p.z + dx / l * w, p.x + dz / l * w, R.y, p.z - dx / l * w);
      if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const water = new T.Mesh(geo, KT.Highway.waterMaterial());
    it.group.add(water);
    [0, n - 1].forEach((i) => { const c = new T.Mesh(new T.CircleGeometry(R.r + 5, 24), KT.Highway.waterMaterial()); c.rotation.x = -HP; c.position.set(R.pts[i].x, R.y, R.pts[i].z); it.group.add(c); });
    const hy = new T.Group(), leaf = mat('hyacinth', 0x4f8a2e, 0.8), flower = mat('hyacinthFlower', 0xa58ad6, 0.7), rng = KT.makeRng(77);
    for (let i = 1; i < n - 1; i++) {
      const a = R.pts[i - 1], b = R.pts[i + 1], p = R.pts[i], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
      [-1, 1].forEach((sd) => {
        for (let k = 0; k < 5; k++) {
          const off = sd * (R.r - 3 + rng() * 5), along = (rng() - 0.5) * 12;
          const x = p.x + (-dz / l) * off + (dx / l) * along, z = p.z + (dx / l) * off + (dz / l) * along;
          part(hy, G.sph(0.9 + rng() * 1.2, 7, 4), leaf, x, R.y + 0.05, z, 0, rng() * 3, 0, 1, 0.18, 0.8);
          if (rng() < 0.35) part(hy, G.sph(0.18, 5, 4), flower, x, R.y + 0.3, z);
        }
      });
    }
    it.group.add(KT.bake(hy));
  }

  function zoo(it) {
    const root = new T.Group(), g = new T.Group(), fauna = new T.Group();
    root.add(fauna);
    const m = {
      brick: mat('zooBrick', 0xb24a32, 0.9), cream: mat('zooCream', 0xf0e0c0, 0.8), iron: mat('zooIron', 0x2f6b4a, 0.5),
      paver: KT.mat('zooPaver', { color: 0xc98a6a, roughness: 0.9 }), lawn: mat('zooLawn', 0x6fa04a, 1),
      sand: mat('zooSand', 0xdcc7a0, 1), mud: mat('zooMud', 0xa66a44, 1), earth: mat('zooEarth', 0x8f7656, 1), grass: mat('zooGrass', 0x4f8a36, 1),
      dry: mat('zooDryGrass', 0xb9a86a, 1), litter: mat('zooLitter', 0x8a5a3a, 1), marsh: mat('zooMarsh', 0x5d7a3a, 1), stone: mat('zooStone', 0x8c8c86, 0.95)
    };
    const Z = ZOO;
    // the compound wall, open at the gate; lawns; the forecourt; the paths
    railing(g, -Z, Z, -5.2, Z, m); railing(g, 5.2, Z, Z, Z, m);
    railing(g, -Z, -Z, Z, -Z, m); railing(g, -Z, -Z, -Z, Z, m); railing(g, Z, -Z, Z, Z, m);
    groundPatch(g, m.lawn, -Z, -Z, Z, Z, 0.02);
    groundPatch(g, m.paver, -10, Z, 10, Z + 20, 0.04);
    groundPatch(g, m.paver, -3, -Z + 2, 3, Z, 0.04);
    [20, -20].forEach((cz) => groundPatch(g, m.paver, -Z + 2, cz - 3, Z - 2, cz + 3, 0.04));
    // enclosures: [x0, z0, x1, z1, ground]; each faces a path
    const PENS = {
      zebra: [-52, 26, -26, 50, m.sand], stork: [-22, 26, -8, 50, m.marsh], elephant: [8, 26, 52, 50, m.mud],
      lion: [-52, -14, -30, 14, m.dry], leopard: [-26, -14, -8, 14, m.litter], orangutan: [8, -14, 28, 14, m.grass], macaque: [32, -14, 52, 14, m.grass],
      tiger: [-52, -50, -8, -26, m.earth], bear: [8, -50, 28, -26, m.grass], deer: [32, -50, 52, -26, m.litter]
    };
    Object.keys(PENS).forEach((k) => {
      const [x0, z0, x1, z1, gm] = PENS[k];
      groundPatch(g, gm, x0, z0, x1, z1, 0.05);
      if (k === 'deer') {
        // a wire-mesh fence round the deer, like the real park
        const wire = KT.mat('wireMeshSee', { color: 0x3d4a3f, roughness: 0.6, transparent: true, opacity: 0.22, depthWrite: false });
        [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]].forEach(([a, b, c, d]) => {
          const len = Math.hypot(c - a, d - b), ang = Math.atan2(c - a, d - b) + HP;
          part(g, G.box(len, 2.2, 0.05), wire, (a + c) / 2, 1.1, (b + d) / 2, 0, ang, 0);
          for (let t = 0; t <= len; t += 3) part(g, G.box(0.1, 2.4, 0.1), m.iron, a + (c - a) * t / len, 1.2, b + (d - b) * t / len);
        });
      } else [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]].forEach(([a, b, c, d]) => railing(g, a, b, c, d, m));
    });
    // --- the landscape inside each enclosure
    // tigers: a rocky hillside with a den, a pool, logs and forest trees
    mound(g, m.grass, -44, -46, 9, 5, 2.2);
    cave(g, -46, -44, 0.5, 1.1);
    pond(g, -16, -38, 3.6, 2.2);
    rockBlob(g, -30, 0.6, -45, 2.2, 1.4, 1.8, 41, true);
    // lions: a rock den like a kopje, dry grass and boulders
    cave(g, -41, -9, 0, 1.25);
    mound(g, m.dry, -47, 11, 3.5, 2.5, 1.0);
    rockBlob(g, -48, 0.7, 8, 1.6, 1.2, 1.4, 44); rockBlob(g, -31.5, 0.5, 6, 1.2, 0.8, 1.1, 45, true);
    // leopards: dense forest, boulders and a branch platform up a tree
    rockBlob(g, -20, 0.8, -8, 2.0, 1.5, 1.8, 47, true); rockBlob(g, -20, 0.5, 8, 1.4, 0.9, 1.2, 48);
    part(g, G.cyl(0.16, 0.2, 5.5, 7), KT.M.bark, -14, 2.4, -4, 0, 0, 1.1);
    part(g, G.box(2.6, 0.18, 1.6), mat('plank', 0x8a6a48, 0.9), -18.6, 3.6, -4);
    // bears: a grassy slope, rock walls with a den, a pool and logs
    mound(g, m.grass, 20, -46, 8, 4, 1.8);
    cave(g, 13, -44, 0.6, 0.9);
    pond(g, 24, -29, 3, 2);
    // zebras: low sandy mounds, scattered rocks and a water trough
    mound(g, m.sand, -44, 44, 5, 3.5, 0.9); mound(g, m.sand, -32, 32, 3.5, 2.5, 0.6);
    rockBlob(g, -30, 0.4, 46, 1.1, 0.7, 1.0, 50); rockBlob(g, -49, 0.35, 30, 0.9, 0.6, 0.8, 51, true);
    part(g, G.box(4, 0.6, 1), m.stone, -38, 0.3, 28); part(g, G.box(3.6, 0.1, 0.7), KT.Highway.waterMaterial(), -38, 0.58, 28);
    // the stork wetland: a pond with reeds and a muddy bank
    pond(g, -15, 39, 5, 7);
    [[-19, 30, 1], [-10, 31, 2], [-12, 48, 3], [-20, 47, 4]].forEach(([x, z, sd]) => reeds(g, x, z, 14, sd));
    // elephants: a mud wallow, a sand heap and fodder
    pond(g, 44, 32, 5, 3.4);
    mound(g, m.sand, 18, 44, 4, 3, 1.1);
    // orangutans: a climbing frame among tall trees
    climbingFrame(g, 18, 0);
    // macaques: bamboo and rocks
    bamboo(g, 36, -10, 61); bamboo(g, 48, 10, 62); bamboo(g, 47, -9, 63);
    rockBlob(g, 40, 0.6, 2, 1.8, 1.2, 1.6, 64, true);
    // deer: a stone water trough among the trees (as in the park)
    const trough = new T.Group();
    part(trough, G.cyl(2.2, 2.4, 0.7, 20), m.stone, 0, 0.35, 0);
    part(trough, G.cyl(1.9, 1.9, 0.1, 20), KT.Highway.waterMaterial(), 0, 0.62, 0);
    trough.position.set(38, 0, -40); g.add(trough);
    // no bare ground: patches of other soil and grass, and plants to suit
    const rng = KT.makeRng(1857);
    const MIX = { tiger: [m.grass, m.litter], lion: [m.sand, m.earth], leopard: [m.grass, m.earth], bear: [m.earth, m.litter], zebra: [m.dry, m.earth],
      stork: [m.mud, m.grass], elephant: [mat('zooMudDark', 0x8a5232, 1), m.dry], orangutan: [m.earth, m.litter], macaque: [m.litter, m.earth], deer: [m.grass, m.dry] };
    const COVER = { tiger: ['fern', 'tuft', 'bush'], lion: ['dry', 'dry', 'pebble'], leopard: ['fern', 'fern', 'bush'], bear: ['tuft', 'fern', 'pebble'], zebra: ['dry', 'pebble', 'pebble'],
      stork: ['tuft', 'tuft', 'pebble'], elephant: ['dry', 'tuft', 'pebble'], orangutan: ['fern', 'tuft', 'bush'], macaque: ['fern', 'bush', 'tuft'], deer: ['tuft', 'fern', 'pebble'] };
    const cover = new T.Group();
    const leafM = mat('zooBush', 0x3f7a32, 0.9), dryM = mat('zooDryTuft', 0xc2a95e, 0.9), tuftM = mat('zooTuft', 0x5b9a3c, 0.9);
    Object.keys(PENS).forEach((k) => {
      const [x0, z0, x1, z1] = PENS[k], W = x1 - x0, D = z1 - z0;
      for (let i = 0; i < Math.round(W * D / 70); i++) {
        const c = new T.Mesh(new T.CircleGeometry(1.5 + rng() * 3.5, 14), MIX[k][i % 2]);
        c.rotation.x = -HP; c.scale.set(1, 0.6 + rng() * 0.6, 1); c.rotation.z = rng() * 3;
        c.position.set(x0 + 3 + rng() * (W - 6), 0.06 + i * 0.0004, z0 + 3 + rng() * (D - 6));
        g.add(c);
      }
      for (let i = 0; i < Math.round(W * D / 9); i++) {
        const x = x0 + 1 + rng() * (W - 2), z = z0 + 1 + rng() * (D - 2), kind = COVER[k][Math.floor(rng() * 3)];
        if (kind === 'pebble') rockBlob(cover, x, 0.08, z, 0.25 + rng() * 0.3, 0.15, 0.2 + rng() * 0.3, 90 + i, rng() < 0.4);
        else if (kind === 'bush') part(cover, G.sph(0.5 + rng() * 0.5, 7, 5), leafM, x, 0.3, z, 0, rng() * 3, 0, 1, 0.7, 1);
        else {
          const mm = kind === 'dry' ? dryM : kind === 'fern' ? leafM : tuftM, n = kind === 'fern' ? 6 : 5, h = kind === 'dry' ? 0.7 : 0.5;
          for (let j = 0; j < n; j++) {
            const a = j / n * 6.28 + rng();
            part(cover, G.cone(kind === 'fern' ? 0.09 : 0.05, h, 3), mm, x + Math.cos(a) * 0.12, h / 2, z + Math.sin(a) * 0.12, Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
          }
        }
      }
    });
    root.add(KT.bake(cover));
    // the tiger moat
    const moat = new T.Mesh(new T.PlaneGeometry(44, 2.6), KT.Highway.waterMaterial());
    moat.rotation.x = -HP; moat.position.set(-30, 0.1, -27.8); g.add(moat);
    root.add(KT.bake(g));
    const deco = (obj, x, z, r, sc, parent) => { obj.position.set(x, 0, z); obj.rotation.y = r || 0; if (sc) obj.scale.setScalar(sc); (parent || root).add(obj); return obj; };
    // trees to suit each animal
    [[-51, -36], [-36, -49], [-12, -46], [-28, -48]].forEach(([x, z], i) => deco(Models.forestTree(i + 1), x, z, i));       // tiger forest
    deco(Models.mangoTree(), -50, 12, 1, 1.1);                                                                                  // lions' shade tree
    [[-24, -12], [-10, -10], [-22, 10], [-10, 12], [-16, 1]].forEach(([x, z], i) => deco(Models.forestTree(i + 6), x, z, i));  // leopard forest
    [[26, -48], [10, -30]].forEach(([x, z], i) => deco(Models.forestTree(i + 12), x, z, i));                                   // bears
    deco(Models.banyanTree(), -50, 48, 0.4, 0.8);                                                                              // zebras' shade
    [[11, 12], [26, -12], [10, -12]].forEach(([x, z], i) => deco(Models.forestTree(i + 15), x, z, i));                         // orangutans
    [[34, 12], [50, -2]].forEach(([x, z], i) => deco(Models.forestTree(i + 19), x, z, i));                                     // macaques
    [[51, -27], [50, -49], [33, -48], [51, -42]].forEach(([x, z], i) => deco(Models.forestTree(i + 22), x, z, i));             // deer
    [[50, 48], [10, 48]].forEach(([x, z], i) => deco(Models.coconutPalm(70 + i), x, z, i));                                    // elephants
    deco(Models.elephantShelter(), 30, 46, Math.PI, 0.75);
    const post = new T.Group();
    part(post, G.cyl(0.18, 0.2, 1.4, 8), KT.M.woodDark || m.mud, 0, 0.7, 0);
    for (let k = 0; k < 8; k++) part(post, G.torus(0.09, 0.025, 4, 8), KT.mat('chain', { color: 0x5a5148, metalness: 0.6, roughness: 0.4 }), 0.25 + k * 0.17, 0.08, 0.1 * (k % 2), HP, 0, k % 2 ? HP : 0);
    deco(KT.bake(post), 22, 30);
    for (let k = 0; k < 5; k++) part(root, G.box(1.1, 0.3, 0.5), KT.mat('palmFodder', { color: 0x6f9a3a }), 25 + k * 0.8, 0.2, 31 + (k % 2) * 0.5, 0, k * 0.4, 0);
    // the lawns: shade trees, benches and lamps along the paths
    [[-30, 23.6], [30, 23.6], [-30, -16.4], [30, -16.4], [-30, -23.6], [30, -23.6]].forEach(([x, z]) => deco(Models.lampPost(), x, z, 0));
    // benches (x, z, facing): along the cross paths and beside the main path
    const BENCHES = [[-14, 16.4, Math.PI], [14, 16.4, Math.PI], [-14, -16.4, 0], [14, -16.4, 0], [5, 40, -HP], [-5, -40, HP],
      [-5, 34, HP], [5, -34, -HP], [-40, -16.6, 0], [42, 16.6, Math.PI]];
    BENCHES.forEach(([x, z, r]) => deco(Models.bench(), x, z, r));
    [[-5.5, 52], [5.5, 52], [-54, 20], [54, 20], [-54, -20], [54, -20], [5.5, -52], [-5.5, -52]].forEach(([x, z], i) => deco(i % 2 ? Models.mangoTree() : Models.banyanTree(), x, z, i, 0.85));
    // signboards at each enclosure
    [['Zebra', -39, 24.4, 0], ['Adjutant Stork', -15, 24.4, 0], ['Asian Elephant', 30, 24.4, 0], ['Lion', -41, 15.6, Math.PI], ['Leopard', -17, 15.6, Math.PI],
      ['Orangutan', 18, 15.6, Math.PI], ['Lion-tailed Macaque', 42, 15.6, Math.PI], ['Bengal Tiger', -30, -24.4, Math.PI], ['Black Bear', 18, -24.4, Math.PI], ['Spotted Deer', 42, -24.4, Math.PI]]
      .forEach(([n, x, z, r]) => { const b = Models.signboard([n, 'Thiruvananthapuram Zoo']); b.scale.setScalar(0.8); deco(b, x, z, r); });
    const gate = deco(zooGate(), 0, Z, 0);
    // ---- the animals, walking their enclosures (or resting)
    const walk = (obj, pts, speed, pause, off) => patrol(it, fauna, obj, pts, speed, pause, off);
    const rest = (obj, x, z, r) => { const y = obj.userData.lie ? obj.userData.lie() : 0; deco(obj, x, z, r, 0, fauna); obj.position.y = -y; it.anim.push((t) => obj.userData.animate && obj.userData.animate(t, false)); };
    const stand = (obj, x, z, r, sc) => { deco(obj, x, z, r, sc, fauna); it.anim.push((t) => obj.userData.animate && obj.userData.animate(t, false)); return obj; };
    // tigers (3)
    walk(Models.tiger(), [[-48, -30], [-12, -30]], 1.4, 3, 0);
    walk(Models.tiger(), [[-22, -42], [-36, -36], [-28, -34]], 1.1, 6, 9);
    rest(Models.tiger(), -44, -39, 0.8);
    // lions: the male and a lioness resting at the den, another lioness pacing
    rest(Models.lion(false), -42, -5.5, 0.2);
    rest(Models.lion(true), -38.5, -6.5, -0.4);
    walk(Models.lion(true), [[-49, 4], [-33, 11], [-34, -2]], 1.0, 5, 2);
    // leopards (2): one up on the branch platform
    walk(Models.leopard(), [[-23, 0], [-11, -2], [-12, 9]], 1.2, 4, 0);
    const lp = Models.leopard(); rest(lp, -18.6, -4, HP); lp.position.y += 3.7;
    // black bears (3)
    walk(Models.bear(), [[12, -30], [26, -36], [24, -42], [14, -38]], 0.8, 5, 0);
    walk(Models.bear(), [[14, -33], [20, -31]], 0.5, 9, 4);
    stand(Models.bear(), 16, -40, 0.7);
    // zebras (4)
    walk(Models.zebra(), [[-50, 28], [-28, 30], [-30, 48]], 1.0, 4, 0);
    walk(Models.zebra(), [[-46, 40], [-34, 40]], 0.6, 8, 3);
    stand(Models.zebra(), -38, 29.4, Math.PI);
    stand(Models.zebra(), -48, 36, 0.4);
    // storks and egrets in the wetland
    [[-19, 34, 0.5], [-11, 44, 2], [-18, 44, -1]].forEach(([x, z, r]) => stand(Models.adjutant(), x, z, r));
    [[-12, 33, 1], [-20, 40, 2.5]].forEach(([x, z, r]) => stand(Models.egret(), x, z, r));
    // elephants: the tusker at its post and a calf ambling about
    const el = KT.skinify(Models.elephant(false, 21));
    deco(el, 24, 34, -2.4, 0, fauna);
    it.anim.push((t) => el.userData.animate && el.userData.animate(t, false));
    const calf = KT.skinify(Models.elephant(false, 9)); calf.scale.setScalar(0.55);
    walk(calf, [[34, 30], [48, 40], [40, 46]], 0.7, 6, 0);
    // orangutans: a mother carrying her baby, and another on the platform
    walk(Models.orangutan(true), [[12, 8], [24, 8], [24, -8], [12, -8]], 0.6, 6, 0);
    const og = stand(Models.orangutan(false), 22, -3, -2.2); og.position.y = 4.08;
    // lion-tailed macaques (4)
    walk(Models.lionTailedMacaque(), [[36, 4], [46, 6], [44, -4]], 0.9, 5, 0);
    walk(Models.lionTailedMacaque(), [[38, -6], [44, 2]], 0.7, 7, 4);
    const mq = stand(Models.lionTailedMacaque(), 40, 2, 0.6); mq.position.y = 1.4;
    stand(Models.lionTailedMacaque(), 46, -12, 2.2);
    // spotted deer: two stags and four does
    walk(Models.deer(), [[34, -30], [50, -36], [44, -48]], 0.9, 5, 0);
    walk(Models.deer(true), [[36, -44], [48, -44]], 0.7, 7, 3);
    walk(Models.deer(true), [[40, -28], [35, -36]], 0.6, 8, 6);
    stand(Models.deer(), 46, -30.5, Math.PI * 0.9);
    stand(Models.deer(true), 41, -33, 0.3);
    stand(Models.deer(true), 38, -48, 1.2);
    // monkeys on the lawns and walls, peacocks wandering
    [[-6, 18], [6.5, 30], [-55, -2], [54.5, 6]].forEach(([x, z], i) => stand(Models.monkey(), x, z, i * 2));
    [[-5, -30], [5, 36], [-40, 22]].forEach(([x, z], i) => stand(Models.peacock(), x, z, i * 1.7));
    zooVisitors(it, fauna);
    benchSitters(it, fauna, BENCHES);
    // only animate the animals (and visitors) when someone is near enough to see them
    it.fauna = fauna;
    // walls and enclosures stop the player; the gate's opening does not
    const C = [];
    const wall = (x0, z0, x1, z1) => C.push({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: Math.max(0.3, Math.abs(x1 - x0) / 2), hd: Math.max(0.3, Math.abs(z1 - z0) / 2) });
    wall(-Z, Z, -5.2, Z); wall(5.2, Z, Z, Z); wall(-Z, -Z, Z, -Z); wall(-Z, -Z, -Z, Z); wall(Z, -Z, Z, Z);
    Object.values(PENS).forEach(([x0, z0, x1, z1]) => C.push({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2 + 0.3, hd: (z1 - z0) / 2 + 0.3 }));
    gate.userData.colliders.forEach((c) => C.push({ type: 'box', x: c.x, z: Z + c.z, hw: c.hw, hd: c.hd }));
    root.userData.colliders = C;
    return root;
  }

  const BUILD = {
    gopuramTemple(it) {
      place(it, Models.gopuram(), 0, 10);
      // the Padmatheertham tank in front
      const stone = mat('tankStone', 0x9a8f80, 0.9);
      const y = it.y + 0.1;
      const tank = new T.Group();
      part(tank, G.box(18, 0.5, 11), stone, 0, 0.05, 0);
      const w = new T.Mesh(G.box(16, 0.1, 9), KT.Highway.waterMaterial());
      w.position.y = 0.32; tank.add(w);
      [[-1, 0], [1, 0]].forEach(([sd]) => part(tank, G.box(0.6, 0.9, 11), stone, sd * 9, 0.45, 0));
      [-1, 1].forEach((sd) => part(tank, G.box(18, 0.9, 0.6), stone, 0, 0.45, sd * 5.5));
      tank.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 9.2, hd: 5.8 }];
      place(it, tank, -16, -12, 0, { y });
      [-8, 8].forEach((x) => place(it, Models.lampTower(5), x, -22));
    },
    palace(it) {
      place(it, Models.heritageHall(it.sg.def.colors), 0, 4);
      [-12, 12].forEach((x) => place(it, Models.lampPost(), x, -10));
    },
    hillPalace(it) {
      place(it, Models.heritageHall([0xf3ead6, 0x6a4a32, 0xa2402a]), 0, 6);
      place(it, Models.garden(), 0, -14, 0, { colliders: false });
    },
    museum(it) {
      place(it, Models.heritageHall(it.sg.def.colors), 0, 4);
      [-10, 10].forEach((x) => place(it, Models.bench(), x, -10));
    },
    fortGate(it) { place(it, fortGate(), 0, 4); },
    clockTower(it) { place(it, clockTower(it), 0, 2); },
    secretariat(it) {
      place(it, secretariat(), 0, 6);
      [-20, 20].forEach((x) => place(it, Models.lampPost(), x, -9));
    },
    zoo(it) { const root = place(it, zoo(it), 0, 0); KT.Life.zoo(it, root); },
    mermaidBeach(it) {
      place(it, mermaid(), -10, 0, HP);
      place(it, Models.beachSet(6), 16, 6, 0, { colliders: false });
      [-26, 30].forEach((x, i) => place(it, Models.coconutPalm(40 + i), x, -16, i));
    },
    lakeVillage(it) {
      const root = place(it, akkulam(it), 0, 0);
      akkulamWalkways(it, root);
    },
    reservoir(it) {
      place(it, Models.earthDam(), 0, 8);
      const L = it.lake;
      waterOf(it, L);
      const tm = Models.temple(); tm.scale.setScalar(0.55);
      place(it, tm, -26, -6, 0, { colliders: false });
      place(it, Models.garden(), 24, -8, 0, { colliders: false });
    },
    waterfall(it) {
      const fall = place(it, Models.waterfall({ H: 26, w: 12, streams: 2, tiers: 2 }), 0, 10);
      it.anim.push(fall.userData.tick);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        place(it, Models.forestTree(k), Math.cos(a) * 24, 6 + Math.sin(a) * 18, a);
      }
    },
    hilltop(it) { if (KT.Highway.PONMUDI) ponmudi(it); else place(it, Models.hillView(), 0, 4); },
    islandTemple(it) {
      const L = it.lake, w = waterOf(it, L);
      const tm = Models.temple(); tm.scale.setScalar(0.5);
      place(it, tm, 0, 6, 0, { y: L.y + 1.3, colliders: false });
      [[-6, 2], [5, 4]].forEach(([x, z], i) => place(it, Models.coconutPalm(50 + i), x, z + 6, i, { y: L.y + 1.2, colliders: false }));
      for (let k = 0; k < 6; k++) place(it, Models.jettySection(), 0, -70 + 14 + k * 3, HP, { y: w.position.y + 0.3, colliders: false });
      [[-6, -40], [6, -36]].forEach(([x, z], i) => place(it, Models.canoe(), x, z, i, { y: w.position.y + Models.CANOE_FLOAT, colliders: false }));
    }
  };

  function build(it) {
    const Hw = KT.Highway;
    it.group = new T.Group();
    Hw.scene.add(it.group);
    infoBoard(it);
    (BUILD[it.sg.kind] || BUILD.palace)(it);
    if (it.river) riverWater(it);
    it.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    KT.Entities.indexPalms(it.group, Hw.palmIndex);
    it.built = true;
  }

  // ---------------------------------------------------------- streaming
  D.stream = function (pos, budget) {
    D.items.forEach((it) => {
      const d = Math.hypot(it.sg.x - pos.x, it.sg.z - pos.z);
      if (!it.built && d < 1100 && budget > 0) { build(it); budget--; }
      if (it.group) it.group.visible = d < 1300;
    });
    return budget;
  };
  D.update = function (dt, t, pos) {
    D.items.forEach((it) => {
      if (!it.group || !it.group.visible) return;
      it.flows.forEach((f) => { f.offset.y += dt * 0.9; });
      // (the zoo's animals are only drawn and moved within 260 m)
      if (it.fauna) {
        it.fauna.visible = !pos || Math.hypot(it.sg.x - pos.x, it.sg.z - pos.z) < 260;
        if (!it.fauna.visible) return;
      }
      it.anim.forEach((fn) => fn(t));
    });
  };
})();
