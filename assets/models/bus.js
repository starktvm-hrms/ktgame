// KSRTC "Super Fast" bus: cream body, red skirt and swoosh livery, KSRTC
// destination board, quad round headlamps, roof carrier and rear ladder.
// Origin on the ground at the bus centre; the bus faces +z. Right-hand
// drive (driver at -x) with passenger doors on the left (+x) side.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};

  const CREAM = '#f2d27a', RED = '#c4212b', DARK_RED = '#8e1219';
  const L = 11.0, W = 2.5;
  Models.BUS = { length: L, width: W, frontAxle: L / 2 - 2.2, rearAxle: -L / 2 + 2.7, wheelR: 0.5, driver: new T.Vector3(-0.62, 1.05, L / 2 - 1.15) };

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = KT.maxAnisotropy;
    return t;
  }

  // Side livery below the windows: red skirt, swoosh arrow, "Super Fast".
  function sideTexture(mirror) {
    return canvasTex(2048, 200, (g, w, h) => {
      if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
      g.fillStyle = CREAM; g.fillRect(0, 0, w, h);
      g.fillStyle = RED; g.fillRect(0, h * 0.52, w, h * 0.48);
      g.fillStyle = DARK_RED; g.fillRect(0, h * 0.5, w, 5);
      // swoosh: a long red arrow sweeping towards the front (left edge = front)
      g.fillStyle = RED;
      g.beginPath();
      g.moveTo(w * 0.62, h * 0.06); g.lineTo(w * 0.7, h * 0.06); g.lineTo(w * 0.5, h * 0.52); g.lineTo(w * 0.42, h * 0.52);
      g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(w * 0.5, h * 0.2); g.lineTo(w * 0.2, h * 0.2); g.lineTo(w * 0.17, h * 0.13); g.lineTo(w * 0.1, h * 0.27);
      g.lineTo(w * 0.17, h * 0.41); g.lineTo(w * 0.2, h * 0.34); g.lineTo(w * 0.44, h * 0.34); g.closePath(); g.fill();
      g.fillRect(w * 0.7, h * 0.06, w * 0.3, h * 0.07);
      // lettering: draw un-mirrored
      g.save();
      if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
      g.fillStyle = RED;
      g.font = 'italic bold 64px Georgia, "Times New Roman", serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const tx = mirror ? w * 0.33 : w * 0.67;
      g.fillText('Super Fast', tx, h * 0.3);
      g.fillStyle = '#f7e9b8';
      g.font = 'bold 34px Arial, sans-serif';
      g.fillText('KERALA STATE R.T.C', mirror ? w * 0.72 : w * 0.28, h * 0.77);
      g.restore();
    });
  }

  function textPanel(lines, w, h, bg, fg, font) {
    return canvasTex(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      lines.forEach((ln, i) => { g.font = font; g.fillText(ln, w / 2, h * (i + 0.5) / lines.length); });
    });
  }

  function panel(parent, tex, w, h, x, y, z, ry) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
    m.position.set(x, y, z);
    m.rotation.y = ry || 0;
    parent.add(m);
    return m;
  }

  function wheel(dual) {
    const g = new T.Group();
    const tyre = KT.mat('tyre', { color: 0x1c1c1c, roughness: 0.9 });
    const rim = KT.mat('rim', { color: 0x9a9a9a, metalness: 0.6, roughness: 0.35 });
    const hub = KT.mat('hub', { color: 0x5a5a5a, metalness: 0.5, roughness: 0.4 });
    const widths = dual ? [-0.16, 0.16] : [0];
    widths.forEach((o) => {
      part(g, new T.CylinderGeometry(0.5, 0.5, 0.3, 24), tyre, o, 0, 0, 0, 0, Math.PI / 2);
      part(g, G.torus(0.42, 0.08, 8, 24), tyre, o, 0, 0, 0, Math.PI / 2, 0);
    });
    part(g, new T.CylinderGeometry(0.3, 0.3, dual ? 0.62 : 0.32, 18), rim, 0, 0, 0, 0, 0, Math.PI / 2);
    part(g, new T.CylinderGeometry(0.11, 0.13, dual ? 0.68 : 0.38, 10), hub, 0, 0, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      [-1, 1].forEach((sd) => part(g, G.sph(0.025, 6, 4), hub, sd * (dual ? 0.32 : 0.17), Math.cos(a) * 0.18, Math.sin(a) * 0.18));
    }
    return g;
  }

  Models.ksrtcBus = function (opts) {
    opts = opts || {};
    const g = new T.Group();
    const M = KT.M;
    const cream = KT.mat('busCream', { color: 0xf2d27a, roughness: 0.45, metalness: 0.05 });
    const red = KT.mat('busRed', { color: 0xc4212b, roughness: 0.45, metalness: 0.05 });
    // Window glass is made of one-sided panels facing outwards: dark and
    // glossy from outside, invisible from inside, so the driver's view
    // looks straight out through them.
    const darkGlass = KT.mat('busGlassPane', { color: 0x1d2a31, roughness: 0.06, metalness: 0.35 });
    const pane = (w, h, x, y, z, ry) => part(g, G.plane(w, h), darkGlass, x, y, z, 0, ry, 0);
    const black = KT.mat('busBlack', { color: 0x161616, roughness: 0.7 });
    const chrome = KT.mat('busChrome', { color: 0xd8d8d8, metalness: 0.8, roughness: 0.25 });
    const seatBlue = KT.mat('busSeat', { color: 0x2d4f9a, roughness: 0.7 });
    const lamp = KT.mat('busLamp', { color: 0xfffbe8, emissive: 0xfff2c0, emissiveIntensity: 0.6, roughness: 0.2 });
    const orange = KT.mat('busOrange', { color: 0xf08a1a, emissive: 0x6a3000, emissiveIntensity: 0.4 });
    const tail = KT.mat('busTail', { color: 0xd01818, emissive: 0x500000, emissiveIntensity: 0.5 });
    const rb = KT.roundBox;
    // ---- body shell
    part(g, rb(W, 0.78, L, 0.1), red, 0, 0.94, 0);                // skirt
    part(g, rb(W, 1.78, L, 0.14), cream, 0, 2.2, 0);              // upper body
    part(g, rb(W - 0.06, 0.16, L - 0.12, 0.07), cream, 0, 3.12, -0.02); // roof
    part(g, rb(W - 0.5, 0.1, L - 0.8, 0.05), cream, 0, 3.22, -0.2); // roof crown
    part(g, rb(W + 0.28, 0.1, L - 0.6, 0.04), red, 0, 2.97, -0.25); // red roof-line stripe
    part(g, rb(W + 0.28, 0.12, L - 0.2, 0.04), red, 0, 1.62, 0);   // stripe under windows
    // ---- side livery and windows (the rounded body bevels out to SIDE)
    const SIDE = W / 2 + 0.126;
    const sideH = 1.0;
    panel(g, sideTexture(false), L - 0.5, sideH, SIDE + 0.016, 1.08, -0.1, Math.PI / 2);
    panel(g, sideTexture(true), L - 0.5, sideH, -SIDE - 0.016, 1.08, -0.1, -Math.PI / 2);
    const winY = 2.27, winH = 0.95;
    [-1, 1].forEach((s) => {
      const x = s * (SIDE + 0.004);
      const start = s > 0 ? L / 2 - 2.4 : L / 2 - 1.7; // door gap on the left (+x) side
      pane(start + L / 2 - 0.6, winH, s * (SIDE + 0.014), winY, (start - (L / 2 - 0.6)) / 2, s * Math.PI / 2);
      // pillars, shutters and window frames
      let k = 0;
      for (let z = start; z > -L / 2 + 0.6; z -= 0.92) {
        part(g, G.box(0.05, winH + 0.06, 0.1), cream, x + s * 0.012, winY, z);
        if (k % 3 === 1) part(g, G.box(0.03, winH * 0.42, 0.8), KT.mat('busShutter', { color: 0xe9c768, roughness: 0.6 }), x + s * 0.02, winY + winH * 0.27, z - 0.46);
        k++;
      }
      part(g, G.box(0.06, 0.06, start + L / 2 - 0.6), cream, x + s * 0.01, winY - winH / 2 - 0.02, (start - (L / 2 - 0.6)) / 2);
      // small "rib" bars across the window (Kerala buses have a guard rail)
      part(g, G.box(0.03, 0.035, start + L / 2 - 0.7), chrome, x + s * 0.04, winY - 0.05, (start - (L / 2 - 0.6)) / 2);
    });
    // front door (left side, near the front) and rear door
    [L / 2 - 1.55, -L / 2 + 1.9].forEach((z) => {
      part(g, G.box(0.04, 2.2, 0.92), cream, SIDE + 0.01, 1.68, z);
      pane(0.7, 0.95, SIDE + 0.035, 2.25, z, Math.PI / 2);
      pane(0.32, 0.7, SIDE + 0.035, 1.15, z + 0.17, Math.PI / 2);
      part(g, G.box(0.6, 0.12, 0.9), black, W / 2 - 0.2, 0.45, z);
    });
    // ---- front
    const fz = L / 2 + 0.005;
    pane(W - 0.18, 1.12, 0, 2.3, fz + 0.012, 0);
    part(g, G.box(0.08, 1.12, 0.06), cream, 0, 2.3, fz + 0.01);
    part(g, G.box(W - 0.1, 0.06, 0.06), cream, 0, 1.73, fz + 0.01);
    // KSRTC destination board and FP panel
    panel(g, textPanel(['KSRTC'], 512, 96, '#fdfdfb', '#c4212b', 'bold 74px Arial, sans-serif'), 1.4, 0.26, -0.25, 3.0, fz + 0.03);
    panel(g, textPanel(['FP'], 128, 96, '#c4212b', '#ffffff', 'bold 60px Arial, sans-serif'), 0.32, 0.24, 0.82, 3.0, fz + 0.03);
    part(g, G.box(W - 0.2, 0.32, 0.05), black, 0, 3.0, fz + 0.005);
    // wipers
    [-0.55, 0.55].forEach((x) => part(g, G.box(0.02, 0.75, 0.02), black, x, 2.05, fz + 0.05, 0, 0, x > 0 ? -0.5 : 0.5));
    // face: SUPER FAST, grille, quad headlamps, indicators, bumper, plate
    panel(g, textPanel(['SUPER FAST'], 512, 64, CREAM, '#c4212b', 'bold italic 46px Georgia, serif'), 1.2, 0.15, 0, 1.52, fz + 0.03);
    for (let i = 0; i < 4; i++) part(g, KT.roundBox(0.95, 0.045, 0.05, 0.015), black, 0, 1.18 - i * 0.075, fz + 0.03);
    part(g, G.cyl(0.06, 0.06, 0.04, 16), chrome, 0, 1.33, fz + 0.04, Math.PI / 2);
    [-1, 1].forEach((s) => {
      [0.62, 0.86].forEach((x) => {
        part(g, G.cyl(0.1, 0.1, 0.05, 20), chrome, s * x, 1.0, fz + 0.03, Math.PI / 2);
        part(g, G.cyl(0.08, 0.08, 0.06, 20), lamp, s * x, 1.0, fz + 0.045, Math.PI / 2);
      });
      part(g, KT.roundBox(0.14, 0.14, 0.05, 0.02), orange, s * 1.1, 1.02, fz + 0.03);
      part(g, G.box(0.2, 0.08, 0.06), M.white, s * 0.75, 0.58, fz + 0.12);
    });
    part(g, KT.roundBox(W + 0.06, 0.2, 0.22, 0.06), red, 0, 0.62, fz + 0.03);
    part(g, G.box(W - 0.4, 0.04, 0.02), M.white, 0, 0.66, fz + 0.15);
    panel(g, textPanel([opts.plate || 'KL 15 A 1177'], 384, 96, '#f5d21e', '#111', 'bold 54px Arial, sans-serif'), 0.62, 0.15, 0, 0.6, fz + 0.15);
    // mirrors
    [-1, 1].forEach((s) => {
      part(g, G.cyl(0.015, 0.015, 0.7, 6), black, s * (W / 2 + 0.25), 2.55, fz - 0.05, 0, 0, s * 1.2);
      part(g, KT.roundBox(0.18, 0.36, 0.05, 0.02), black, s * (W / 2 + 0.52), 2.35, fz - 0.05);
    });
    // ---- rear: window, lettering, lamps, plate, ladder and roof carrier
    const rz = -L / 2 - 0.005;
    pane(W - 0.6, 0.95, 0, 2.3, rz - 0.012, Math.PI);
    panel(g, textPanel(['EMERGENCY EXIT'], 512, 48, '#223038', '#f5f5f5', 'bold 32px Arial'), 0.9, 0.08, 0, 2.7, rz - 0.03, Math.PI);
    panel(g, textPanel(['Super Fast'], 512, 96, CREAM, '#c4212b', 'italic bold 60px Georgia, serif'), 0.9, 0.17, 0, 1.55, rz - 0.03, Math.PI);
    [-1, 1].forEach((s) => part(g, KT.roundBox(0.28, 0.2, 0.05, 0.03), tail, s * 0.95, 0.95, rz - 0.02));
    panel(g, textPanel([opts.plate || 'KL 15 A 1177'], 384, 160, '#f5d21e', '#111', 'bold 54px Arial, sans-serif'), 0.4, 0.25, 0.55, 0.85, rz - 0.04, Math.PI);
    const lx = W / 2 - 0.22;
    [-0.18, 0.18].forEach((o) => part(g, G.box(0.04, 2.7, 0.04), chrome, lx + o, 1.95, rz - 0.1));
    for (let i = 0; i < 10; i++) part(g, G.cyl(0.015, 0.015, 0.36, 6), chrome, lx, 0.8 + i * 0.26, rz - 0.1, 0, 0, Math.PI / 2);
    const cz0 = -L / 2 + 0.5, cz1 = -0.6;
    [-1, 1].forEach((s) => {
      part(g, G.cyl(0.025, 0.025, cz1 - cz0, 6), chrome, s * (W / 2 - 0.15), 3.48, (cz0 + cz1) / 2, Math.PI / 2);
      for (let z = cz0; z <= cz1 + 0.01; z += 0.65) part(g, G.cyl(0.02, 0.02, 0.26, 6), chrome, s * (W / 2 - 0.15), 3.35, z);
    });
    for (let z = cz0; z <= cz1 + 0.01; z += 0.65) part(g, G.cyl(0.02, 0.02, W - 0.3, 6), chrome, 0, 3.48, z, 0, 0, Math.PI / 2);
    // ---- interior: floor, seats, driver's cab
    part(g, G.box(W - 0.15, 0.06, L - 0.3), KT.mat('busFloor', { color: 0x5a5048 }), 0, 1.0, 0);
    for (let z = L / 2 - 2.6; z > -L / 2 + 0.8; z -= 0.9) {
      [-0.72, 0.62].forEach((x) => {
        part(g, G.box(x < 0 ? 0.9 : 0.62, 0.12, 0.45), seatBlue, x, 1.45, z);
        part(g, G.box(x < 0 ? 0.9 : 0.62, 0.62, 0.1), seatBlue, x, 1.78, z - 0.2);
      });
    }
    part(g, G.box(0.55, 0.12, 0.5), seatBlue, Models.BUS.driver.x, 1.42, Models.BUS.driver.z - 0.05);
    part(g, G.box(0.55, 0.65, 0.1), seatBlue, Models.BUS.driver.x, 1.75, Models.BUS.driver.z - 0.3);
    part(g, G.box(W - 0.2, 0.35, 0.5), black, 0, 1.55, L / 2 - 0.35);
    const baked = KT.bake(g);
    // animated parts
    const wheels = [];
    [[W / 2 - 0.2, Models.BUS.frontAxle, false], [-W / 2 + 0.2, Models.BUS.frontAxle, false], [W / 2 - 0.32, Models.BUS.rearAxle, true], [-W / 2 + 0.32, Models.BUS.rearAxle, true]].forEach((w) => {
      const pivot = new T.Group();
      pivot.position.set(w[0], 0.5, w[1]);
      baked.add(pivot);
      const wh = wheel(w[2]);
      pivot.add(wh);
      wheels.push({ pivot, spin: wh, front: !w[2] });
    });
    const steer = new T.Group();
    steer.position.set(Models.BUS.driver.x, 1.72, Models.BUS.driver.z + 0.42);
    steer.rotation.x = -1.0;
    baked.add(steer);
    part(steer, G.torus(0.22, 0.025, 8, 24), black, 0, 0, 0);
    part(steer, G.box(0.42, 0.03, 0.02), black, 0, 0, 0);
    part(steer, G.cyl(0.03, 0.03, 0.3, 8), black, 0, 0, -0.15, Math.PI / 2);
    baked.userData.wheels = wheels;
    baked.userData.steer = steer;
    baked.userData.isBus = true;
    return baked;
  };

  // Cheap clone for other players' buses: shares geometry & materials.
  let busProto = null;
  Models.ksrtcBusClone = function () {
    if (!busProto) busProto = Models.ksrtcBus();
    const c = busProto.clone(true);
    c.userData = { isBus: true, wheels: [], steer: null };
    c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return c;
  };
})();
