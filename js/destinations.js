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
      if (sg.within) return;            // (built as part of its host: Kuthiramalika by the temple tank)
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
        // the reservoir held up by the dam, in a basin of hills at its level
        const dx = sg.x + it.out.x * 8, dz = sg.z + it.out.z * 8;
        const R = Hw.damLandform(dx, dz, it.rot, it.y, { L: 35, crest: 8, Rx: 34, Rz: 34, Dz: 38 });
        it.lake = { x: sg.x + it.out.x * 46, z: sg.z + it.out.z * 46, r: 34, y: R.water, edge: 4 };
        pads.push({ x: sg.x, z: sg.z, r: 18, y: it.y });
      } else if (k === 'waterfall') {
        pads.push({ x: sg.x - it.out.x * 10, z: sg.z - it.out.z * 10, r: 14, y: it.y });
        // the plateau the river falls from
        Hw.gorgeLandform(sg.x + it.out.x * 10, sg.z + it.out.z * 10, it.rot, it.y, KT.FALLS.meenmutty);
      } else {
        // (the zoo compound is square: its corners need the extra room)
        // the Padmatheertham tank is sunk into the ground
        if (k === 'gopuramTemple') Hw.addLandform(sg.x, sg.z, it.rot, 150, (h, lx, lz) => (Math.abs(lx - TANK.x) < TANK.hx && Math.abs(lz - TANK.z) < TANK.hz ? it.y + TANK.floor : h));
        pads.push({ x: sg.x, z: sg.z, r: sg.r + (k === 'zoo' ? 14 : k === 'secretariat' ? 20 : k === 'gopuramTemple' ? 56 : 0), y: it.y + (k === 'hillPalace' ? 2.2 : 0), paved: k === 'zoo' || k === 'secretariat' || k === 'gopuramTemple' });
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

  // ------------------------------------- Sree Padmanabhaswamy Temple
  // The temple stands in its walled compound with the great east gopuram
  // (seven tiers of cream-gold carvings under a barrel roof with seven
  // golden kalasams, on a white base with a pillared, arched entrance and a
  // flight of steps). Inside, the long tiled roofs of the corridors and the
  // shrine. A street of four nadas runs round the compound; the East Nada,
  // lined with shops (lamps, brass, flowers, puja items, sweets, books),
  // leads in from the road. Beside it is the Padmatheertham tank in its own
  // walled compound, with ghat steps, a yellow-pillared mandapam at the
  // corner, a stone colonnade along one bank, and white Kerala houses with
  // tiled roofs along the others. Devotees in mundu and saree come and go.
  // (Model space: +z faces the road; the temple compound's front wall is at
  // z = 6, the road's lane arrives at z ~ 76.)
  const GP_FLOOR = 1.5, GP_STEPS = 6;            // the gopuram's raised floor and its steps
  const GP_Z = 4, GP_BD = 12;                   // the gopuram's centre (model z) and depth
  // the tank (model space): centre, half sizes of the rim, the stepped band and the water's depth
  const TANK = { x: -50, z: 59, hx: 28, hz: 21, band: 6, steps: 9, water: -2.3, floor: -5 };
  let gopuramTex = null;
  function gopuramCarving() {
    if (gopuramTex) return gopuramTex;
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#e9d7a4'; x.fillRect(0, 0, 256, 128);
    // a cornice band and a row of niches with figures
    x.fillStyle = '#c9b07a'; x.fillRect(0, 0, 256, 10); x.fillRect(0, 118, 256, 10);
    x.fillStyle = '#f6e9bf'; x.fillRect(0, 10, 256, 4); x.fillRect(0, 112, 256, 4);
    for (let k = 0; k < 8; k++) {
      const cx = 16 + k * 32;
      x.fillStyle = '#b89a62';
      x.beginPath(); x.moveTo(cx - 12, 108); x.lineTo(cx - 12, 38); x.arc(cx, 38, 12, Math.PI, 0); x.lineTo(cx + 12, 108); x.closePath(); x.fill();
      x.fillStyle = '#f2e3b4';
      x.beginPath(); x.arc(cx, 46, 5, 0, Math.PI * 2); x.fill();          // head
      x.fillRect(cx - 5, 52, 10, 26);                                      // body
      x.fillRect(cx - 4, 78, 3, 22); x.fillRect(cx + 1, 78, 3, 22);         // legs
      x.fillRect(cx - 9, 54, 4, 16); x.fillRect(cx + 5, 54, 4, 16);         // arms
      x.fillStyle = '#d6bf87'; x.beginPath(); x.moveTo(cx - 7, 41); x.lineTo(cx, 30); x.lineTo(cx + 7, 41); x.fill(); // crown
      x.fillStyle = '#d9c38e'; x.fillRect(cx + 14, 20, 4, 90);              // pilaster between
    }
    gopuramTex = new T.CanvasTexture(c);
    gopuramTex.encoding = T.sRGBEncoding; gopuramTex.wrapS = T.RepeatWrapping; gopuramTex.anisotropy = KT.maxAnisotropy;
    return gopuramTex;
  }
  function gopuramEast() {
    const g = new T.Group();
    const cream = mat('gpCream', 0xeedcae, 0.8), cream2 = mat('gpCream2', 0xd9c28c, 0.85), white = mat('gpWhite', 0xf2f0e8, 0.7);
    const gold = KT.mat('gpGold', { color: 0xd8a83a, metalness: 0.7, roughness: 0.3 }), dark = mat('gpDark', 0x2a2420, 0.7);
    const carve = new T.MeshStandardMaterial({ map: gopuramCarving(), roughness: 0.85 });
    // the white two-storey base, with a passage straight through it: a
    // white studded arch, carved granite pillars and an open porch in front,
    // the red-brown door leaves swung back, a flight of steps up to it
    const BW = 26, BD = 12, BH = 8.5, PW = 6, F = GP_FLOOR, AH = 6;
    const granite = mat('gpGranite', 0x7a6a58, 0.9), granite2 = mat('gpGranite2', 0x5f5246, 0.9), stepM = mat('gpStep', 0xb8a88a, 0.9);
    [-1, 1].forEach((sd) => {
      part(g, G.box((BW - PW) / 2, BH, BD), white, sd * (BW + PW) / 4, BH / 2, 0);
      // a red band and windows on the white walls, as in the photos
      part(g, G.box(0.5, 6, 0.1), mat('gpRed', 0xb8442a, 0.7), sd * 9.5, 3.4, BD / 2 + 0.06);
      part(g, G.box(3.4, 1.8, 0.1), dark, sd * 6.4, 5.2, BD / 2 + 0.06);
      part(g, G.box(0.25, BH, BD), granite2, sd * (PW / 2 + 0.12), BH / 2, 0);   // the passage's stone lining
    });
    part(g, G.box(PW, BH - F - AH, BD), white, 0, F + AH + (BH - F - AH) / 2, 0);
    part(g, G.box(PW, F, BD), stepM, 0, F / 2, 0);                                  // the passage floor
    for (let z = -BD / 2 + 1; z < BD / 2; z += 2) part(g, G.box(PW, 0.3, 0.4), granite2, 0, F + AH - 0.2, z);  // ceiling beams
    part(g, G.box(BW + 0.6, 0.6, BD + 0.6), cream2, 0, BH + 0.3, 0);
    // the arch: white with rows of brass studs, on a dark red ground
    [-1, 1].forEach((sd) => part(g, G.box(0.9, AH, 0.25), mat('gpArchRed', 0x7a2a1e, 0.7), sd * (PW / 2 + 0.75), F + AH / 2, BD / 2 + 0.05));
    part(g, G.torus(PW / 2, 0.45, 8, 24, Math.PI), white, 0, F + AH - PW / 2, BD / 2 + 0.2);
    [-1, 1].forEach((sd) => part(g, G.box(0.9, AH - PW / 2, 0.5), white, sd * PW / 2, F + (AH - PW / 2) / 2, BD / 2 + 0.2));
    for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; part(g, G.sph(0.08, 6, 4), gold, Math.cos(a) * PW / 2, F + AH - PW / 2 + Math.sin(a) * PW / 2, BD / 2 + 0.5); }
    // the door leaves, open against the passage walls
    [-1, 1].forEach((sd) => { part(g, G.box(0.15, AH - 0.4, PW / 2), mat('gpDoor', 0x6a2a1a, 0.6), sd * (PW / 2 - 0.2), F + (AH - 0.4) / 2, BD / 2 - PW / 4 - 0.2); });
    // the porch: carved granite pillars and a stone lintel with the carved panel above
    [-4.6, -3.4, 3.4, 4.6].forEach((px) => {
      part(g, G.box(0.9, 0.5, 0.9), granite, px, F + 0.25, BD / 2 + 1.8);
      for (let k = 0; k < 3; k++) { part(g, G.box(0.7, 1.1, 0.7), k % 2 ? granite2 : granite, px, F + 1.0 + k * 1.6, BD / 2 + 1.8); part(g, G.cyl(0.32, 0.32, 0.5, 8), granite, px, F + 1.8 + k * 1.6, BD / 2 + 1.8); }
      part(g, G.box(1.3, 0.35, 1.0), granite2, px, F + AH + 0.1, BD / 2 + 1.8);
    });
    part(g, G.box(11, 0.7, 3.6), granite2, 0, F + AH + 0.6, BD / 2 + 1.6);
    part(g, G.box(11.4, 0.2, 3.9), cream2, 0, F + AH + 1.0, BD / 2 + 1.6);
    part(g, G.box(9, 2.6, 0.5), carve, 0, BH + 2.0, BD / 2 + 0.2);
    part(g, G.box(PW + 4, F, 3.6), stepM, 0, F / 2, BD / 2 + 1.8);                  // the porch floor
    // the flight of steps up to the porch, and down again inside
    for (let k = 0; k < GP_STEPS; k++) part(g, G.box(16, F * (GP_STEPS - k) / GP_STEPS, 0.6), stepM, 0, F * (GP_STEPS - k) / GP_STEPS / 2, BD / 2 + 3.6 + k * 0.6 + 0.3);
    for (let k = 0; k < GP_STEPS; k++) part(g, G.box(PW, F * (GP_STEPS - k) / GP_STEPS, 0.6), stepM, 0, F * (GP_STEPS - k) / GP_STEPS / 2, -BD / 2 - k * 0.6 - 0.3);
    // seven tiers, each narrower, the faces carved, a column of openings up the middle
    let y = BH + 0.6, w = BW - 1, d = BD - 1.2;
    const TH = 3.4;
    for (let k = 0; k < 7; k++) {
      part(g, G.box(w, TH, d), cream, 0, y + TH / 2, 0);
      const face = new T.PlaneGeometry(w, TH - 0.2);
      const uv = face.attributes.uv; for (let n = 0; n < uv.count; n++) uv.setX(n, uv.getX(n) * Math.max(1, Math.round(w / 3)));
      [1, -1].forEach((sd) => { const m = new T.Mesh(face, carve); m.position.set(0, y + TH / 2, sd * (d / 2 + 0.02)); m.rotation.y = sd > 0 ? 0 : Math.PI; g.add(m); });
      const side = new T.PlaneGeometry(d, TH - 0.2);
      const uv2 = side.attributes.uv; for (let n = 0; n < uv2.count; n++) uv2.setX(n, uv2.getX(n) * Math.max(1, Math.round(d / 3)));
      [1, -1].forEach((sd) => { const m = new T.Mesh(side, carve); m.position.set(sd * (w / 2 + 0.02), y + TH / 2, 0); m.rotation.y = sd * HP; g.add(m); });
      part(g, G.box(w + 0.5, 0.35, d + 0.5), cream2, 0, y + TH, 0);
      part(g, G.box(1.0, 1.6, 0.2), dark, 0, y + TH / 2 + 0.2, d / 2 + 0.06);
      // little kudu (horseshoe) gables along the cornice
      for (let n = 0; n < Math.round(w / 4); n++) part(g, G.cyl(0.5, 0.5, 0.25, 10, 1, false, 0, Math.PI), cream2, -w / 2 + 2 + n * 4, y + TH + 0.35, d / 2 + 0.2, HP, 0, -HP);
      y += TH + 0.35;
      w *= 0.9; d *= 0.9;
    }
    // the barrel roof with its curled ends and the seven golden kalasams
    part(g, new T.CylinderGeometry(d / 2 + 0.6, d / 2 + 0.6, w + 0.6, 20, 1, false, 0, Math.PI), cream, 0, y + 0.2, 0, 0, 0, HP);
    [-1, 1].forEach((sd) => {
      part(g, G.torus(1.3, 0.5, 8, 14, Math.PI * 1.4), cream, sd * (w / 2 + 0.6), y + 1.2, 0, 0, HP, sd > 0 ? 0 : Math.PI);
      part(g, G.box(0.4, 2.4, 0.4), cream2, sd * (w / 2 + 0.9), y + 0.6, d / 2);
    });
    for (let k = 0; k < 7; k++) {
      const kx = -w / 2 + 1 + (k * (w - 2)) / 6;
      part(g, G.cyl(0.3, 0.45, 0.5, 12), gold, kx, y + d / 2 + 0.9, 0);
      part(g, G.sph(0.45, 12, 10), gold, kx, y + d / 2 + 1.4, 0);
      part(g, G.cone(0.22, 1.0, 10), gold, kx, y + d / 2 + 2.2, 0);
    }
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: -(BW + PW) / 4, z: 0, hw: (BW - PW) / 4, hd: BD / 2 }, { type: 'box', x: (BW + PW) / 4, z: 0, hw: (BW - PW) / 4, hd: BD / 2 }].concat([-4.6, -3.4, 3.4, 4.6].map((px) => ({ type: 'circle', x: px, z: BD / 2 + 1.8, r: 0.45 })));
    baked.userData.height = y + d / 2 + 2.7;
    return baked;
  }
  // a row of small temple-street shops: one tiled roof over open fronts
  const STREET_STOCK = [[0xd4a434, 'Brass lamps'], [0xf28c1a, 'Flowers'], [0xd8203a, 'Puja items'], [0x6b3fa0, 'Books'], [0xe8c26a, 'Sweets'], [0x2a9d8f, 'Bangles']];
  function shopRow(n, seed) {
    const g = new T.Group(), rng = KT.makeRng(seed);
    const W = 4.2, D = 4.4, H = 3.2;
    const wall = mat('tsWall', 0xf1ebdc, 0.85), roofM = mat('tsRoof', 0x8e3b24, 0.7), wood = mat('tsWood', 0x6a4426, 0.8), shutter = mat('tsShutter', 0x7c8288, 0.5);
    part(g, G.box(n * W, H, D), wall, 0, H / 2, 0);
    part(g, G.box(n * W + 0.4, 0.3, D + 2.6), mat('tsFloor', 0xb9b2a4, 0.9), 0, 0.15, 1.1);
    part(g, KT.gableRoofGeometry ? KT.gableRoofGeometry(n * W + 0.6, D + 2.6, 1.6) : G.box(n * W, 1, D), roofM, 0, H, 0.6);
    for (let k = 0; k < n; k++) {
      const x = -n * W / 2 + W / 2 + k * W;
      const [col] = STREET_STOCK[Math.floor(rng() * STREET_STOCK.length)];
      part(g, G.box(W - 0.6, H - 0.7, 0.1), mat('tsInside', 0x4a3a2c, 0.9), x, (H - 0.7) / 2 + 0.3, D / 2 + 0.01);
      part(g, G.box(W - 0.8, 0.9, 0.7), wood, x, 0.75, D / 2 + 0.6);                       // counter
      for (let i = 0; i < 6; i++) part(g, G.box(0.4, 0.3, 0.3), mat('tsStock' + col.toString(16), col, 0.6), x - 1.2 + (i % 3) * 0.9, 1.35 + Math.floor(i / 3) * 0.35, D / 2 + 0.5);
      part(g, G.box(W - 0.6, 0.6, 0.06), mat('tsSign' + (k % 3), [0x2c5fa8, 0xd8203a, 0x2f6b3a][(k + seed) % 3], 0.6), x, H - 0.2, D / 2 + 0.05);
      part(g, G.box(0.12, H - 0.2, 0.12), wood, x - W / 2 + 0.1, (H - 0.2) / 2, D / 2 + 2.3);
      if (k % 3 === 2) part(g, G.cyl(0.16, 0.16, W - 0.8, 10), shutter, x, H - 0.55, D / 2 + 0.1, 0, 0, HP);
      // garlands of jasmine and marigold hanging at the flower stalls
      if (col === 0xf28c1a) for (let i = 0; i < 5; i++) part(g, G.cyl(0.07, 0.07, 1.4, 6), mat(i % 2 ? 'tsJasmine' : 'tsMarigold', i % 2 ? 0xfafaf2 : 0xf28c1a, 0.8), x - 1.2 + i * 0.6, 2.0, D / 2 + 1.0);
    }
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: n * W / 2, hd: D / 2 + 0.2 }];
    return baked;
  }
  // ------------------------------------------------ Kuthiramalika Palace
  // "The mansion of horses" (1840s), beside the temple tank: a long
  // two-storey palace in the Kerala style, white below with a verandah of
  // wooden pillars, dark carved wooden screens and windows above, steep
  // tiled roofs with gables, a taller block in the middle, and the row of
  // 122 carved wooden horses under its eaves that give it its name.
  // (Model space: facing +z; 50 m long, about 10 m deep.)
  let latticeTex = null;
  function lattice() {
    if (latticeTex) return latticeTex;
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#3a2212'; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = '#6a4224'; x.lineWidth = 3;
    for (let k = -64; k < 128; k += 10) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 64, 64); x.stroke(); x.beginPath(); x.moveTo(k + 64, 0); x.lineTo(k, 64); x.stroke(); }
    x.strokeStyle = '#7a5230'; x.lineWidth = 5; x.strokeRect(2, 2, 60, 60);
    latticeTex = new T.CanvasTexture(c); latticeTex.encoding = T.sRGBEncoding; latticeTex.wrapS = latticeTex.wrapT = T.RepeatWrapping;
    return latticeTex;
  }
  function kuthiramalika() {
    const g = new T.Group();
    const white = mat('kmWhite', 0xf1ece0, 0.85), wood = mat('kmWood', 0x4a2c1a, 0.7), wood2 = mat('kmWood2', 0x6a4226, 0.75), roofM = mat('kmRoof', 0x8a3a24, 0.7), plinth = mat('kmPlinth', 0x8a7a68, 0.9);
    const latM = new T.MeshStandardMaterial({ map: lattice(), roughness: 0.8 });
    const L = 50, D = 10, H1 = 3.6, H2 = 3.4;
    part(g, G.box(L + 1, 0.6, D + 3), plinth, 0, 0.3, 0.8);
    part(g, G.box(L, H1, D), white, 0, 0.6 + H1 / 2, -0.5);
    // the ground-floor verandah: wooden pillars under a tiled lean-to roof
    for (let x = -L / 2 + 1; x <= L / 2 - 1; x += 2.5) { part(g, G.box(0.28, H1, 0.28), wood, x, 0.6 + H1 / 2, D / 2 + 1.2); part(g, G.box(0.5, 0.25, 0.5), wood2, x, 0.6 + H1 - 0.1, D / 2 + 1.2); }
    part(g, G.box(L, 0.3, 0.4), wood, 0, 0.6 + H1, D / 2 + 1.2);
    part(g, G.box(L + 0.4, 0.18, 2.6), roofM, 0, 0.6 + H1 + 0.3, D / 2 + 0.6, -0.3, 0, 0);
    for (let x = -L / 2 + 2; x < L / 2 - 1; x += 5) part(g, G.box(1.4, 2.4, 0.1), wood2, x + 1.2, 0.6 + 1.2, D / 2 - 0.45);   // doors
    // the upper floor: carved wooden screens all along the front
    const y2 = 0.6 + H1 + 0.6;
    part(g, G.box(L, H2, D - 1), white, 0, y2 + H2 / 2, -0.8);
    const scr = new T.PlaneGeometry(L - 0.4, H2 - 0.6);
    const uv = scr.attributes.uv; for (let n = 0; n < uv.count; n++) { uv.setX(n, uv.getX(n) * 24); uv.setY(n, uv.getY(n) * 2); }
    const sm = new T.Mesh(scr, latM); sm.position.set(0, y2 + H2 / 2, D / 2 - 1.25); g.add(sm);
    for (let x = -L / 2; x <= L / 2; x += 2.5) part(g, G.box(0.22, H2, 0.3), wood, x, y2 + H2 / 2, D / 2 - 1.2);
    part(g, G.box(L + 0.4, 0.3, 0.6), wood, 0, y2 + 0.1, D / 2 - 1.1);
    // the horses: carved wooden horses' heads and forelegs leaping out under the eaves
    for (let x = -L / 2 + 0.6; x <= L / 2 - 0.6; x += 0.82) {
      const hy = y2 + H2 - 0.2, hz = D / 2 - 0.7;
      part(g, G.box(0.16, 0.34, 0.75), wood2, x, hy - 0.1, hz + 0.35, 0.45, 0, 0);          // neck and body
      part(g, G.box(0.14, 0.2, 0.38), wood2, x, hy + 0.08, hz + 0.8, -0.3, 0, 0);            // head
      part(g, G.box(0.06, 0.32, 0.06), wood, x - 0.05, hy - 0.38, hz + 0.6, -0.6, 0, 0);      // forelegs
      part(g, G.box(0.06, 0.32, 0.06), wood, x + 0.05, hy - 0.38, hz + 0.55, -0.4, 0, 0);
    }
    // the steep main roof and the taller middle block with its own gabled roof
    part(g, KT.hipRoofGeometry(L + 2, D + 2, 4.2, 0.3), roofM, 0, y2 + H2, -0.8);
    part(g, G.box(10, 3.2, 8), white, 0, y2 + H2 + 2.6, -0.8);
    const msc = new T.PlaneGeometry(9.4, 2.4); const mu = msc.attributes.uv; for (let n = 0; n < mu.count; n++) mu.setX(n, mu.getX(n) * 5);
    const mm = new T.Mesh(msc, latM); mm.position.set(0, y2 + H2 + 2.6, 3.22); g.add(mm);
    part(g, KT.hipRoofGeometry(12, 10, 3.6, 0.3), roofM, 0, y2 + H2 + 4.2, -0.8);
    // gable fronts (mukhappu) on the main roof, with their finials
    [-16, 16, 0].forEach((x, k) => {
      const gy = k === 2 ? y2 + H2 + 5.4 : y2 + H2 + 1.6, gz = k === 2 ? 3.3 : D / 2 - 0.4;
      const sh = new T.Shape(); sh.moveTo(-2.2, 0); sh.lineTo(2.2, 0); sh.lineTo(0, 2.0); sh.lineTo(-2.2, 0);
      const ge = new T.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false });
      part(g, ge, latM, x, gy, gz);
      part(g, G.cone(0.14, 0.7, 6), KT.mat('kmFinial', { color: 0xc89a3a, metalness: 0.6, roughness: 0.35 }), x, gy + 2.3, gz + 0.1);
    });
    // steps down to the tank deck in front
    for (let k = 0; k < 3; k++) part(g, G.box(4, 0.2, 0.5), plinth, 0, 0.5 - k * 0.2, D / 2 + 2.5 + k * 0.5);
    return KT.bake(g);
  }
  const DEVOTEES = [['male', 'mundu'], ['female', 'saree'], ['male', 'mundu'], ['female', 'saree'], ['female', 'churidar'], ['male', 'mundu'], ['male', 'casual'], ['female', 'saree']];
  function devotees(it, parent, routes, seed) {
    const rng = KT.makeRng(seed);
    let n = 0;
    routes.forEach((pts) => {
      const speed = 0.8 + rng() * 0.4, legs = [];
      let T0 = 0;
      for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / speed; legs.push({ a: pts[i], b: pts[i + 1], t0: T0, t1: T0 + d }); T0 += d; legs.push({ a: pts[i + 1], b: pts[i + 1], t0: T0, t1: T0 + 2 + rng() * 6, stop: true }); T0 = legs[legs.length - 1].t1; }
      const people = 1 + Math.floor(rng() * 2.4), start = rng() * T0;
      for (let k = 0; k < people; k++) {
        const look = DEVOTEES[(n * 3 + seed) % DEVOTEES.length], female = look[0] === 'female', kid = k === 2;
        const ch = Models.character({ gender: look[0], outfit: kid ? 'casual' : look[1], lite: true, hair: female ? ['bun', 'braid', 'default', 'loose'][n % 4] : ['short', 'default', 'wavy'][n % 3],
          skin: [0xc08660, 0xd9a27c, 0x8d5a3b, 0xa8704c][n % 4], jasmine: female && rng() < 0.6, mustache: !female && rng() < 0.6,
          colors: look[1] === 'mundu' ? { top: rng() < 0.6 ? 0xf3efe6 : 0xe8c26a } : undefined, acc: {}, carry: female && rng() < 0.3 ? 'handbag' : null, scale: kid ? 0.7 : 0.92 + rng() * 0.1, seed: 1300 + n });
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
          if (L.stop) { KT.Models.animateCharacter(ch, Math.sin(t * 0.7 + n) > 0.4 ? 'namaskaram' : 'idle', dt, 1); return; }
          const dx = L.b[0] - L.a[0], dz = L.b[1] - L.a[1], len = Math.hypot(dx, dz) || 1;
          ch.position.set(L.a[0] + dx * q + (dz / len) * side, 0, L.a[1] + dz * q - (dx / len) * side);
          ch.rotation.y = KT.angleLerp(ch.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
          KT.Models.animateCharacter(ch, 'walk', dt, speed / 1.1);
        });
      }
    });
  }
  function padmanabhaTemple(it) {
    const root = new T.Group(), g = new T.Group(), top = new T.Group(), people = new T.Group();
    root.add(people);
    const white = mat('ptWall', 0xf1ede2, 0.85), lat = mat('ptLaterite', 0xa4553a, 0.95), roofM = mat('ptRoof', 0x8e3b24, 0.7), roofOld = mat('ptRoofOld', 0x7a4a3a, 0.8);
    const road = mat('ptStreet', 0x6a6560, 0.9), pave = mat('ptPave', 0xb9b2a4, 0.9), stone = mat('ptStone', 0x9a8f80, 0.9), sandM = mat('ptSand', 0xd8c4a0, 1);
    const C = [];
    const box = (x, z, hw, hd) => C.push({ type: 'box', x, z, hw, hd });
    // ---- the temple compound: wall with tiled coping, the gopuram in front
    const TX0 = -34, TX1 = 34, TZ0 = -66, TZ1 = 6;
    part(g, G.box(TX1 - TX0, 0.08, TZ1 - TZ0), sandM, 0, 0.04, (TZ0 + TZ1) / 2);
    const tWall = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0) + HP, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      part(g, G.box(len, 4, 1), white, cx, 2, cz, 0, ang, 0);
      part(g, G.box(len, 0.25, 1.6), roofM, cx, 4.2, cz, 0, ang, 0);
      part(g, G.box(len, 0.6, 1.1), lat, cx, 0.3, cz, 0, ang, 0);
      C.push({ type: 'box', x: cx, z: cz, hw: Math.max(0.6, Math.abs(x1 - x0) / 2), hd: Math.max(0.6, Math.abs(z1 - z0) / 2) });
    };
    tWall(TX0, TZ0, TX1, TZ0); tWall(TX0, TZ0, TX0, TZ1); tWall(TX1, TZ0, TX1, TZ1);
    tWall(TX0, TZ1, -13, TZ1); tWall(13, TZ1, TX1, TZ1);
    // ---- inside: the sreebali pura, a long corridor of carved granite pillars
    // (many with a lamp-bearing deepalakshmi) round the inner courtyard, under
    // a stone ceiling and tiled roofs, with brass lamps hanging along it; the
    // golden flagstaff before it; and in the courtyard the sanctum with its
    // single-stone mandapam in front
    const granite = mat('ptGranite', 0x7a6a58, 0.9), granite2 = mat('ptGranite2', 0x5f5246, 0.9), floorM = mat('ptFloor', 0x8a8076, 0.6);
    const gold = KT.mat('ptGold', { color: 0xd8a83a, metalness: 0.7, roughness: 0.3 }), flame = KT.mat('ptFlame', { color: 0xffd27a, emissive: 0xffa020, emissiveIntensity: 1.2 });
    const lady = mat('ptLady', 0x6e5c48, 0.85);
    const pillar = (x, z, h, statue, face) => {
      part(g, G.box(0.9, 0.5, 0.9), granite2, x, CF + 0.25, z);
      part(g, G.box(0.68, 1.0, 0.68), granite, x, CF + 1.0, z);
      part(g, G.cyl(0.34, 0.34, 0.8, 8), granite2, x, CF + 1.9, z);
      part(g, G.box(0.68, 0.9, 0.68), granite, x, CF + 2.75, z);
      part(g, G.cyl(0.3, 0.34, h - 3.9, 8), granite2, x, CF + 3.2 + (h - 3.9) / 2, z);
      part(g, G.box(1.3, 0.35, 0.6), granite, x, CF + h - 0.2, z);
      part(g, G.box(0.6, 0.35, 1.3), granite, x, CF + h - 0.2, z);
      if (statue) {
        // a deepalakshmi: a woman holding a lamp, carved on the pillar's face
        const fx = x + Math.sin(face) * 0.5, fz = z + Math.cos(face) * 0.5;
        part(g, G.box(0.6, 0.3, 0.6), granite, fx, CF + 0.65, fz);
        part(g, G.cyl(0.16, 0.24, 1.0, 8), lady, fx, CF + 1.3, fz);
        part(g, G.cyl(0.13, 0.16, 0.5, 8), lady, fx, CF + 2.0, fz);
        part(g, G.sph(0.13, 8, 6), lady, fx, CF + 2.4, fz);
        part(g, G.cone(0.1, 0.25, 6), lady, fx, CF + 2.6, fz);
        part(g, G.cyl(0.14, 0.08, 0.06, 10), gold, fx + Math.sin(face) * 0.18, CF + 1.95, fz + Math.cos(face) * 0.18);
        part(g, G.cone(0.04, 0.12, 6), flame, fx + Math.sin(face) * 0.18, CF + 2.05, fz + Math.cos(face) * 0.18);
      }
      C.push({ type: 'circle', x, z, r: 0.45 });
    };
    const CF = 0.15, CH = 5.2;                            // corridor floor and pillar height
    const OX = 26, IX = 20, OZ0 = -62, OZ1 = -12, IZ0 = -56, IZ1 = -18;
    // the corridor's floor, ceiling and roofs, side by side
    [[0, (OZ0 + IZ0) / 2, 2 * OX, IZ0 - OZ0], [0, (OZ1 + IZ1) / 2, 2 * OX, OZ1 - IZ1], [-(OX + IX) / 2, (IZ0 + IZ1) / 2, OX - IX, IZ1 - IZ0], [(OX + IX) / 2, (IZ0 + IZ1) / 2, OX - IX, IZ1 - IZ0]].forEach(([x, z, w, d]) => {
      part(g, G.box(w, CF * 2, d), floorM, x, CF / 2, z);
      part(g, G.box(w, 0.45, d), granite2, x, CF + CH + 0.22, z);
      part(g, KT.hipRoofGeometry(w + 1.4, d + 1.4, 2.0, 0.25), roofM, x, CF + CH + 0.45, z);
    });
    for (let x = -OX + 0.5; x <= OX - 0.5; x += 2.9) [[OZ0 + 0.5, 0], [OZ1 - 0.5, Math.PI], [IZ0 - 0.5, Math.PI], [IZ1 + 0.5, 0]].forEach(([z, f], r) => {
      if ((r >= 2) && Math.abs(x) > IX) return;
      if (r === 1 && Math.abs(x) < 3) return;                 // the way in from the gopuram
      if (r === 3 && Math.abs(x) < 3) return;                 // and out into the courtyard
      pillar(x, z, CH, r >= 2 && Math.round(x / 2.9) % 2 === 0, r >= 2 ? (r === 2 ? Math.PI : 0) : f);
    });
    for (let z = OZ0 + 3.4; z <= OZ1 - 3.4; z += 2.9) [-1, 1].forEach((sd) => {
      pillar(sd * (OX - 0.5), z, CH, false, 0);
      if (z > IZ0 && z < IZ1) pillar(sd * (IX + 0.5), z, CH, Math.round(z / 2.9) % 2 === 0, sd > 0 ? -HP : HP);
    });
    // brass lamps hanging along the corridor
    const lamps = [];
    for (let x = -OX + 3; x <= OX - 3; x += 6) lamps.push([x, (OZ0 + IZ0) / 2], [x, (OZ1 + IZ1) / 2]);
    for (let z = IZ0 + 3; z <= IZ1 - 3; z += 6) lamps.push([-(OX + IX) / 2, z], [(OX + IX) / 2, z]);
    lamps.forEach(([x, z]) => { part(g, G.cyl(0.02, 0.02, 1.6, 4), gold, x, CF + CH - 0.8, z); part(g, G.cyl(0.25, 0.12, 0.15, 10), gold, x, CF + CH - 1.65, z); for (let k = 0; k < 5; k++) part(g, G.cone(0.035, 0.1, 5), flame, x + Math.cos(k * 1.26) * 0.2, CF + CH - 1.52, z + Math.sin(k * 1.26) * 0.2); });
    // the golden flagstaff and the stone altar (balikkal) before the corridor
    part(g, G.box(2.2, 1.0, 2.2), granite, 0, 0.5, -7.5);
    part(g, G.cyl(0.28, 0.48, 20, 10), gold, 0, 11, -7.5);
    for (let k = 0; k < 10; k++) part(g, G.cyl(0.5, 0.5, 0.12, 10), gold, 0, 2 + k * 1.8, -7.5);
    part(g, G.box(1.6, 0.12, 0.6), gold, 0, 20.8, -7.5);
    part(g, G.cyl(0.9, 1.1, 0.8, 12), granite, 5, 0.4, -9.5);
    C.push({ type: 'box', x: 0, z: -7.5, hw: 1.1, hd: 1.1 });
    // the sanctum (sreekovil): granite walls on a plinth, three doors in front
    // through which the reclining Padmanabha is seen, a golden two-tier roof
    const SZ0 = -50, SZ1 = -34, SX = 9, SP = 1.0, SH = 5.2;
    part(g, G.box(2 * SX + 1, SP, SZ1 - SZ0 + 1), granite2, 0, SP / 2, (SZ0 + SZ1) / 2);
    part(g, G.box(2 * SX, 0.3, 0.4), granite, 0, SP + 0.15, SZ1 + 0.3);
    part(g, G.box(2 * SX, SH, 0.5), granite, 0, SP + SH / 2, SZ0 + 0.25);
    [-1, 1].forEach((sd) => part(g, G.box(0.5, SH, SZ1 - SZ0), granite, sd * (SX - 0.25), SP + SH / 2, (SZ0 + SZ1) / 2));
    // the front wall, with three doorways (face, navel, feet)
    const DW = 2.6, DH = 3.6, doors = [-5.4, 0, 5.4];
    let x0 = -SX;
    doors.concat([SX + DW / 2]).forEach((dx, k) => {
      const x1 = k < 3 ? dx - DW / 2 : SX;
      part(g, G.box(x1 - x0, SH, 0.5), granite, (x0 + x1) / 2, SP + SH / 2, SZ1 - 0.25);
      if (k < 3) {
        part(g, G.box(DW, SH - DH, 0.5), granite, dx, SP + DH + (SH - DH) / 2, SZ1 - 0.25);
        part(g, G.box(DW + 0.6, 0.3, 0.6), gold, dx, SP + DH + 0.15, SZ1 - 0.1);
        [-1, 1].forEach((s2) => part(g, G.box(0.2, DH, 0.6), gold, dx + s2 * (DW / 2 + 0.1), SP + DH / 2, SZ1 - 0.1));
      }
      x0 = dx + DW / 2;
    });
    // carved bands round the outside of the walls (the front one above the doors)
    for (let k = 0; k < 3; k++) {
      const y = SP + 1.4 + k * 1.4;
      part(g, G.box(2 * SX + 0.4, 0.25, 0.3), granite2, 0, y, SZ0 - 0.1);
      [-1, 1].forEach((sd) => part(g, G.box(0.3, 0.25, SZ1 - SZ0 + 0.4), granite2, sd * (SX + 0.1), y, (SZ0 + SZ1) / 2));
    }
    part(g, G.box(2 * SX + 0.4, 0.3, 0.3), granite2, 0, SP + DH + 0.9, SZ1 + 0.1);
    part(g, G.box(2 * SX - 1, 0.1, SZ1 - SZ0 - 1), mat('ptSanctumFloor', 0x3a3230, 0.7), 0, SP + 0.05, (SZ0 + SZ1) / 2);
    part(g, G.box(2 * SX + 0.8, 0.5, SZ1 - SZ0 + 0.8), granite2, 0, SP + SH + 0.25, (SZ0 + SZ1) / 2);
    part(g, KT.hipRoofGeometry(2 * SX + 3, SZ1 - SZ0 + 3, 3.2, 0.3), gold, 0, SP + SH + 0.5, (SZ0 + SZ1) / 2);
    part(g, KT.hipRoofGeometry(2 * SX - 4, SZ1 - SZ0 - 5, 2.6, 0.3), gold, 0, SP + SH + 3.1, (SZ0 + SZ1) / 2);
    [-4, 0, 4].forEach((x) => { part(g, G.sph(0.4, 10, 8), gold, x, SP + SH + 6.0, (SZ0 + SZ1) / 2); part(g, G.cone(0.2, 0.9, 8), gold, x, SP + SH + 6.6, (SZ0 + SZ1) / 2); });
    C.push({ type: 'box', x: 0, z: (SZ0 + SZ1) / 2 - 0.5, hw: SX + 0.5, hd: (SZ1 - SZ0) / 2 + 0.2 });
    // the reclining Padmanabha on the coiled serpent Anantha, the five hoods
    // over his head, the lotus rising from his navel with Brahma on it
    const DZ = (SZ0 + SZ1) / 2 + 1, DY = SP + 0.1;
    const serpent = mat('ptAnantha', 0x5a6266, 0.6), skin = mat('ptVishnu', 0x24304a, 0.45), lotusM = mat('ptLotus', 0xf08aa8, 0.6);
    [0, 0.55, 1.1].forEach((y, k) => part(g, G.torus(1.25 - k * 0.1, 0.32, 8, 28), serpent, 0, DY + 0.3 + y, DZ, HP, 0, 0, 5.4 - k * 0.3, 1, 1));
    part(g, G.box(12.6, 0.4, 2.2), serpent, 0, DY + 1.55, DZ);
    for (let k = 0; k < 5; k++) { const a = -0.9 + k * 0.45; part(g, G.sph(0.55, 10, 8), serpent, -6.4 + Math.sin(a) * 1.0, DY + 3.6 + Math.cos(a) * 0.8, DZ - 0.3, 0, 0, 0, 1, 0.6, 0.35); part(g, G.sph(0.08, 6, 4), gold, -6.4 + Math.sin(a) * 1.0, DY + 3.6 + Math.cos(a) * 0.8, DZ + 0.0); }
    part(g, G.cyl(0.35, 0.45, 2.6, 10), serpent, -6.6, DY + 2.5, DZ - 0.6);
    // the god: head (crowned) to the south, raised on the left arm; the body
    // and legs along the serpent; golden ornaments
    part(g, G.sph(0.55, 12, 10), skin, -5.6, DY + 2.5, DZ + 0.1);
    part(g, G.cyl(0.38, 0.5, 1.1, 10), gold, -5.7, DY + 3.2, DZ + 0.1);
    part(g, G.capsule(0.75, 3.6, 6, 12), skin, -2.6, DY + 2.2, DZ + 0.15, 0, 0, HP - 0.06);
    part(g, G.capsule(0.5, 4.6, 6, 10), skin, 2.8, DY + 2.05, DZ + 0.3, 0, 0, HP);
    part(g, G.capsule(0.45, 4.4, 6, 10), skin, 2.9, DY + 2.0, DZ - 0.4, 0, 0, HP + 0.04);
    part(g, G.capsule(0.3, 1.6, 6, 8), skin, -4.4, DY + 2.9, DZ + 0.9, 0.3, 0, 0.5);
    part(g, G.capsule(0.28, 2.0, 6, 8), skin, -1.2, DY + 2.9, DZ + 0.9, 0, 0, HP);
    part(g, G.box(4.6, 0.25, 1.7), gold, -1.6, DY + 2.95, DZ + 0.15);   // the golden waistband
    [-3.6, -0.4].forEach((x) => part(g, G.torus(0.6, 0.06, 6, 16), gold, x, DY + 2.95, DZ + 0.15, HP, 0, 0));
    part(g, G.cyl(0.04, 0.04, 2.4, 5), mat('ptStalk', 0x3f7a32, 0.8), -1.6, DY + 4.3, DZ + 0.4);
    for (let k = 0; k < 8; k++) part(g, G.cone(0.2, 0.55, 6), lotusM, -1.6 + Math.cos(k * 0.785) * 0.22, DY + 5.6, DZ + 0.4 + Math.sin(k * 0.785) * 0.22, Math.sin(k * 0.785) * 0.6, 0, -Math.cos(k * 0.785) * 0.6);
    part(g, G.sph(0.2, 8, 6), gold, -1.6, DY + 5.95, DZ + 0.4);
    // tall brass oil lamps (nilavilakku) burning before the god
    [-6, -2, 2, 6].forEach((x) => { part(g, G.cyl(0.25, 0.35, 0.12, 10), gold, x, SP + 0.1, SZ1 - 1.3); part(g, G.cyl(0.06, 0.06, 1.4, 6), gold, x, SP + 0.8, SZ1 - 1.3); part(g, G.cyl(0.3, 0.18, 0.12, 10), gold, x, SP + 1.5, SZ1 - 1.3); for (let k = 0; k < 5; k++) part(g, G.cone(0.04, 0.14, 5), flame, x + Math.cos(k * 1.26) * 0.24, SP + 1.62, SZ1 - 1.3 + Math.sin(k * 1.26) * 0.24); });
    // the ottakkal mandapam: a platform of one great stone before the doors,
    // on four pillars under a stone roof, with steps up from the courtyard
    const MZ0 = SZ1, MZ1 = SZ1 + 6;
    part(g, G.box(13, SP, MZ1 - MZ0), granite2, 0, SP / 2, (MZ0 + MZ1) / 2);
    [[-6, MZ0 + 0.6], [6, MZ0 + 0.6], [-6, MZ1 - 0.6], [6, MZ1 - 0.6]].forEach(([x, z]) => { part(g, G.box(0.7, 4.2, 0.7), granite, x, SP + 2.1, z); C.push({ type: 'circle', x, z, r: 0.45 }); });
    part(g, G.box(14, 0.5, MZ1 - MZ0 + 1), granite2, 0, SP + 4.4, (MZ0 + MZ1) / 2);
    part(g, KT.hipRoofGeometry(14.6, MZ1 - MZ0 + 1.6, 1.6, 0.2), gold, 0, SP + 4.65, (MZ0 + MZ1) / 2);
    for (let k = 0; k < 4; k++) part(g, G.box(5, SP * (4 - k) / 4, 0.5), granite, 0, SP * (4 - k) / 4 / 2, MZ1 + 0.25 + k * 0.5);
    root.userData.inner = { CF, OX, IX, OZ0, OZ1, IZ0, IZ1, SP, MZ0, MZ1 };
    // the east gopuram in the front wall
    const gp = gopuramEast();
    gp.position.set(0, 0, GP_Z); root.add(gp);
    gp.userData.colliders.forEach((c) => C.push(Object.assign({}, c, { z: c.z + GP_Z })));
    // ---- the streets: a ring round the compound and the East Nada to the road
    const RW = 8, FZ = 26;            // ring street width; the front street's centre z
    part(g, G.box(TX1 - TX0 + 2 * RW + 4, 0.1, RW), road, 0, 0.05, FZ);
    [-1, 1].forEach((sd) => part(g, G.box(RW, 0.1, FZ - TZ0 + RW), road, sd * (TX1 + RW / 2 + 2), 0.05, (FZ + TZ0 - RW) / 2));
    part(g, G.box(TX1 - TX0 + 2 * RW + 4, 0.1, RW), road, 0, 0.05, TZ0 - RW / 2 - 2);
    part(g, G.box(30, 0.12, FZ - RW / 2 - TZ1 + 6), pave, 0, 0.06, (TZ1 + FZ - RW / 2) / 2 + 3);   // the forecourt before the steps
    part(g, G.box(10, 0.1, 80 - FZ), road, 0, 0.05, (FZ + 80) / 2);                                 // East Nada
    // shops along both sides of the East Nada, and along the front street
    [[-1, 36, 4], [-1, 56, 4], [1, 36, 4], [1, 56, 4], [1, 72, 2]].forEach(([sd, z, n], k) => {
      const row = shopRow(n, 70 + k);
      row.position.set(sd * 10.2, 0, z); row.rotation.y = sd > 0 ? -HP : HP;
      top.add(row);
      C.push({ type: 'box', x: sd * 10.2, z, hw: 2.4, hd: n * 2.1 });
    });
    [[22, FZ + RW / 2 + 3.4, 5], [-22, FZ + RW / 2 + 3.4, 1]].forEach(([x, z, n], k) => {
      if (x < 0) return; // (the tank's compound is on the left)
      const row = shopRow(n, 90 + k);
      row.position.set(x + 4, 0, z + 1.2); row.rotation.y = Math.PI;
      top.add(row);
      C.push({ type: 'box', x: x + 4, z: z + 1.2, hw: n * 2.1, hd: 2.4 });
    });
    // old-style lamp posts with three globes along the East Nada and the forecourt
    const lampM = mat('ptLamp', 0x1d1d1f, 0.5), globeM = KT.mat('ptGlobe', { color: 0xfff6e0, emissive: 0xffe0a0, emissiveIntensity: 0.5, roughness: 0.3 });
    for (let z = 14; z <= 78; z += 8) [-1, 1].forEach((sd) => {
      const x = sd * (z < FZ ? 14 : 5.3);
      part(g, G.cyl(0.08, 0.12, 4, 8), lampM, x, 2, z);
      part(g, G.box(1.2, 0.06, 0.06), lampM, x, 3.6, z);
      [-0.5, 0, 0.5].forEach((dx) => part(g, G.sph(0.22, 8, 6), globeM, x + dx, dx ? 3.85 : 4.3, z));
    });
    // brass lamp towers either side of the steps
    [-9, 9].forEach((x) => { const lt = Models.lampTower(5); lt.position.set(x, 0, 14); top.add(lt); });
    // ---- the Padmatheertham tank: a great sunken tank whose stone steps go
    // down on every side to the water, in its own walled compound
    const PX = TANK.x, PZ = TANK.z, RX = TANK.hx, RZ = TANK.hz, BAND = TANK.band, NS = TANK.steps, SW = BAND / NS;
    const pondWall = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0) + HP, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      part(g, G.box(len, 1.4, 0.6), white, cx, 0.7, cz, 0, ang, 0);
      part(g, G.box(len, 0.2, 0.9), roofM, cx, 1.5, cz, 0, ang, 0);
      for (let t = 0; t <= len + 0.01; t += 3.5) part(g, G.box(0.8, 2, 0.8), white, x0 + (x1 - x0) * t / len, 1, z0 + (z1 - z0) * t / len);
      C.push({ type: 'box', x: cx, z: cz, hw: Math.max(0.5, Math.abs(x1 - x0) / 2), hd: Math.max(0.5, Math.abs(z1 - z0) / 2) });
    };
    const WM = 6, KW = 16, wx0 = PX - RX - WM - KW, wx1 = PX + RX + WM, wz0 = PZ - RZ - WM, wz1 = PZ + RZ + WM;   // (KW: Kuthiramalika's strip on the west)
    pondWall(wx0, wz0, wx1, wz0); pondWall(wx0, wz1, wx1, wz1); pondWall(wx0, wz0, wx0, wz1);
    pondWall(wx1, wz0, wx1, PZ - 3); pondWall(wx1, PZ + 3, wx1, wz1);       // the gate faces the East Nada
    [-1, 1].forEach((sd) => { part(g, G.box(1.2, 3.2, 1.2), white, wx1, 1.6, PZ + sd * 3); part(g, KT.hipRoofGeometry(1.8, 1.8, 0.8, 0.2), roofM, wx1, 3.2, PZ + sd * 3); });
    // the stone deck round the rim (it also covers where the ground falls away)
    [[PX - KW / 2, wz0 + WM / 2, 2 * (RX + WM) + KW, WM], [PX - KW / 2, wz1 - WM / 2, 2 * (RX + WM) + KW, WM], [PX - RX - WM / 2, PZ, WM, 2 * RZ], [wx1 - WM / 2, PZ, WM, 2 * RZ], [PX - RX - WM - KW / 2, PZ, KW, 2 * RZ]].forEach(([x, z, w, d]) => part(g, G.box(w, 0.3, d), pave, x, -0.12, z));
    // the steps: each ring a little lower and further in, solid down to the bottom
    const tankStone = mat('ptTankStone', 0x8f8472, 0.9), tankStone2 = mat('ptTankStone2', 0x7d7262, 0.9);
    for (let k = 0; k < NS; k++) {
      const hx = RX - k * SW, hz = RZ - k * SW, top_ = -(k + 1) * (-TANK.water + 0.3) / NS, hgt = top_ - TANK.floor;
      const m = k % 2 ? tankStone : tankStone2;
      [[0, -hz + SW / 2, 2 * hx, SW], [0, hz - SW / 2, 2 * hx, SW], [-hx + SW / 2, 0, SW, 2 * hz - 2 * SW], [hx - SW / 2, 0, SW, 2 * hz - 2 * SW]].forEach(([dx, dz, sx, sz]) => part(g, G.box(sx, hgt, sz), m, PX + dx, TANK.floor + hgt / 2, PZ + dz));
    }
    part(g, G.box(2 * RX + 0.6, 0.35, 0.5), tankStone2, PX, 0.05, PZ - RZ); part(g, G.box(2 * RX + 0.6, 0.35, 0.5), tankStone2, PX, 0.05, PZ + RZ);
    part(g, G.box(0.5, 0.35, 2 * RZ), tankStone2, PX - RX, 0.05, PZ); part(g, G.box(0.5, 0.35, 2 * RZ), tankStone2, PX + RX, 0.05, PZ);
    const water = new T.Mesh(new T.PlaneGeometry(2 * (RX - BAND) + 2, 2 * (RZ - BAND) + 2), KT.Highway.waterMaterial());
    water.rotation.x = -HP; water.position.set(PX, TANK.water, PZ); root.add(water);
    box(PX, PZ, RX - BAND + 0.2, RZ - BAND + 0.2);                            // (you can go down to the water, not into it)
    // white Kerala houses with tiled roofs and yellow shutters along two sides
    // Kuthiramalika palace stands along the west side of the tank, facing it
    const kp = kuthiramalika();
    kp.position.set(PX - RX - WM - KW / 2 + 1, 0, PZ); kp.rotation.y = HP; root.add(kp);
    box(PX - RX - WM - KW / 2 + 1, PZ, 5.6, 25.5);
    [[PX - 16, wz0 + 3, 10, 0], [PX - 3, wz0 + 3, 8, 0], [PX + 11, wz0 + 3, 10, 0]].forEach(([x, z, w, r], k) => {
      const h = new T.Group(), hh = k % 2 ? 6 : 4.4;
      part(h, G.box(w, hh, 5), white, 0, hh / 2, 0);
      part(h, KT.hipRoofGeometry(w + 1.4, 6.4, 2.4, 0.3), roofOld, 0, hh, 0);
      for (let n = 0; n < Math.round(w / 2.5); n++) part(h, G.box(0.9, 1.1, 0.1), mat('ptShutter', 0xe0a020, 0.6), -w / 2 + 1.4 + n * 2.5, hh - 1.6, 2.55);
      h.position.set(x, 0, z); h.rotation.y = r; g.add(h);
      box(x, z, r ? 2.6 : w / 2, r ? w / 2 : 2.6);
    });
    // the stone colonnade on the deck along the north bank
    for (let k = 0; k < 11; k++) part(g, G.box(0.5, 2.6, 0.5), tankStone, PX - 18 + k * 3, 1.3, wz1 - 2.5);
    part(g, G.box(32, 0.4, 2.2), tankStone, PX - 3, 2.8, wz1 - 2.2);
    part(g, KT.hipRoofGeometry(33, 3, 0.9, 0.2), roofM, PX - 3, 3.0, wz1 - 2.2);
    // the yellow-pillared mandapam, standing on its own plinth down on the steps
    const mx = PX + RX - 3.2, mz = PZ + RZ - 3.2;
    part(g, G.box(4.4, -TANK.floor + 0.4, 4.4), tankStone2, mx, (TANK.floor + 0.4) / 2, mz);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => part(g, G.box(0.3, 2.6, 0.3), mat('ptYellow', 0xe8b830, 0.6), mx + a * 1.8, 1.7, mz + b * 1.8));
    part(g, KT.hipRoofGeometry(5.4, 5.4, 1.5, 0.25), roofOld, mx, 3.0, mz);
    // where you can stand: the gopuram's porch, steps and passage; the
    // corridor; the mandapam and its steps; the tank's deck and steps
    root.userData.floor = (lx, lz) => {
      // the gopuram
      const gz = lz - GP_Z, F = GP_FLOOR, ST = GP_STEPS, BD = GP_BD;
      if (Math.abs(lx) < 8 && gz >= BD / 2 && gz < BD / 2 + 3.6) return F;
      if (Math.abs(lx) < 8 && gz >= BD / 2 + 3.6 && gz < BD / 2 + 3.6 + ST * 0.6) return F * (ST - Math.floor((gz - BD / 2 - 3.6) / 0.6)) / ST;
      if (Math.abs(lx) < 3 && gz >= -BD / 2 && gz < BD / 2) return F;
      if (Math.abs(lx) < 3 && gz < -BD / 2 && gz >= -BD / 2 - ST * 0.6) return F * (ST - Math.floor((-BD / 2 - gz) / 0.6)) / ST;
      // the corridor floor
      if (Math.abs(lx) < OX && lz > OZ0 && lz < OZ1 && !(Math.abs(lx) < IX && lz > IZ0 && lz < IZ1)) return CF;
      // the mandapam and its steps
      if (Math.abs(lx) < 6.5 && lz >= MZ0 && lz < MZ1) return SP;
      if (Math.abs(lx) < 2.5 && lz >= MZ1 && lz < MZ1 + 2) return SP * (4 - Math.floor((lz - MZ1) / 0.5)) / 4;
      // the tank
      const tx = Math.abs(lx - PX), tz = Math.abs(lz - PZ);
      if (lx > PX - RX - WM - KW && tx < RX + WM + KW && tz < RZ + WM) {
        const d = Math.min(RX - tx, RZ - tz);                 // how far in from the rim
        if (d < 0) return 0.03;
        if (d < BAND) return -(Math.floor(d / SW) + 1) * (-TANK.water + 0.3) / NS;
        return null;
      }
      return null;
    };
    // ---- a few palms and old trees, and the drive's kerb
    const baked = KT.bake(g);
    root.add(baked);
    [[-40, 12], [40, 12], [-40, -40], [44, -20], [-62, 70], [-30, 74], [24, 44], [30, 60]].forEach(([x, z], k) => { const p = Models.coconutPalm(220 + k); p.position.set(x, 0, z); p.rotation.y = k; top.add(p); });
    [[-58, 30], [46, 40]].forEach(([x, z], k) => { const t = Models.banyanTree(); t.position.set(x, 0, z); t.scale.setScalar(0.75); t.rotation.y = k; top.add(t); });
    root.add(KT.bake(top));
    // shopkeepers behind their counters
    const keepers = [];
    [[-1, 36, 4], [-1, 56, 4], [1, 36, 4], [1, 56, 4]].forEach(([sd, z], k) => {
      for (let n = 0; n < 2; n++) {
        const female = (k + n) % 3 === 0;
        const ch = Models.character({ gender: female ? 'female' : 'male', outfit: female ? 'saree' : 'mundu', lite: true, hair: female ? 'bun' : 'short', mustache: !female, acc: {}, skin: [0xc08660, 0xa8704c, 0xd9a27c][(k + n) % 3], seed: 1400 + k * 2 + n });
        ch.position.set(sd * (10.2 - 1.3), 0, z - 4.2 + n * 8.4); ch.rotation.y = sd > 0 ? -HP : HP;
        people.add(ch); keepers.push(ch);
      }
    });
    let lastK = null;
    it.anim.push((t) => { const dt = lastK === null ? 0 : Math.min(0.1, Math.max(0, t - lastK)); lastK = t; keepers.forEach((ch, i) => KT.Models.animateCharacter(ch, Math.sin(t * 0.4 + i) > 0.5 ? 'serve' : 'idle', dt, 1)); });
    // devotees: up the East Nada to the gopuram, round the four nadas, to the tank
    const NZ = TZ0 - RW / 2 - 2, NX = TX1 + RW / 2 + 2, gx = wx1 + 2.5;
    devotees(it, people, [
      [[2, 76], [2, 40], [2, 18.5]], [[-2, 18.5], [-2, 30], [-2, 60], [-2, 76]],
      [[3, 76], [3, 30], [NX, FZ], [NX, NZ], [-NX, NZ], [-NX, FZ], [-3, FZ], [-3, 76]],
      [[-4, 46], [gx, 46], [gx, PZ], [wx1 - 3, PZ], [wx1 - 3, wz1 - 4], [PX - 10, wz1 - 4]],
      [[NX, -20], [NX, FZ], [6, FZ], [6, 19]], [[-6, 19], [-NX, FZ], [-NX, -40]],
      [[4, 70], [4, 20], [8, 19]], [[-5, 74], [-5, 22], [-8, 19]]
    ], 23);
    // inside: round the corridor, and up to the mandapam to see the god
    const cz1 = (OZ1 + IZ1) / 2, cz0 = (OZ0 + IZ0) / 2, cx = (OX + IX) / 2;
    devotees(it, people, [
      [[1, -6], [1, cz1], [cx, cz1], [cx, cz0], [-cx, cz0], [-cx, cz1], [-1, cz1], [-1, -6]],
      [[-1.5, -6], [-1.5, -20], [-1.5, MZ1 + 2.2]], [[1.5, MZ1 + 2.2], [1.5, -20], [1.5, -6]],
      [[cx, -20], [cx, -50], [-cx, -50]].map(([x, z]) => [x, z])
    ], 41);
    it.fauna = people;
    root.userData.colliders = C;
    return root;
  }

  // a few custom models -------------------------------------------------
  // The Government Secretariat (1869): a long two-storey white building in
  // the Roman-Dutch style, arched verandahs below and balustraded ones above,
  // both screened with green bamboo chiks, a low red roof, a central portico
  // of six tall columns under a pediment, and the square clock tower with a
  // white dome, golden finial and the flag; wings with their own porticos at
  // both ends. In front, inside the compound wall and railings: a drive,
  // lawns edged with low hedges and white fences, beds of marigolds in pots,
  // topiary, a tiered fountain, the statue of Velu Thampi Dalawa, palms and
  // lamps, and a paved footpath outside along the wall.
  // (Model space: +z faces the road; the compound is 124 x 96 m.)
  let secFacadeTex = null;
  function secFacade() {
    if (secFacadeTex) return secFacadeTex;
    const c = document.createElement('canvas'); c.width = 128; c.height = 384;
    const x = c.getContext('2d');
    const W = 128, H = 384;
    x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, W, H);
    const chik = (x0, y0, w, h) => {
      x.fillStyle = '#2f6a52'; x.fillRect(x0, y0, w, h);
      x.fillStyle = 'rgba(20,50,38,0.55)'; for (let yy = y0; yy < y0 + h; yy += 4) x.fillRect(x0, yy, w, 1);
      x.fillStyle = 'rgba(160,190,170,0.25)'; x.fillRect(x0, y0, 4, h);
    };
    const balustrade = (x0, y0, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(x0, y0, w, 5); x.fillRect(x0, y0 + h - 4, w, 4);
      for (let xx = x0 + 3; xx < x0 + w - 3; xx += 7) { x.fillRect(xx, y0 + 5, 4, h - 9); }
      x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(x0, y0 + h, w, 2);
    };
    // upper floor: a tall rectangular opening, chik above a balustrade
    chik(22, 34, 84, 116); balustrade(22, 120, 84, 30);
    x.fillStyle = '#e4e0d4'; x.fillRect(16, 26, 96, 8); x.fillRect(16, 150, 96, 6);
    // a moulded band between the floors
    x.fillStyle = '#dcd8cc'; x.fillRect(0, 182, W, 10); x.fillStyle = '#ffffff'; x.fillRect(0, 178, W, 4);
    // ground floor: an arched opening, chik, balustrade
    x.save(); x.beginPath(); x.moveTo(22, 372); x.lineTo(22, 262); x.arc(64, 262, 42, Math.PI, 0); x.lineTo(106, 372); x.closePath(); x.clip();
    chik(22, 212, 84, 160); x.restore();
    balustrade(22, 330, 84, 36);
    x.strokeStyle = '#e2ddd0'; x.lineWidth = 6; x.beginPath(); x.arc(64, 262, 46, Math.PI, 0); x.stroke();
    // pilasters at both edges of the bay
    x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, 10, H); x.fillRect(W - 10, 0, 10, H);
    x.fillStyle = 'rgba(0,0,0,0.07)'; x.fillRect(10, 0, 2, H); x.fillRect(W - 12, 0, 2, H);
    secFacadeTex = new T.CanvasTexture(c);
    secFacadeTex.encoding = T.sRGBEncoding; secFacadeTex.wrapS = T.RepeatWrapping; secFacadeTex.anisotropy = KT.maxAnisotropy;
    return secFacadeTex;
  }
  function secretariat() {
    const g = new T.Group(), live = new T.Group();
    const white = mat('secWhite', 0xf4f2ec, 0.6), trim = mat('secTrim', 0xe0dccf, 0.7), roofM = mat('secRoof', 0xc96a5c, 0.75);
    const gold = KT.mat('secGold', { color: 0xd4a434, metalness: 0.7, roughness: 0.3 }), dark = mat('secDoor', 0x6a3b22, 0.6);
    const faceM = new T.MeshStandardMaterial({ map: secFacade(), roughness: 0.7 });
    const BAY = 4, FH = 12;          // a bay of the facade, the building's height
    // a facade plane of n bays (UVs repeat the bay texture)
    const facade = (cx, cz, n, ry) => {
      const geo = new T.PlaneGeometry(n * BAY, FH);
      const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * n);
      const m = new T.Mesh(geo, faceM); m.position.set(cx, FH / 2, cz); m.rotation.y = ry || 0; g.add(m);
    };
    // a block: walls, cornice, parapet and a low hipped roof
    const block = (cx, cz, w, d, fronts) => {
      part(g, G.box(w, FH, d), white, cx, FH / 2, cz);
      part(g, G.box(w + 0.6, 0.5, d + 0.6), trim, cx, FH + 0.25, cz);
      part(g, G.box(w + 0.2, 0.9, d + 0.2), white, cx, FH + 0.95, cz);
      part(g, KT.hipRoofGeometry(w + 0.4, d + 0.4, 2.2, 0.2), roofM, cx, FH + 1.3, cz);
      part(g, G.box(w + 0.8, 0.6, d + 0.8), trim, cx, 0.3, cz);   // plinth
      (fronts || []).forEach(([fx, fz, n, ry]) => facade(fx, fz, n, ry));
    };
    const BZ = -26, BD = 14;         // the main range: centre z, depth
    block(-26, BZ, 40, BD, [[-26, BZ + BD / 2 + 0.03, 10, 0]]);
    block(26, BZ, 40, BD, [[26, BZ + BD / 2 + 0.03, 10, 0]]);
    block(0, BZ, 12, BD, []);
    // the end wings come forward with porticos of their own
    [-1, 1].forEach((sd) => {
      const wx = sd * 52;
      block(wx, BZ + 8, 16, 30, [[wx - sd * 8.03, BZ + 8, 7, -sd * HP], [wx, BZ + 23.03, 4, 0]]);
      for (let k = 0; k < 4; k++) part(g, G.cyl(0.55, 0.62, FH - 0.6, 14), white, wx - 4.5 + k * 3, (FH - 0.6) / 2, BZ + 26);
      part(g, G.box(12, 0.8, 4), trim, wx, FH - 0.2, BZ + 25);
      const pd = new T.Shape(); pd.moveTo(-6.4, 0); pd.lineTo(6.4, 0); pd.lineTo(0, 2.4); pd.lineTo(-6.4, 0);
      part(g, new T.ExtrudeGeometry(pd, { depth: 4.4, bevelEnabled: false }), white, wx, FH + 0.2, BZ + 22.8);
    });
    // the central portico: six columns two storeys tall, entablature, pediment
    const PZ = BZ + BD / 2 + 6;
    part(g, G.box(16, 0.8, 7), trim, 0, 0.4, PZ - 0.5);
    for (let k = 0; k < 3; k++) part(g, G.box(10 - k * 1.4, 0.25, 1.2), trim, 0, 0.12 + k * 0.25, PZ + 3.6 + k * 0.6 - 1.4);
    for (let k = 0; k < 6; k++) {
      const x = -6.5 + k * 2.6;
      part(g, G.cyl(0.6, 0.68, FH - 1, 16), white, x, (FH - 1) / 2 + 0.8, PZ + 2);
      part(g, G.box(1.5, 0.5, 1.5), trim, x, FH + 0.05, PZ + 2);
      part(g, G.box(1.5, 0.6, 1.5), trim, x, 1.1, PZ + 2);
    }
    part(g, G.box(17, 1.2, 7.4), white, 0, FH + 0.9, PZ - 0.6);
    part(g, G.box(17.6, 0.35, 7.8), trim, 0, FH + 1.6, PZ - 0.6);
    const ped = new T.Shape(); ped.moveTo(-8.8, 0); ped.lineTo(8.8, 0); ped.lineTo(0, 3.4); ped.lineTo(-8.8, 0);
    part(g, new T.ExtrudeGeometry(ped, { depth: 7.4, bevelEnabled: false }), white, 0, FH + 1.75, PZ - 4.3);
    // the pediment's roof slopes, in the red of the main roof
    [-1, 1].forEach((sd) => part(g, G.box(9.9, 0.25, 7.8), roofM, sd * 4.4, FH + 3.5, PZ - 0.6, 0, 0, -sd * Math.atan2(3.4, 8.8)));
    // three tall doors behind the columns
    [-3.6, 0, 3.6].forEach((x) => { part(g, G.box(1.8, 4.6, 0.2), dark, x, 3.1, BZ + BD / 2 + 0.12); part(g, G.cyl(0.9, 0.9, 0.2, 14, 1, false, 0, Math.PI), dark, x, 5.4, BZ + BD / 2 + 0.12, HP, 0, -HP); });
    // the clock tower, dome, finial and flag
    const TZ = BZ + 2, TH = FH + 2;
    part(g, G.box(6.4, 7, 6.4), white, 0, TH + 3.5, TZ);
    part(g, G.box(7.2, 0.5, 7.2), trim, 0, TH + 7.2, TZ);
    [[0, 3.22, 0], [3.22, 0, HP], [0, -3.22, Math.PI], [-3.22, 0, -HP]].forEach(([dx, dz, r]) => {
      const face = new T.Mesh(new T.CircleGeometry(1.6, 28), new T.MeshStandardMaterial({ map: clockFace(), roughness: 0.6 }));
      face.position.set(dx, TH + 4.6, TZ + dz); face.rotation.y = r; face.userData.noBake = true; live.add(face);
      part(g, G.torus(1.65, 0.12, 6, 28), mat('secClockRim', 0x3a3a3a, 0.5), dx, TH + 4.6, TZ + dz, 0, r, 0);
      [-1, 1].forEach((sd) => part(g, G.box(0.35, 7, 0.35), trim, dx + (Math.abs(dz) > 0 ? sd * 2.9 : 0), TH + 3.5, TZ + dz + (Math.abs(dx) > 0 ? sd * 2.9 : 0)));
    });
    part(g, G.cyl(3.0, 3.0, 1.4, 24), white, 0, TH + 8.1, TZ);
    part(g, new T.SphereGeometry(3.0, 24, 12, 0, Math.PI * 2, 0, HP), white, 0, TH + 8.8, TZ);
    part(g, G.cyl(0.35, 0.5, 0.6, 10), gold, 0, TH + 12.0, TZ);
    part(g, G.sph(0.45, 12, 10), gold, 0, TH + 12.6, TZ);
    part(g, G.cone(0.3, 1.2, 10), gold, 0, TH + 13.5, TZ);
    part(g, G.cyl(0.07, 0.09, 7, 6), mat('secPole', 0xd8d8d8, 0.4), 0, TH + 17, TZ);
    const flagTex = (() => {
      const c = document.createElement('canvas'); c.width = 96; c.height = 64; const x = c.getContext('2d');
      x.fillStyle = '#f08a2a'; x.fillRect(0, 0, 96, 22); x.fillStyle = '#ffffff'; x.fillRect(0, 21, 96, 22); x.fillStyle = '#138a36'; x.fillRect(0, 42, 96, 22);
      x.strokeStyle = '#1f2a8a'; x.lineWidth = 2; x.beginPath(); x.arc(48, 32, 8, 0, Math.PI * 2); x.stroke();
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; x.beginPath(); x.moveTo(48, 32); x.lineTo(48 + Math.cos(a) * 8, 32 + Math.sin(a) * 8); x.lineWidth = 0.7; x.stroke(); }
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
    })();
    const flag = new T.Mesh(new T.PlaneGeometry(2.6, 1.7, 8, 1), new T.MeshStandardMaterial({ map: flagTex, side: T.DoubleSide, roughness: 0.8 }));
    flag.position.set(1.35, TH + 19.6, TZ); flag.userData.noBake = true; live.add(flag);
    // --- the compound: drive, lawns, beds, fountain, statue, fences, wall
    const asph = mat('secDrive', 0x55524e, 0.9), kerb = mat('secKerb', 0xd8d4c8, 0.8), pave = mat('secPave', 0xa8604a, 0.9);
    const lawnM = mat('secLawn', 0x5f9a3a, 1), hedgeY = mat('secHedgeY', 0xa6bf3a, 0.9), hedgeG = mat('secHedgeG', 0x3f7a2e, 0.9);
    const FRONT = 48, X = 62;        // the compound's front edge (z) and half width
    // ground: the forecourt before the building, the lawns, the drives
    part(g, G.box(124, 0.06, 18), asph, 0, 0.03, BZ + BD / 2 + 9);
    [-1, 1].forEach((sd) => part(g, G.box(52, 0.08, FRONT + 7), lawnM, sd * 33, 0.04, (FRONT - 9) / 2 + 3));
    part(g, G.box(9, 0.08, FRONT + 2), asph, 0, 0.05, (FRONT - 9) / 2 + 1);
    [-1, 1].forEach((sd) => part(g, G.box(0.35, 0.18, FRONT - 8), kerb, sd * 4.7, 0.09, (FRONT - 9) / 2 + 3));
    // a footpath of red pavers round each lawn
    [-1, 1].forEach((sd) => {
      part(g, G.box(52, 0.1, 2.2), pave, sd * 33, 0.06, 2.5);
      part(g, G.box(2.2, 0.1, FRONT - 2), pave, sd * 8.2, 0.06, FRONT / 2);
    });
    // the fountain in a round pool where the drive divides
    const FZ = 18;
    part(g, G.cyl(6.8, 6.8, 0.1, 32), pave, 0, 0.08, FZ);
    part(g, G.cyl(4.6, 4.8, 0.7, 28), trim, 0, 0.35, FZ);
    part(g, G.cyl(4.2, 4.2, 0.1, 28), KT.Highway.waterMaterial(), 0, 0.65, FZ);
    [[0.5, 1.6, 2.2], [0.35, 3.0, 1.4], [0.25, 4.1, 0.8]].forEach(([r, y, R]) => { part(g, G.cyl(r, r * 1.3, y - 0.4, 10), trim, 0, (y - 0.4) / 2 + 0.6, FZ); part(g, G.cyl(R, R * 0.4, 0.45, 18), trim, 0, y, FZ); });
    const jet = new T.MeshStandardMaterial({ color: 0xe8f6fa, transparent: true, opacity: 0.55, emissive: 0x9fc6d0, emissiveIntensity: 0.3, depthWrite: false });
    const jets = new T.Mesh(G.cyl(0.08, 0.3, 1.4, 8), jet); jets.position.set(0, 5.0, FZ); jets.userData.noBake = true; live.add(jets);
    [2.25, 1.45].forEach((R, k) => { const sheet = new T.Mesh(new T.CylinderGeometry(R, R + 0.3, k ? 1.2 : 1.4, 18, 1, true), jet); sheet.position.set(0, k ? 2.4 : 1.0, FZ); sheet.userData.noBake = true; live.add(sheet); });
    // lawns: hedge borders (yellow-green), white fences with square posts
    [-1, 1].forEach((sd) => {
      const x0 = sd * 9.5, x1 = sd * 58, z0 = 2, z1 = FRONT - 3;
      const cx = (x0 + x1) / 2, w = Math.abs(x1 - x0);
      part(g, G.box(0.8, 0.8, z1 - z0 - 6), hedgeY, x0 + sd * 0.6, 0.4, (z0 + z1) / 2 + 2);
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1) + 0.01; x += 3) {
        part(g, G.box(0.25, 0.9, 0.25), white, x, 0.45, z1 - 1);
        if (x + 3 <= Math.max(x0, x1) + 0.01) [0.35, 0.75].forEach((y) => part(g, G.box(3, 0.05, 0.05), white, x + 1.5, y, z1 - 1));
      }
      [[sd * 12, z1 - 1], [sd * 56, z1 - 1]].forEach(([x, z]) => part(g, G.box(0.9, 1.1, 0.9), white, x, 0.55, z));
      // rows of marigolds in clay pots before the building, and the beds
      for (let k = 0; k < 22; k++) {
        const x = sd * (11 + k * 2.1), z = 4.6 + (k % 2) * 0.9;
        part(g, G.cyl(0.32, 0.24, 0.5, 10), mat('secPot', 0xb0603a, 0.9), x, 0.25, z);
        part(g, KT.blob(0.45, 1, 0.25, 1100 + k), hedgeG, x, 0.75, z, 0, 0, 0, 1, 0.8, 1);
        for (let f = 0; f < 4; f++) part(g, G.sph(0.17, 6, 5), mat(k % 3 ? 'secMarigold' : 'secMarigold2', k % 3 ? 0xf28c1a : 0xf2b81a, 0.7), x + Math.cos(f * 1.6) * 0.3, 1.05, z + Math.sin(f * 1.6) * 0.3);
      }
      [14, 30].forEach((z, k) => {
        part(g, G.cyl(3.2, 3.3, 0.3, 24), mat('secBedSoil', 0x6a4a2e, 1), sd * 33, 0.15, z);
        for (let f = 0; f < 26; f++) { const a = f * 2.4, r = 0.5 + (f % 6) * 0.45; part(g, G.sph(0.22, 6, 5), mat(['secMarigold', 'secRose', 'secMarigold2'][(f + k) % 3], [0xf28c1a, 0xd8203a, 0xf2b81a][(f + k) % 3], 0.7), sd * 33 + Math.cos(a) * r, 0.42, z + Math.sin(a) * r); }
      });
      // topiary near the front fence: stacked clipped spheres
      [sd * 16, sd * 22, sd * 46, sd * 52].forEach((x, k) => {
        [0.9, 0.7, 0.45].forEach((r, h) => part(g, G.sph(r, 10, 8), hedgeG, x, 0.7 + h * 0.9 + r * 0.3, FRONT - 6 - (k % 2) * 1.5));
      });
    });
    // Velu Thampi Dalawa on his tall dark plinth, garlanded
    const SX = -36, SZ = 24;
    const plinthM = mat('secPlinth', 0x4a4440, 0.6), bronze = KT.mat('secBronze', { color: 0x2f2c2a, metalness: 0.4, roughness: 0.5 });
    part(g, G.box(4.4, 0.5, 4.4), plinthM, SX, 0.25, SZ);
    part(g, G.box(3.2, 4.4, 3.2), plinthM, SX, 2.7, SZ);
    part(g, G.box(3.6, 0.4, 3.6), plinthM, SX, 5.1, SZ);
    part(g, G.cyl(0.55, 0.85, 2.4, 12), bronze, SX, 6.5, SZ);          // the long coat
    part(g, G.cyl(0.5, 0.55, 1.0, 12), bronze, SX, 8.2, SZ);
    [-1, 1].forEach((s2) => part(g, G.capsule(0.17, 0.7, 4, 8), bronze, SX + s2 * 0.45, 7.9, SZ + 0.35, 0.9, 0, 0));
    part(g, G.sph(0.34, 12, 10), bronze, SX, 9.05, SZ);
    part(g, G.cyl(0.36, 0.38, 0.3, 12), bronze, SX, 9.35, SZ);           // turban
    for (let f = 0; f < 14; f++) { const t = f / 13; part(g, G.sph(0.09, 5, 4), mat('secMarigold', 0xf28c1a, 0.7), SX + Math.sin(t * Math.PI * 2) * 0.42, 8.55 - Math.sin(t * Math.PI) * 0.7, SZ + 0.35 + Math.cos(t * Math.PI * 2) * 0.15); }
    const plaqueM = KT.signMaterial([{ text: 'വേലുത്തമ്പി ദളവ', size: 40 }, { text: 'Velu Thampi Dalawa  1765 - 1809', size: 30 }], { width: 600, height: 160, bg: '#3a3430', color: '#e8c76a' });
    const plaque = new T.Mesh(G.box(2.6, 1.0, 0.05), [plinthM, plinthM, plinthM, plinthM, plaqueM, plinthM]);
    plaque.position.set(SX, 3.6, SZ + 1.63); plaque.userData.noBake = true; live.add(plaque);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; part(g, G.cyl(0.3, 0.22, 0.45, 10), mat('secPot', 0xb0603a, 0.9), SX + Math.cos(a) * 2.9, 0.72, SZ + Math.sin(a) * 2.9); part(g, KT.blob(0.38, 1, 0.3, 1200 + k), mat(k % 2 ? 'secCroton' : 'secFoliage', k % 2 ? 0x8a2a4a : 0x4f8a36, 0.9), SX + Math.cos(a) * 2.9, 1.15, SZ + Math.sin(a) * 2.9); }
    // the compound wall: a low white wall with iron railings between pillars,
    // the main gate in front, and a paved footpath outside it
    const iron = mat('secIron', 0x2a2a2a, 0.5);
    const wallRun = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0) + HP;
      part(g, G.box(len, 0.8, 0.5), white, (x0 + x1) / 2, 0.4, (z0 + z1) / 2, 0, ang, 0);
      for (let t = 0; t <= len + 0.01; t += 4) {
        const x = x0 + (x1 - x0) * t / len, z = z0 + (z1 - z0) * t / len;
        part(g, G.box(0.7, 2.0, 0.7), white, x, 1.0, z);
        part(g, G.box(0.9, 0.2, 0.9), trim, x, 2.1, z);
      }
      for (let t = 0.3; t < len; t += 0.25) part(g, G.box(0.05, 1.1, 0.05), iron, x0 + (x1 - x0) * t / len, 1.35, z0 + (z1 - z0) * t / len);
      part(g, G.box(len, 0.06, 0.06), iron, (x0 + x1) / 2, 1.85, (z0 + z1) / 2, 0, ang, 0);
    };
    const GATE = 7;
    wallRun(-X, FRONT, -GATE, FRONT); wallRun(GATE, FRONT, X, FRONT);
    wallRun(-X, BZ - 12, -X, FRONT); wallRun(X, BZ - 12, X, FRONT); wallRun(-X, BZ - 12, X, BZ - 12);
    [-1, 1].forEach((sd) => {
      part(g, G.box(1.6, 4, 1.6), white, sd * GATE, 2, FRONT);
      part(g, G.box(2, 0.4, 2), trim, sd * GATE, 4.2, FRONT);
      part(g, G.sph(0.5, 10, 8), white, sd * GATE, 4.8, FRONT);
    });
    // the footpath outside, red pavers with a kerb
    part(g, G.box(2 * X + 6, 0.12, 4), pave, 0, 0.06, FRONT + 2.6);
    part(g, G.box(2 * X + 6, 0.25, 0.3), kerb, 0, 0.12, FRONT + 4.7);
    part(g, G.box(9, 0.06, 5), asph, 0, 0.08, FRONT + 2.6);
    const baked = KT.bake(g);
    baked.add(live);
    // palms and shade trees, lamps, the officials' white cars
    const top = new T.Group();
    const add = (o, x, z, r, sc) => { o.position.set(x, 0, z); o.rotation.y = r || 0; if (sc) o.scale.setScalar(sc); top.add(o); return o; };
    [[-48, 8], [-24, 12], [24, 12], [48, 8], [-28, 40], [28, 40], [-40, 40], [40, 40], [58, 38], [-58, 38]].forEach(([x, z], k) => add(Models.coconutPalm(200 + k), x, z, k));
    [[-56, -35.5], [56, -35.5], [-30, -35.5], [30, -35.5]].forEach(([x, z], k) => add(Models.mangoTree(), x, z, k, 0.7));
    for (let z = 4; z <= FRONT - 6; z += 9) [-1, 1].forEach((sd) => add(Models.lampPost(), sd * 6, z, sd > 0 ? -HP : HP));
    if (Models.car) [[-14, PZ + 6, 0.1], [12, PZ + 7, -0.2], [20, PZ + 3, 1.4]].forEach(([x, z, r]) => add(Models.car(0xf3f3f0, 'sedan'), x, z, r));
    baked.add(KT.bake(top));
    // colliders: the building, wings, portico, fountain, statue and the walls
    const C = [{ type: 'box', x: 0, z: BZ, hw: 46, hd: BD / 2 }, { type: 'box', x: 0, z: PZ - 0.5, hw: 8.5, hd: 3.6 },
      { type: 'box', x: -52, z: BZ + 8, hw: 8, hd: 15 }, { type: 'box', x: 52, z: BZ + 8, hw: 8, hd: 15 },
      { type: 'circle', x: 0, z: FZ, r: 4.8 }, { type: 'box', x: SX, z: SZ, hw: 2.2, hd: 2.2 },
      { type: 'box', x: -(X + GATE) / 2, z: FRONT, hw: (X - GATE) / 2, hd: 0.4 }, { type: 'box', x: (X + GATE) / 2, z: FRONT, hw: (X - GATE) / 2, hd: 0.4 },
      { type: 'box', x: -X, z: (FRONT + BZ - 12) / 2, hw: 0.4, hd: (FRONT - BZ + 12) / 2 }, { type: 'box', x: X, z: (FRONT + BZ - 12) / 2, hw: 0.4, hd: (FRONT - BZ + 12) / 2 },
      { type: 'box', x: 0, z: BZ - 12, hw: X, hd: 0.4 }];
    baked.userData.colliders = C;
    baked.userData.jets = jets;
    return baked;
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
    // the Jalakanyaka (Kanayi Kunhiraman, 1992): a huge reclining mermaid in
    // grey concrete, some 35 m long, lying back in a great open scallop shell,
    // her body raised on one arm, her head thrown back, her tail curving away
    const g = new T.Group();
    const c = mat('mermaidConcrete', 0xa9a8a2, 0.85), shellM = mat('mermaidShell', 0xc4c3bd, 0.8), shellD = mat('mermaidShellDark', 0x9e9d97, 0.85);
    const ell = (rx, ry, rz, x, y, z, rx_, ry_, rz_) => { const m = part(g, new T.SphereGeometry(1, 24, 16), c, x, y, z, rx_ || 0, ry_ || 0, rz_ || 0); m.scale.set(rx, ry, rz); return m; };
    // the shell: one great scallop, its ribs fanning out from the hinge (by
    // the tail) to a broad, wavy rim that curls up at the edge
    const HX = 17, RR = 30, NR = 16, NT = 48, SPAN = Math.PI * 0.7, RIBS = 14;
    const pos = [], idx = [];
    for (let i = 0; i <= NR; i++) for (let k = 0; k <= NT; k++) {
      const r = 1 + (RR - 1) * i / NR, th = Math.PI - SPAN / 2 + SPAN * k / NT, u = r / RR;
      const rib = Math.abs(Math.cos(RIBS * (th - Math.PI) / 2 * 2)) * 0.7 * u;
      const y = 1.1 + rib + 2.2 * KT.smoothstep(0.78, 1, u) + 0.4 * u;
      pos.push(HX + Math.cos(th) * r, y, Math.sin(th) * r * 0.55);
    }
    for (let i = 0; i < NR; i++) for (let k = 0; k < NT; k++) { const a = i * (NT + 1) + k, b = a + NT + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const sg = new T.BufferGeometry();
    sg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); sg.setIndex(idx); sg.computeVertexNormals();
    const shell = new T.Mesh(sg, KT.mat('mermaidShellSurf', { color: 0xc4c3bd, roughness: 0.8, side: T.DoubleSide }));
    g.add(shell);
    // the shell's edge: a band from the rim down into the sand, following it
    const ep = [], ei = [];
    for (let k = 0; k <= NT; k++) {
      const t = (NR * (NT + 1) + k) * 3;
      ep.push(pos[t], pos[t + 1], pos[t + 2], pos[t], -1.5, pos[t + 2]);
      if (k < NT) { const a = k * 2; ei.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    for (let i = 0; i <= NR; i += NR) { /* (the two straight sides) */ }
    [0, NT].forEach((k) => { for (let i = 0; i < NR; i++) { const t0 = (i * (NT + 1) + k) * 3, t1 = ((i + 1) * (NT + 1) + k) * 3, b = ep.length / 3; ep.push(pos[t0], pos[t0 + 1], pos[t0 + 2], pos[t0], -1.5, pos[t0 + 2], pos[t1], pos[t1 + 1], pos[t1 + 2], pos[t1], -1.5, pos[t1 + 2]); ei.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } });
    const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(ep, 3)); eg.setIndex(ei); eg.computeVertexNormals();
    g.add(new T.Mesh(eg, KT.mat('mermaidSkirt', { color: 0x9e9d97, roughness: 0.85, side: T.DoubleSide })));
    void shellM; void shellD;
    // her: reclining along the shell, head to the left
    ell(3.2, 1.7, 2.6, -2, 3.1, 0.2);                 // hips
    ell(2.6, 2.6, 2.2, -6.2, 4.7, 0.0, 0, 0, 0.55);   // waist and chest, raised
    ell(1.6, 1.5, 1.7, -8.0, 6.3, 0.6);               // bust
    ell(0.9, 1.2, 0.9, -9.4, 7.3, 0.0, 0, 0, 0.6);    // neck
    ell(1.6, 1.8, 1.6, -10.6, 8.7, -0.2, 0, 0, 0.8);  // head thrown back
    ell(2.4, 1.0, 1.8, -11.6, 9.3, -1.4, 0, 0, 0.5);  // hair spread behind
    ell(0.65, 2.6, 0.65, -9.2, 4.3, -1.8, 0.3, 0, -0.9); // the arm she leans on, elbow on the shell
    ell(0.55, 2.2, 0.55, -9.6, 9.3, 1.0, -0.3, 0, 1.3);  // the arm raised behind her head
    // the tail, sweeping along and up at its end
    ell(4.6, 1.5, 2.2, 3.6, 2.7, 0.3, 0, 0, -0.08);
    ell(4.2, 1.1, 1.6, 10.6, 2.3, 0.8, 0, 0, 0.0);
    ell(2.6, 0.8, 1.2, 15.4, 2.9, 1.0, 0, 0, 0.45);
    ell(2.0, 0.3, 1.6, 17.6, 4.3, 1.2, 0, 0, 0.9);    // the fin
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 4, z: 1, hw: 15, hd: 8 }];
    return baked;
  }
  // the old stone mandapam on the beach: a pillared granite pavilion
  function beachMandapam() {
    const g = new T.Group(), st = mat('bmStone', 0xc9a878, 0.9), st2 = mat('bmStone2', 0xb08e62, 0.9);
    part(g, G.box(11, 0.7, 6), st2, 0, 0.35, 0);
    for (let i = 0; i < 6; i++) [-2.3, 0, 2.3].forEach((z, j) => {
      if (j === 1 && i > 0 && i < 5) return;
      const x = -4.5 + i * 1.8;
      part(g, G.box(0.55, 0.5, 0.55), st2, x, 0.95, z);
      part(g, G.box(0.42, 1.0, 0.42), st, x, 1.7, z);
      part(g, G.cyl(0.22, 0.22, 0.6, 8), st2, x, 2.5, z);
      part(g, G.box(0.42, 0.8, 0.42), st, x, 3.2, z);
      part(g, G.box(0.8, 0.3, 0.6), st2, x, 3.75, z);
    });
    part(g, G.box(11.4, 0.5, 6.2), st, 0, 4.15, 0);
    part(g, G.box(11.8, 0.25, 6.6), st2, 0, 4.5, 0);
    part(g, G.box(10.6, 0.5, 5.6), st, 0, 4.85, 0);
    const baked = KT.bake(g);
    baked.userData.colliders = [-4.5, -2.7, -0.9, 0.9, 2.7, 4.5].flatMap((x) => [{ type: 'circle', x, z: -2.3, r: 0.4 }, { type: 'circle', x, z: 2.3, r: 0.4 }]);
    return baked;
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
      const root = place(it, padmanabhaTemple(it), 0, 0);
      // the steps, porch, passage, corridor, mandapam and the tank's steps
      const floor = root.userData.floor, y0 = root.position.y;
      KT.Highway.addPlatform(root.position.x, root.position.z, root.rotation.y, 150, (lx, lz) => { const y = floor(lx, lz); return y === null ? null : y0 + y; });
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
      // the compound's front wall stands about 48 m in front of its centre
      const sec = place(it, secretariat(), 0, 0);
      const jets = sec.userData.jets;
      it.anim.push((t) => { if (jets) jets.scale.y = 1 + Math.sin(t * 3) * 0.12; });
    },
    zoo(it) { const root = place(it, zoo(it), 0, 0); KT.Life.zoo(it, root); },
    mermaidBeach(it) {
      // Shankhumugham: the mermaid in her shell back from the water, the old
      // stone mandapam on the sand, fishing boats drawn up, and crowds out
      // on the beach for the sunset (in local terms: dz < 0 is towards the road)
      // golden sand over the whole beach, following the ground
      {
        const f = it.f, ax = it.end ? -f.rx : f.fx, az = it.end ? -f.rz : f.fz, Hw = KT.Highway;
        const X0 = -60, X1 = 70, Z0 = -30, Z1 = 40, NX = 65, NZ = 35, pos = [], uv = [], idx = [];
        for (let i = 0; i <= NZ; i++) for (let k = 0; k <= NX; k++) {
          const dx = X0 + (X1 - X0) * k / NX, dz = Z0 + (Z1 - Z0) * i / NZ;
          const x = it.sg.x + ax * dx + it.out.x * dz, z = it.sg.z + az * dx + it.out.z * dz;
          pos.push(x, Math.max(Hw.groundY(x, z).y, Hw.SEA_Y - 0.4) + 0.06, z); uv.push(dx / 6, dz / 6);
        }
        for (let i = 0; i < NZ; i++) for (let k = 0; k < NX; k++) { const a = i * (NX + 1) + k, b = a + NX + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
        const sandM = KT.mat('shankhSand', { map: KT.tex('sand', 1, 1), color: 0xe2bb80, side: T.DoubleSide }, 0.15);
        const sheet = new T.Mesh(geo, sandM); sheet.receiveShadow = true; it.group.add(sheet);
      }
      place(it, mermaid(), -18, -12, 0);
      place(it, beachMandapam(), 26, 4, 0.1);
      [[-2, 16, 0.1, 3], [6, 18, -0.15, 5], [14, 15, 0.2, 7], [38, 14, 0.05, 1], [44, 17, -0.1, 9]].forEach(([dx, dz, r, k]) => {
        const b = place(it, Models.vallam(k), dx, dz, HP + r);
        b.scale.setScalar(1.15);
      });
      // a blue tarpaulin over one boat
      const tarp = new T.Mesh(new THREE.BoxGeometry(2.4, 0.6, 9), mat('tarpBlue', 0x2c4fb0, 0.7));
      place(it, tarp, 44, 17, HP - 0.1, { colliders: false }).position.y += 0.8;
      [[-40, -18], [-30, -22], [44, -20], [54, -14]].forEach(([x, z], i) => place(it, Models.coconutPalm(40 + i), x, z, i));
      [[-6, -22], [12, -22], [30, -22]].forEach(([x, z]) => place(it, Models.lampPost(), x, z, 0));
      // the crowd: families standing and sitting on the sand facing the sea,
      // a few walking along the water's edge (only moved when you are near)
      const crowd = new T.Group(); it.group.add(crowd);
      const rng = KT.makeRng(1992), people = [];
      const LOOKS = [['female', 'saree'], ['male', 'formal'], ['female', 'churidar'], ['male', 'mundu'], ['male', 'casual'], ['female', 'saree'], ['male', 'tee'], ['female', 'casual']];
      for (let k = 0; k < 34; k++) {
        const look = LOOKS[k % LOOKS.length], female = look[0] === 'female', kid = k % 7 === 3, sit = k % 3 === 1;
        const ch = Models.character({ gender: look[0], outfit: kid ? 'tee' : look[1], lite: true, hair: female ? ['bun', 'braid', 'loose', 'default'][k % 4] : ['short', 'default', 'wavy'][k % 3],
          skin: [0xc08660, 0xd9a27c, 0x8d5a3b, 0xa8704c][k % 4], jasmine: female && rng() < 0.4, mustache: !female && rng() < 0.5, acc: {}, scale: kid ? 0.7 : 0.92 + rng() * 0.1, seed: 1500 + k });
        const dx = -46 + rng() * 96, dz = 8 + rng() * 22;
        if (Math.abs(dx - 26) < 8 && Math.abs(dz - 4) < 6) continue;
        place(it, ch, dx, dz, Math.PI + (rng() - 0.5) * 0.8, { colliders: false });
        crowd.attach(ch);
        people.push({ ch, sit, walk: !sit && k % 5 === 0, x0: ch.position.x, z0: ch.position.z, ph: rng() * 9 });
      }
      const wx = it.f.fx !== undefined ? it.f.fx : 1, wz = it.f.fz !== undefined ? it.f.fz : 0;
      let last = null;
      it.anim.push((t) => {
        const dt = last === null ? 0 : Math.min(0.1, Math.max(0, t - last)); last = t;
        people.forEach((p) => {
          if (p.walk) {
            const u = Math.sin((t + p.ph) * 0.06) * 18, x = p.x0 + wx * u, z = p.z0 + wz * u;
            const dir = Math.cos((t + p.ph) * 0.06) >= 0 ? 1 : -1;
            p.ch.position.set(x, KT.Highway.groundY(x, z).y, z);
            p.ch.rotation.y = Math.atan2(wx * dir, wz * dir);
            KT.Models.animateCharacter(p.ch, 'walk', dt, 1);
          } else KT.Models.animateCharacter(p.ch, p.sit ? 'sit' : Math.sin(t * 0.4 + p.ph) > 0.85 ? 'wave' : 'idle', dt, 1);
        });
      });
      it.fauna = crowd;
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
      const fall = place(it, Models.waterfall(KT.FALLS.meenmutty), 0, 10);
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
    if (it.sg.within) {
      // its model is part of its host's; here only the board to read about it
      const sg = it.sg, y = Hw.groundY(sg.x, sg.z).y;
      Hw.interactables.push({ label: 'About ' + sg.name, radius: 7, pos: () => new T.Vector3(sg.x, y, sg.z), action: () => KT.Game.readSight(sg) });
      it.built = true;
      return;
    }
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
