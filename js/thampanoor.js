// Thampanoor, Thiruvananthapuram's transport hub, from the reference
// photos: Thiruvananthapuram Central railway station (a long cream stone
// building with arched windows, a central tower and corner pavilions under
// grey hipped roofs, and blue sheds over the platforms behind it) faces the
// KSRTC Central bus station (two white towers with glass strips, a curved
// glass front between them and round pavilions at its corners, with bus
// bays beside it) across Thampanoor Road. A roundabout garden sits in front
// of the station, and a glass skywalk crosses the road between the two:
// it can be walked, up its stairs at either end.
// The complex is one model; +z faces MG Road, where the lane comes in.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part, Models = KT.Models;
  const mat = (name, color, rough, extra) => KT.mat(name, Object.assign({ color, roughness: rough === undefined ? 0.8 : rough }, extra || {}));

  function canvasTex(w, h, draw, rx, ry) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = KT.maxAnisotropy;
    if (rx) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry || 1); }
    return t;
  }
  // a wall of `bays` arched windows over `floors` floors, cream with brown
  // string courses (the station's front)
  function stationWall(bays, floors) {
    return canvasTex(128, 128 * floors, (g, W, H) => {
      g.fillStyle = '#efe2bf'; g.fillRect(0, 0, W, H);
      const fh = H / floors;
      for (let f = 0; f < floors; f++) {
        const y0 = f * fh;
        g.fillStyle = '#8a5a3a'; g.fillRect(0, y0 + fh - 10, W, 6);           // string course
        // the arched window
        g.fillStyle = '#3a3226';
        g.beginPath(); g.moveTo(40, y0 + fh - 22); g.lineTo(40, y0 + 46); g.arc(64, y0 + 46, 24, Math.PI, 0); g.lineTo(88, y0 + fh - 22); g.closePath(); g.fill();
        g.fillStyle = '#6f8f9c'; g.fillRect(46, y0 + 48, 16, fh - 74); g.fillRect(66, y0 + 48, 16, fh - 74);
        g.strokeStyle = '#f8f0dc'; g.lineWidth = 4;
        g.beginPath(); g.arc(64, y0 + 46, 28, Math.PI, 0); g.stroke();
        // pilasters
        g.fillStyle = '#e3d2a8'; g.fillRect(0, y0, 10, fh); g.fillRect(W - 10, y0, 10, fh);
      }
      // grime from the monsoon
      const rng = KT.makeRng(31);
      for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(60,52,40,' + (0.04 + rng() * 0.08) + ')'; g.fillRect(rng() * W, rng() * H * 0.3, 2 + rng() * 4, 30 + rng() * 80); }
      const gr = g.createLinearGradient(0, H, 0, H - 40); gr.addColorStop(0, 'rgba(60,50,36,0.35)'); gr.addColorStop(1, 'rgba(60,50,36,0)');
      g.fillStyle = gr; g.fillRect(0, H - 40, W, 40);
    }, bays, 1);
  }
  function towerWall(bays, floors) {
    return canvasTex(64, 64, (g, W, H) => {
      g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#34505e'; g.fillRect(20, 0, 24, H);                     // a tall glass strip
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(22, 0, 5, H);
      g.fillStyle = '#dadcd6'; g.fillRect(20, H - 6, 24, 3);                  // mullion at each floor
    }, bays, floors);
  }
  function busPanel(lines, bg, fg, w, h) {
    return new T.MeshStandardMaterial({ map: KT.textTexture(lines, { bg, color: fg, border: false, width: w || 1024, height: h || 160 }), roughness: 0.5 });
  }
  // a box whose sides repeat the texture per world metre
  function hip(g, w, d, h, m, x, y, z) {
    const r = new T.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
    r.rotateY(Math.PI / 4);
    part(g, r, m, x, y + h / 2, z, 0, 0, 0, w, h, d);
  }

  // ------------------------------------------------- Thiruvananthapuram Central
  function station(root, cols) {
    const g = new T.Group();
    const stone = mat('tcStone', 0xefe2bf, 0.85), trim = mat('tcTrim', 0x8a5a3a, 0.8), roofM = mat('tcRoof', 0x5d6266, 0.75);
    const front2 = new T.MeshStandardMaterial({ map: stationWall(10, 2), roughness: 0.85 });
    const front3 = new T.MeshStandardMaterial({ map: stationWall(4, 3), roughness: 0.85 });
    const X = 26; // the front wall (it faces -x, onto the road)
    // the two long wings
    [[-42, -12], [12, 42]].forEach(([z0, z1]) => {
      const L = z1 - z0, zc = (z0 + z1) / 2;
      part(g, G.box(16, 8.5, L), stone, X + 8, 4.25, zc);
      const f = part(g, G.plane(L, 8.5), front2, X - 0.02, 4.25, zc, 0, -Math.PI / 2, 0); f.castShadow = false;
      part(g, G.box(17, 0.5, L + 0.6), trim, X + 8, 8.75, zc);
      hip(g, 16.5, L + 0.5, 3, roofM, X + 8, 9, zc);
    });
    // the central block, a storey higher, and its tower
    part(g, G.box(18, 12.5, 24), stone, X + 8, 6.25, 0);
    const fc = part(g, G.plane(24, 12.5), front3, X - 1.02, 6.25, 0, 0, -Math.PI / 2, 0); fc.castShadow = false;
    part(g, G.box(1.1, 12.5, 24), stone, X - 0.5, 6.25, 0); // (it stands a little forward)
    part(g, G.box(19, 0.6, 25), trim, X + 8, 12.8, 0);
    hip(g, 18.5, 24.5, 3.2, roofM, X + 8, 13.1, 0);
    part(g, G.box(8, 9, 8), stone, X + 2, 16, 0);
    part(g, G.box(8.6, 0.6, 8.6), trim, X + 2, 20.7, 0);
    hip(g, 8.8, 8.8, 4.5, roofM, X + 2, 21, 0);
    part(g, G.cyl(0.12, 0.12, 2.2, 6), KT.M.darkGrey, X + 2, 26.4, 0);
    // a clock on the tower
    const clock = canvasTex(128, 128, (c) => { c.fillStyle = '#f8f4e8'; c.beginPath(); c.arc(64, 64, 60, 0, 6.3); c.fill(); c.strokeStyle = '#3a2a1a'; c.lineWidth = 6; c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 22); c.moveTo(64, 64); c.lineTo(92, 74); c.stroke(); });
    part(g, new T.CircleGeometry(2, 24), new T.MeshStandardMaterial({ map: clock, roughness: 0.5 }), X - 2.03, 16.5, 0, 0, -Math.PI / 2, 0);
    // corner pavilions with pyramid roofs
    [-46, 46].forEach((z) => {
      part(g, G.box(18, 11, 8), stone, X + 8, 5.5, z);
      const fp = part(g, G.plane(8, 11), front3, X - 0.02, 5.5, z, 0, -Math.PI / 2, 0); fp.castShadow = false;
      // (and round the end, where it shows from MG Road)
      const fe = part(g, G.plane(18, 11), new T.MeshStandardMaterial({ map: stationWall(4, 3), roughness: 0.85 }), X + 8, 5.5, z + Math.sign(z) * 4.02, 0, z > 0 ? 0 : Math.PI, 0); fe.castShadow = false;
      part(g, G.box(18.6, 0.5, 8.6), trim, X + 8, 11.25, z);
      hip(g, 18.8, 8.8, 3.6, roofM, X + 8, 11.5, z);
    });
    // the porch over the entrance, on columns
    part(g, G.box(7, 0.6, 16), stone, X - 4.5, 6.2, 0);
    part(g, G.box(7.2, 0.4, 16.2), trim, X - 4.5, 6.65, 0);
    [-7, -2.4, 2.4, 7].forEach((z) => part(g, G.cyl(0.38, 0.42, 6, 12), stone, X - 7.4, 3, z));
    // the name board
    const name = busPanel([{ text: 'തിരുവനന്തപുരം സെൻട്രൽ', size: 54 }, { text: 'THIRUVANANTHAPURAM CENTRAL', size: 56 }], '#f2c230', '#1b1b1b', 1024, 200);
    part(g, G.plane(15, 2.9), name, X - 8.1, 8.6, 0, 0, -Math.PI / 2, 0);
    part(g, G.box(0.2, 3.1, 15.2), KT.M.darkGrey, X - 8.0, 8.6, 0);
    root.add(KT.bake(g));
    cols.push({ type: 'box', x: X + 8, z: 0, hw: 8, hd: 50 });
    [-7, -2.4, 2.4, 7].forEach((z) => cols.push({ type: 'circle', x: X - 7.4, z, r: 0.45 }));
  }

  // platforms, tracks, blue sheds, a foot overbridge and two trains
  function platforms(root, cols, anim) {
    const g = new T.Group();
    const conc = mat('tcPlatform', 0xbdb6a6, 0.9), edge = mat('tcEdge', 0xf2c230, 0.6), blue = mat('tcBlueSheet', 0x2f7fd0, 0.45, { metalness: 0.25, side: T.DoubleSide });
    const ballast = mat('tcBallast', 0x6e6458, 0.98), rail = mat('tcRail', 0x8a8c8e, 0.35, { metalness: 0.8 }), post = mat('tcPost', 0x3f6fa8, 0.5, { metalness: 0.4 });
    const Z0 = -64, Z1 = 64, L = Z1 - Z0;
    // platforms (x ranges) and tracks (x centres)
    // (the main line itself runs on the two tracks beyond the last platform)
    const PL = [[42, 48], [59.5, 64.5], [74.5, 79.5]], TR = KT.Rail ? [51.5, 56.5, 67, 72] : [51.5, 56.5, 67, 72, 82, 87];
    PL.forEach(([a, b]) => {
      part(g, G.box(b - a, 0.95, L), conc, (a + b) / 2, 0.475, 0);
      part(g, G.box(0.35, 0.97, L), edge, a + 0.15, 0.48, 0);
      part(g, G.box(0.35, 0.97, L), edge, b - 0.15, 0.48, 0);
      // the blue shed on blue posts
      for (let z = Z0 + 6; z <= Z1 - 6; z += 12) part(g, G.box(0.3, 5, 0.3), post, (a + b) / 2, 3, z);
      part(g, G.box(b - a + 3, 0.18, L - 6), blue, (a + b) / 2, 5.6, 0, 0, 0, 0.06);
      cols.push({ type: 'box', x: (a + b) / 2, z: 0, hw: (b - a) / 2, hd: L / 2, maxY: 0.5 });
    });
    TR.forEach((x) => {
      part(g, G.box(3.2, 0.25, L + 30), ballast, x, 0.12, 0);
      [-0.76, 0.76].forEach((o) => part(g, G.box(0.08, 0.16, L + 30), rail, x + o, 0.33, 0));
    });
    // the foot overbridge across the platforms
    part(g, G.box(46, 0.4, 3.6), conc, 66, 7.2, -30);
    part(g, G.box(46, 0.2, 4.4), blue, 66, 9.9, -30);
    [-1, 1].forEach((s) => part(g, G.box(46, 1.1, 0.12), post, 66, 8, -30 + s * 1.8));
    [[45, 0], [62, 0], [77, 0]].forEach(([x]) => part(g, G.box(0.5, 7.2, 0.5), post, x, 3.6, -30));
    root.add(KT.bake(g));
    // trains: grey-and-blue express coaches and a red engine
    const coachTex = canvasTex(256, 64, (c, W, H) => {
      c.fillStyle = '#d9dcdf'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#2f5fa0'; c.fillRect(0, 40, W, 8);
      for (let i = 0; i < 11; i++) { c.fillStyle = '#2a3238'; c.fillRect(10 + i * 22, 14, 14, 18); }
      c.fillStyle = '#5a6066'; c.fillRect(2, 10, 8, 40); c.fillRect(W - 10, 10, 8, 40);
    });
    const coachM = new T.MeshStandardMaterial({ map: coachTex, roughness: 0.5, metalness: 0.2 });
    const roofC = mat('tcCoachRoof', 0x8d9296, 0.5, { metalness: 0.4 }), under = mat('tcUnder', 0x26282a, 0.8);
    const engineM = mat('tcEngine', 0xb3261e, 0.45, { metalness: 0.2 });
    const rake = (n, engine) => {
      const t = new T.Group();
      for (let i = 0; i < n; i++) {
        const z = i * 21.6;
        part(t, G.box(3, 3.1, 21), coachM, 0, 2.55, z);
        part(t, G.cyl(1.5, 1.5, 21, 12, 1, false, 0, Math.PI), roofC, 0, 4.1, z, Math.PI / 2, 0, Math.PI / 2, 1, 1, 0.25);
        part(t, G.box(2.4, 0.8, 19), under, 0, 0.75, z);
      }
      if (engine) {
        const z = -18;
        part(t, G.box(3.1, 3.6, 16), engineM, 0, 2.8, z);
        part(t, G.box(3.15, 0.5, 16.1), mat('tcEngineStripe', 0xf2c230, 0.5), 0, 2.2, z);
        part(t, G.box(2.6, 1.2, 1), mat('tcEngineGlass', 0x1d2a31, 0.1), 0, 3.6, z - 8);
        part(t, G.box(2.4, 0.8, 15), under, 0, 0.75, z);
        part(t, G.box(0.1, 2.2, 0.1), KT.M.darkGrey, 0, 5.4, z + 3);
      }
      return KT.bake(t);
    };
    const a = rake(5, true); a.position.set(56.5, 0.3, -40); root.add(a);
    const b = rake(4, false); b.position.set(72, 0.3, -30); root.add(b);
    cols.push({ type: 'box', x: 56.5, z: 3, hw: 1.6, hd: 64, maxY: 4 }, { type: 'box', x: 72, z: 3, hw: 1.6, hd: 46, maxY: 4 });
  }

  // ----------------------------------------------- KSRTC Central bus station
  function busStation(root, cols) {
    const g = new T.Group();
    const white = mat('ksWhite', 0xf4f4f0, 0.6), grey = mat('ksGrey', 0xc9ccc8, 0.7);
    const glass = mat('ksGlass', 0x56788a, 0.1, { metalness: 0.5 });
    // podium: two floors of shops and offices
    part(g, G.box(48, 7, 64), white, -46, 3.5, 0);
    const band = canvasTex(64, 32, (c, W, H) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, W, H); c.fillStyle = '#3d5866'; c.fillRect(0, 8, W, 14); c.fillStyle = '#e8e8e4'; c.fillRect(30, 8, 3, 14); }, 12, 2);
    const bandM = new T.MeshStandardMaterial({ map: band, roughness: 0.4, metalness: 0.2 });
    const fb = part(g, G.plane(64, 7), bandM, -21.98, 3.5, 0, 0, Math.PI / 2, 0); fb.castShadow = false;
    // the two towers (the right one taller)
    [[-20, 36, 12], [20, 42, 14]].forEach(([z, H, fl]) => {
      const tw = new T.MeshStandardMaterial({ map: towerWall(5, fl), roughness: 0.5, metalness: 0.1 });
      part(g, G.box(18, H, 16), tw, -50, H / 2, z);
      part(g, G.box(18.6, 1.2, 16.6), white, -50, H + 0.6, z);
      part(g, G.box(5, 3, 5), grey, -54, H + 2.7, z + 3);
    });
    // the curved glass front between them, with a white arch at its door
    part(g, new T.CylinderGeometry(13, 13, 20, 28, 1, true, 0, Math.PI), glass, -32, 10, 0, 0, 0, 0);
    part(g, new T.CylinderGeometry(13.6, 13.6, 1.2, 28, 1, false, 0, Math.PI), white, -32, 20.6, 0);
    for (let k = 1; k < 8; k++) { const a = k / 8 * Math.PI; part(g, G.box(0.35, 20, 0.35), white, -32 + Math.sin(a) * 13.1, 10, Math.cos(a) * 13.1); }
    for (let y = 4; y < 20; y += 4) part(g, new T.TorusGeometry(13.1, 0.14, 4, 28, Math.PI), white, -32, y, 0, Math.PI / 2, 0, -Math.PI / 2);
    part(g, new T.TorusGeometry(5.5, 0.55, 8, 20, Math.PI), white, -18.9, 0.2, 0, 0, Math.PI / 2, 0);
    part(g, G.plane(10.6, 5.5), mat('ksDoor', 0x2a3a44, 0.2, { metalness: 0.4 }), -18.95, 2.75, 0, 0, Math.PI / 2, 0);
    // round pavilions at the front corners
    [-28, 28].forEach((z) => {
      const drum = canvasTex(128, 64, (c, W, H) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, W, H); c.fillStyle = '#3d5866'; c.fillRect(0, 18, W, 16); c.fillRect(0, 44, W, 10); }, 4, 1);
      part(g, G.cyl(6, 6, 9, 24), new T.MeshStandardMaterial({ map: drum, roughness: 0.4 }), -24, 4.5, z);
      part(g, G.cyl(6.6, 6.6, 0.8, 24), white, -24, 9.4, z);
    });
    // the name across the podium
    const sign = busPanel([{ text: 'KSRTC CENTRAL BUS STATION', size: 64 }, { text: 'തമ്പാനൂർ  •  THAMPANOOR', size: 48 }], '#c4212b', '#ffffff', 1024, 190);
    part(g, G.plane(15, 2.8), sign, -18.8, 8.6, -14, 0, Math.PI / 2, 0);
    root.add(KT.bake(g));
    cols.push({ type: 'box', x: -46, z: 0, hw: 24, hd: 32 }, { type: 'circle', x: -24, z: -28, r: 6 }, { type: 'circle', x: -24, z: 28, r: 6 }, { type: 'circle', x: -32, z: 0, r: 13 });
  }
  // the bus bays: long sheds with KSRTC buses parked nose-in
  function busBays(root, cols, deco) {
    const g = new T.Group();
    const shed = mat('ksShed', 0xc4212b, 0.5, { metalness: 0.3, side: T.DoubleSide }), post = mat('ksPost', 0xd8d8d4, 0.5);
    const floor = mat('ksBayFloor', 0x8f8a82, 0.9);
    [[46, 62], [74, 90]].forEach(([z0, z1]) => {
      part(g, G.box(52, 0.2, z1 - z0), floor, -46, 0.08, (z0 + z1) / 2).castShadow = false;
      part(g, G.box(52, 0.25, 6), shed, -46, 5.2, z0 + 3);
      for (let x = -70; x <= -22; x += 8) part(g, G.box(0.3, 5.2, 0.3), post, x, 2.6, z0 + 3);
    });
    root.add(KT.bake(g));
    let k = 0;
    [[46, 62], [74, 90]].forEach(([z0]) => {
      for (let x = -66; x <= -26; x += 6.5) {
        if ((k++ * 7) % 5 === 0) continue;
        const bus = Models.ksrtcBusClone();
        bus.position.set(x, 0, z0 + 6.5);
        bus.rotation.y = Math.PI;
        deco.add(bus);
        cols.push({ type: 'box', x, z: z0 + 6.5, hw: 1.4, hd: 6 });
      }
    });
  }

  // ------------------------------------------------- the road and the garden
  function sheet(root, mat, x0, x1, z0, z1, y) {
    const m = part(root, G.plane(x1 - x0, z1 - z0), mat, (x0 + x1) / 2, y, (z0 + z1) / 2, -Math.PI / 2, 0, 0);
    m.castShadow = false; m.receiveShadow = true;
    return m;
  }
  function streetAndGarden(root, cols, deco) {
    const asphalt = KT.Highway.roadMaterial ? KT.Highway.roadMaterial() : mat('tpAsphalt', 0x4a4c4f, 0.9);
    const tarmac = mat('tpTarmac', 0x55575a, 0.92);
    const paving = KT.Highway.forecourtMaterial();
    // the yards: the bus station's tarmac and the railway's gravel
    sheet(root, mat('tpYard', 0x7c7872, 0.95), -78, -18, 34, 98, 0.04);
    sheet(root, mat('tpYard', 0x7c7872, 0.95), -78, -18, -44, 34, 0.035);
    sheet(root, mat('tpGravel', 0x8a7f70, 0.98), 26, 94, -82, 82, 0.03);
    // Thampanoor Road (from MG Road, at +z) and the wide plaza before the station
    sheet(root, tarmac, -9, 9, -100, 108, 0.05);
    sheet(root, tarmac, -18, 24, -34, 34, 0.055);
    // the station forecourt and the pavement before the bus station
    sheet(root, paving, 24, 26, -48, 48, 0.08);
    sheet(root, paving, 17, 24, -48, -34, 0.07);
    sheet(root, paving, 17, 24, 34, 48, 0.07);
    sheet(root, paving, -22, -18, -40, 96, 0.07);
    // lane lines
    const white = mat('tpLine', 0xf2f2ee, 0.6);
    for (let z = -96; z < 104; z += 6) if (Math.abs(z) > 36) sheet(root, white, -0.15, 0.15, z, z + 3, 0.07);
    // the roundabout garden in front of the station
    const g = new T.Group();
    part(g, G.cyl(9.6, 9.6, 0.4, 40), mat('tpKerb', 0xe9e6df, 0.7), 6, 0.2, 0);
    part(g, G.cyl(9.2, 9.2, 0.45, 40), mat('tpLawn', 0x5f9a35, 0.95), 6, 0.23, 0);
    part(g, G.cyl(2.4, 2.8, 0.7, 20), mat('tpFountain', 0xd8d2c0, 0.6), 6, 0.6, 0);
    part(g, G.cyl(2.1, 2.1, 0.12, 20), mat('tpWater', 0x2a7f8a, 0.15, { metalness: 0.1 }), 6, 0.92, 0);
    root.add(KT.bake(g));
    [[2, 4], [10, -4], [5, -6], [9, 5]].forEach(([x, z], i) => { const t = i % 2 ? Models.mangoTree() : Models.floweringBush(KT.M.flowerRed); t.position.set(x, 0.4, z); t.scale.setScalar(i % 2 ? 0.7 : 1.2); deco.add(t); });
    cols.push({ type: 'circle', x: 6, z: 0, r: 9.6 });
    // street lamps along the road
    for (let z = -90; z <= 100; z += 22) [-10, 10].forEach((x) => {
      if (Math.abs(z) < 40 && x > 0) return;
      const l = Models.lampPost(); l.position.set(x, 0, z); l.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; deco.add(l);
      cols.push({ type: 'circle', x, z, r: 0.25 });
    });
    // the prepaid auto stand by the station
    for (let i = 0; i < 5; i++) { const a = Models.autoRickshaw(); a.position.set(19.5, 0, 22 + i * 3.4); a.rotation.y = -Math.PI / 2; deco.add(a); cols.push({ type: 'box', x: 19.5, z: 22 + i * 3.4, hw: 1.4, hd: 0.8 }); }
  }

  // ----------------------------------------------------------- skywalk
  const SKY = { y: 7.2, x0: -18.5, x1: 22, z: -16, w: 4.2, run: 24 };
  function skywalk(root, cols) {
    const g = new T.Group();
    const white = mat('swWhite', 0xf2f2ee, 0.5, { metalness: 0.2 }), deck = mat('swDeck', 0xb8b2a6, 0.85);
    const glass = mat('swGlass', 0x9fc8d8, 0.08, { metalness: 0.3, transparent: true, opacity: 0.38, depthWrite: false, side: T.DoubleSide });
    const L = SKY.x1 - SKY.x0, xc = (SKY.x0 + SKY.x1) / 2, Y = SKY.y, z = SKY.z, w = SKY.w;
    part(g, G.box(L, 0.4, w), deck, xc, Y - 0.2, z);
    part(g, G.box(L, 0.3, w + 0.4), white, xc, Y + 3.1, z);
    [-1, 1].forEach((s) => {
      part(g, G.plane(L, 2.9), glass, xc, Y + 1.5, z + s * w / 2, 0, s > 0 ? 0 : Math.PI, 0);
      part(g, G.box(L, 0.18, 0.18), white, xc, Y + 1.0, z + s * (w / 2 - 0.05));
    });
    for (let x = SKY.x0; x <= SKY.x1 + 0.1; x += 4) [-1, 1].forEach((s) => part(g, G.box(0.2, 3.2, 0.2), white, x, Y + 1.5, z + s * w / 2));
    // two pairs of columns, clear of the road
    [-13, 13].forEach((x) => [-1, 1].forEach((s) => { part(g, G.cyl(0.35, 0.35, Y, 12), white, x, Y / 2, z + s * 1.4); cols.push({ type: 'circle', x, z: z + s * 1.4, r: 0.4 }); }));
    // stairs down at each end, along -z
    [[SKY.x1 - 2, 1], [SKY.x0 + 2, -1]].forEach(([x]) => {
      const n = 24;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        part(g, G.box(3.2, 0.3, SKY.run / n + 0.02), deck, x, Y * (1 - t) - 0.15 + 0.15, z - w / 2 - t * SKY.run);
      }
      const len = Math.hypot(SKY.run, Y), ang = Math.atan2(Y, SKY.run);
      [-1, 1].forEach((s) => part(g, G.box(0.1, 0.1, len), white, x + s * 1.65, Y / 2 + 1, z - w / 2 - SKY.run / 2, -ang, 0, 0));
      part(g, G.box(3.4, 0.3, 3.4), white, x, Y + 3.1, z - w / 2 - 1.7);
    });
    root.add(KT.bake(g));
    // the glass sides stop you walking off the bridge
    [-1, 1].forEach((s) => cols.push({ type: 'box', x: xc, z: z + s * (w / 2 + 0.05), hw: L / 2, hd: 0.15, minY: Y - 0.6 }));
  }
  // how high the walkway is at (lx, lz), in the model's axes, or null
  function skyFloor(lx, lz) {
    const Y = SKY.y, z = SKY.z, w = SKY.w;
    if (lx >= SKY.x0 - 0.3 && lx <= SKY.x1 + 0.3 && Math.abs(lz - z) <= w / 2) return Y;
    for (const x of [SKY.x1 - 2, SKY.x0 + 2]) {
      if (Math.abs(lx - x) <= 1.6) {
        const t = (z - w / 2 - lz) / SKY.run;
        if (t >= -0.02 && t <= 1) return Y * (1 - KT.clamp(t, 0, 1));
      }
    }
    return null;
  }

  // ------------------------------------------------------------ people
  function crowd(it, root, spots, seed) {
    const rng = KT.makeRng(seed), people = [];
    const LOOKS = [['male', 'mundu'], ['female', 'saree'], ['male', 'tee'], ['female', 'churidar'], ['male', 'casual'], ['female', 'casual']];
    spots.forEach(([x0, x1, z0, z1, n]) => {
      for (let k = 0; k < n; k++) {
        const look = LOOKS[(k + people.length) % LOOKS.length], female = look[0] === 'female';
        const ch = Models.character({ gender: look[0], outfit: look[1], lite: true, hair: female ? ['bun', 'braid', 'loose'][k % 3] : ['short', 'default', 'wavy'][k % 3],
          skin: [0xc08660, 0xe8c8a8, 0x8d5a3b, 0xd9a27c][k % 4], acc: { bag: rng() < 0.5 }, seed: seed + people.length });
        ch.position.set(x0 + rng() * (x1 - x0), 0.08, z0 + rng() * (z1 - z0));
        ch.rotation.y = rng() * 6.28;
        root.add(ch);
        people.push({ ch, ph: rng() * 9 });
      }
    });
    let last = null;
    it.anim.push((t) => {
      const dt = last === null ? 0 : Math.min(0.1, Math.max(0, t - last)); last = t;
      people.forEach((p) => Models.animateCharacter(p.ch, Math.sin(t * 0.35 + p.ph) > 0.9 ? 'wave' : 'idle', dt, 1));
    });
  }

  KT.Dest.EXTRA.thampanoor = function (it) {
    const Hw = KT.Highway, root = new T.Group(), cols = [];
    station(root, cols);
    platforms(root, cols, it.anim);
    busStation(root, cols);
    // parked buses and autos, lamps and trees: merged into one model
    const deco = new T.Group();
    busBays(root, cols, deco);
    streetAndGarden(root, cols, deco);
    root.add(KT.bake(deco));
    skywalk(root, cols);
    root.userData.colliders = cols;
    KT.Dest.place(it, root, 0, 0);
    const people = new T.Group();
    root.add(people);
    crowd(it, people, [[18, 24, -40, -12, 7], [-21, -17, -20, 40, 7], [42.5, 47.5, -50, 40, 8], [60, 64, -40, 30, 4]], 4040);
    // walk up onto the skywalk (in the model's own axes)
    const y0 = root.position.y;
    Hw.addPlatform(root.position.x, root.position.z, root.rotation.y, 60, (lx, lz) => { const y = skyFloor(lx, lz); return y === null ? null : y0 + y; });
  };
})();
