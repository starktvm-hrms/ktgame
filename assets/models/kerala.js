// Highway & district landmark models: electric pole, milestone, district
// welcome gate, KSRTC bus stand, gopuram, hill shrine, arch dam, fort and
// mosque.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;

  Models.electricPole = function () {
    const g = new T.Group();
    const conc = KT.mat('concrete', { color: 0xc9c6bd, roughness: 0.9 });
    part(g, G.cyl(0.09, 0.14, 8, 8), conc, 0, 4, 0);
    part(g, G.box(1.6, 0.1, 0.1), conc, 0, 7.4, 0);
    [-0.7, 0, 0.7].forEach((x) => part(g, G.cyl(0.04, 0.05, 0.18, 8), KT.mat('insulator', { color: 0x6a8a6a }), x, 7.55, 0));
    return KT.bake(g);
  };

  // Kerala road milestone: white stone with a yellow rounded cap.
  Models.milestone = function () {
    const g = new T.Group();
    part(g, G.box(0.42, 0.55, 0.16), M().white, 0, 0.27, 0);
    part(g, new T.CylinderGeometry(0.21, 0.21, 0.16, 16, 1, false, 0, Math.PI), KT.mat('mileYellow', { color: 0xf2c230 }), 0, 0.55, 0, Math.PI / 2, 0, Math.PI / 2);
    part(g, G.box(0.36, 0.06, 0.17), KT.mat('mileBlack', { color: 0x222222 }), 0, 0.36, 0);
    return KT.bake(g);
  };

  function signMaterial(lines, opts) {
    return new T.MeshStandardMaterial({ map: KT.textTexture(lines, opts), roughness: 0.6 });
  }

  // Welcome gate spanning the road, with the district name in English and
  // Malayalam and a small tiled roof.
  Models.districtGate = function (d) {
    const g = new T.Group();
    const span = 9;
    [-1, 1].forEach((s) => {
      part(g, KT.roundBox(1.2, 7.2, 1.2, 0.12), M().laterite, s * span, 3.6, 0);
      part(g, G.box(1.5, 0.4, 1.5), M().stoneGrey, s * span, 0.2, 0);
      part(g, G.box(1.45, 0.25, 1.45), M().stoneGrey, s * span, 7.25, 0);
      part(g, G.cyl(0.18, 0.25, 0.4, 12), M().brass, s * span, 7.6, 0);
      part(g, G.sph(0.22), M().lampGlow, s * span, 8.0, 0);
    });
    part(g, G.box(span * 2 + 1.5, 0.6, 0.8), M().woodDark, 0, 6.6, 0);
    const mat = signMaterial([{ text: 'Welcome to ' + d.name, size: 76 }, { text: d.ml, size: 62 }, { text: 'District of Kerala • God’s Own Country', size: 34 }], { width: 1600, height: 360, bg: '#1f5f3f', color: '#fff3d0', borderColor: '#d4a434' });
    const board = new T.Mesh(G.box(13, 2.9, 0.3), [M().woodDark, M().woodDark, M().woodDark, M().woodDark, mat, mat]);
    board.position.y = 5.0;
    board.castShadow = true;
    board.userData.noBake = true;
    g.add(board);
    part(g, KT.gableRoofGeometry(span * 2 + 3, 2.4, 1.2), M().roof, 0, 6.9, 0);
    for (let i = -4; i <= 4; i++) part(g, G.sph(0.12, 8, 6), M().gold, i * 2, 6.95, 0.45);
    g.userData.colliders = [{ type: 'circle', x: -span, z: 0, r: 0.9 }, { type: 'circle', x: span, z: 0, r: 0.9 }];
    return KT.bake(g);
  };

  Models.busStand = function (name) {
    const g = new T.Group();
    const red = KT.mat('busRed', { color: 0xc4212b, roughness: 0.45, metalness: 0.05 });
    const cream = KT.mat('busCream', { color: 0xf2d27a, roughness: 0.45, metalness: 0.05 });
    part(g, G.box(12, 0.3, 4.5), M().stoneGrey, 0, 0.15, 0);
    [-5.5, -1.8, 1.8, 5.5].forEach((x) => part(g, G.cyl(0.12, 0.12, 3.2, 10), red, x, 1.9, 1.6));
    part(g, G.box(12, 3.2, 0.25), cream, 0, 1.9, -2.1);
    part(g, G.box(12, 0.5, 0.27), red, 0, 0.55, -2.1);
    part(g, KT.roundBox(12.6, 0.3, 5.0, 0.1), red, 0, 3.6, -0.1);
    part(g, G.box(12.4, 0.1, 4.8), cream, 0, 3.42, -0.1);
    [-4, 0, 4].forEach((x) => {
      part(g, G.box(3, 0.08, 0.5), M().wood, x, 0.75, -1.4);
      part(g, G.box(3, 0.5, 0.06), M().wood, x, 1.05, -1.7);
      [-1.3, 1.3].forEach((o) => part(g, G.box(0.08, 0.45, 0.45), M().darkGrey, x + o, 0.5, -1.4));
    });
    const mat = signMaterial([{ text: 'KSRTC', size: 70 }, { text: name + ' Bus Stand', size: 40 }], { width: 900, height: 220, bg: '#c4212b', color: '#ffffff', borderColor: '#f2d27a' });
    const sign = new T.Mesh(G.box(5, 1.2, 0.12), [red, red, red, red, mat, mat]);
    sign.position.set(0, 4.4, 1.8);
    sign.userData.noBake = true;
    g.add(sign);
    // bus stop pole
    part(g, G.cyl(0.05, 0.05, 2.8, 8), M().darkGrey, 6.8, 1.4, 1.8);
    const stop = signMaterial([{ text: 'BUS', size: 90 }, { text: 'STOP', size: 60 }], { width: 256, height: 256, bg: '#1b4f9a', color: '#fff' });
    const ss = new T.Mesh(G.box(0.8, 0.8, 0.05), [M().darkGrey, M().darkGrey, M().darkGrey, M().darkGrey, stop, stop]);
    ss.position.set(6.8, 2.8, 1.8);
    ss.userData.noBake = true;
    g.add(ss);
    g.userData.colliders = [{ type: 'box', x: 0, z: -2.1, hw: 6.1, hd: 0.3 }, { type: 'circle', x: -5.5, z: 1.6, r: 0.25 }, { type: 'circle', x: 5.5, z: 1.6, r: 0.25 }, { type: 'circle', x: -1.8, z: 1.6, r: 0.25 }, { type: 'circle', x: 1.8, z: 1.6, r: 0.25 }];
    return KT.bake(g);
  };

  // Dravidian temple tower with seven tiers and golden kalasams.
  Models.gopuram = function () {
    const g = new T.Group();
    const stone = KT.mat('gopuramStone', { color: 0xd8c7a6, roughness: 0.85 });
    const shade = KT.mat('gopuramShade', { color: 0xb8a684, roughness: 0.9 });
    part(g, G.box(18, 1.2, 10), M().stoneGrey, 0, 0.6, 0);
    [-1, 1].forEach((s) => part(g, G.box(6.5, 7, 9), stone, s * 5.3, 4.7, 0));
    part(g, G.box(5, 1.5, 9), stone, 0, 7.45, 0);
    part(g, G.box(4, 6, 0.4), M().windowDark, 0, 4.2, 4.3);
    let y = 8.2, w = 17, d = 9;
    for (let i = 0; i < 7; i++) {
      const h = 2.6;
      part(g, G.box(w, h, d), i % 2 ? shade : stone, 0, y + h / 2, 0);
      part(g, G.box(w + 0.4, 0.3, d + 0.4), shade, 0, y + h, 0);
      const n = Math.max(3, Math.round(w / 1.6));
      for (let k = 0; k < n; k++) {
        const x = -w / 2 + (k + 0.5) * (w / n);
        part(g, G.box(0.7, h * 0.6, 0.5), shade, x, y + h * 0.5, d / 2 + 0.2);
        part(g, G.box(0.7, h * 0.6, 0.5), shade, x, y + h * 0.5, -d / 2 - 0.2);
      }
      y += h + 0.3;
      w *= 0.84; d *= 0.86;
    }
    part(g, new T.CylinderGeometry(d / 2 + 0.5, d / 2 + 0.5, w + 1, 18, 1, false, 0, Math.PI), stone, 0, y, 0, 0, 0, Math.PI / 2);
    for (let k = 0; k < 7; k++) {
      const x = -w / 2 + 0.5 + (k * w) / 6;
      part(g, G.sph(0.35), M().gold, x, y + d / 2 + 0.8, 0);
      part(g, G.cone(0.18, 0.7, 10), M().gold, x, y + d / 2 + 1.35, 0);
    }
    g.userData.colliders = [{ type: 'box', x: -5.3, z: 0, hw: 3.3, hd: 4.6 }, { type: 'box', x: 5.3, z: 0, hw: 3.3, hd: 4.6 }];
    return KT.bake(g);
  };

  // Hilltop shrine (Sabarimala) reached by a long stairway.
  Models.hillShrine = function () {
    const g = new T.Group();
    part(g, KT.blob(18, 2, 0.08, 4), M().leaf, 0, 0, 0, 0, 0, 0, 1, 0.55, 1);
    part(g, KT.blob(10, 2, 0.12, 5), M().rockMoss, -6, 5, -4, 0, 0, 0, 1, 0.5, 1);
    for (let i = 0; i < 18; i++) part(g, G.box(3, 0.3, 0.9), M().stoneGrey, 0, 0.15 + i * 0.55, 17 - i * 0.85);
    const top = new T.Group();
    top.position.set(0, 9.9, 0);
    g.add(top);
    part(top, G.box(6, 0.6, 6), M().stoneGrey, 0, 0.3, 0);
    part(top, G.box(4, 2.6, 4), M().plasterCream, 0, 1.9, 0);
    part(top, KT.hipRoofGeometry(5.2, 5.2, 2.2, 0.02), M().gold, 0, 3.2, 0);
    part(top, G.cyl(0.06, 0.06, 6, 8), M().gold, 3, 3, 3);
    part(top, G.plane(1.2, 0.7), KT.mat('saffron', { color: 0xf08a1a, side: T.DoubleSide }), 3.6, 5.6, 3);
    g.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 15 }];
    return KT.bake(g);
  };

  // Curved concrete arch dam with a walkway (Idukki).
  Models.archDam = function () {
    const g = new T.Group();
    const conc = KT.mat('damConcrete', { color: 0xbdb8ac, roughness: 0.92, side: T.DoubleSide });
    const R = 55, H = 20, arc = 1.1;
    const wall = new T.CylinderGeometry(R, R + 3, H, 40, 1, true, Math.PI - arc / 2, arc);
    part(g, wall, conc, 0, H / 2 - 4, R + 6);
    const top = new T.CylinderGeometry(R + 0.2, R + 0.2, 0.8, 40, 1, false, Math.PI - arc / 2, arc);
    part(g, top, KT.mat('damTop', { color: 0x9e9a90 }), 0, H - 3.6, R + 6);
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI - arc / 2 + (i / 12) * arc;
      part(g, G.box(0.15, 1.1, 0.15), M().white, Math.sin(a) * (R - 0.3), H - 2.6, R + 6 + Math.cos(a) * (R - 0.3));
    }
    const cols = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI - arc / 2 + (i / 8) * arc;
      cols.push({ type: 'circle', x: Math.sin(a) * R, z: R + 6 + Math.cos(a) * R, r: 3.5 });
    }
    g.userData.colliders = cols;
    return KT.bake(g);
  };

  // Laterite fort with round bastions (Palakkad, Kannur); "bekal" adds the
  // round observation tower of Bekal Fort.
  Models.fort = function (bekal) {
    const g = new T.Group();
    const S = 34, H = 6, hs = S / 2;
    const cols = [];
    const wall = (x, z, len, rot) => {
      part(g, G.box(len, H, 1.6), M().laterite, x, H / 2, z, 0, rot, 0);
      for (let i = -len / 2 + 1; i < len / 2; i += 2) {
        const cx = x + Math.cos(rot) * i, cz = z - Math.sin(rot) * i;
        part(g, G.box(0.9, 0.9, 1.6), M().laterite, cx, H + 0.45, cz, 0, rot, 0);
      }
      cols.push({ type: 'box', x, z, hw: len / 2, hd: 0.9, rot });
    };
    wall(0, -hs, S, 0);
    wall(-hs, 0, S, Math.PI / 2);
    wall(hs, 0, S, Math.PI / 2);
    wall(-(hs + 3) / 2 - 0.5, hs, hs - 4, 0);
    wall((hs + 3) / 2 + 0.5, hs, hs - 4, 0);
    [[-hs, -hs], [hs, -hs], [-hs, hs], [hs, hs]].forEach((c) => {
      part(g, G.cyl(3.2, 3.6, H + 1.5, 20), M().laterite, c[0], (H + 1.5) / 2, c[1]);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        part(g, G.box(0.8, 0.8, 0.8), M().laterite, c[0] + Math.cos(a) * 3, H + 1.9, c[1] + Math.sin(a) * 3);
      }
      cols.push({ type: 'circle', x: c[0], z: c[1], r: 3.6 });
    });
    // arched gateway
    [-2.6, 2.6].forEach((x) => part(g, G.box(1.2, H + 2, 2.2), M().laterite, x, (H + 2) / 2, hs));
    part(g, G.box(6.4, 1.5, 2.2), M().laterite, 0, H + 1.2, hs);
    part(g, G.box(4, 5, 0.3), M().woodDark, 0, 2.5, hs - 0.5);
    if (bekal) {
      part(g, G.cyl(5, 5.6, 12, 24), M().laterite, 0, 6, -4);
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        part(g, G.box(0.9, 0.9, 0.9), M().laterite, Math.cos(a) * 4.8, 12.45, -4 + Math.sin(a) * 4.8);
      }
      for (let i = 0; i < 6; i++) part(g, G.box(2, 0.3, 0.8), M().stoneGrey, 5.8, 0.6 + i * 1.8, -4 + i * 0.9 - 3, 0, 0, 0.4);
      cols.push({ type: 'circle', x: 0, z: -4, r: 5.6 });
    }
    g.userData.colliders = cols;
    return KT.bake(g);
  };

  Models.mosque = function () {
    const g = new T.Group();
    const white = KT.mat('mosqueWhite', { color: 0xf4f3ee, roughness: 0.7 });
    const green = KT.mat('mosqueGreen', { color: 0x1f8a55, roughness: 0.4, metalness: 0.2 });
    part(g, G.box(22, 0.8, 18), M().stoneGrey, 0, 0.4, 0);
    part(g, G.box(18, 7, 12), white, 0, 4.3, -1);
    for (let i = 0; i < 5; i++) {
      part(g, G.box(2, 3.4, 0.3), M().windowDark, -6 + i * 3, 2.6, 5.05);
      part(g, G.cyl(1, 1, 0.3, 16, 1, false), M().windowDark, -6 + i * 3, 4.3, 5.05, Math.PI / 2);
    }
    part(g, G.cyl(4.6, 5, 1.4, 28), white, 0, 8.5, -1);
    part(g, new T.SphereGeometry(4.6, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), green, 0, 9.2, -1);
    part(g, G.cyl(0.12, 0.2, 2, 8), M().gold, 0, 14.6, -1);
    part(g, G.torus(0.5, 0.1, 6, 16, Math.PI * 1.5), M().gold, 0, 16, -1, 0, 0, 2.3);
    [-1, 1].forEach((s) => {
      const x = s * 10;
      part(g, G.cyl(0.9, 1.1, 18, 16), white, x, 9.4, 4);
      [7, 13].forEach((y) => part(g, G.cyl(1.5, 1.5, 0.4, 16), white, x, y, 4));
      part(g, new T.SphereGeometry(1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), green, x, 18.4, 4);
      part(g, G.cone(0.15, 1.6, 8), M().gold, x, 20.1, 4);
    });
    for (let i = 0; i < 9; i++) part(g, G.box(1.2, 0.7, 0.7), white, -8 + i * 2, 8.2, 5);
    g.userData.colliders = [{ type: 'box', x: 0, z: -1, hw: 9.2, hd: 6.2 }, { type: 'circle', x: -10, z: 4, r: 1.2 }, { type: 'circle', x: 10, z: 4, r: 1.2 }];
    return KT.bake(g);
  };
})();
