// Kerala architecture: traditional / village / coastal / stilt / hill /
// modern houses, temple complex, church, lighthouse, Chinese fishing net,
// market stall, tea cart, well, watch tower, gazebo, arch, Kathakali stage.
// Builders return groups with userData.colliders in local space:
//   {type:'box', x, z, hw, hd} or {type:'circle', x, z, r}
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;

  function pillarsRow(g, x0, x1, z, y0, h, count, mat, r) {
    for (let i = 0; i < count; i++) {
      const x = KT.lerp(x0, x1, count === 1 ? 0.5 : i / (count - 1));
      part(g, G.cyl(r || 0.13, (r || 0.13) * 1.15, h, 8), mat, x, y0 + h / 2, z);
      part(g, G.box(0.36, 0.14, 0.36), mat, x, y0 + 0.07, z);
      part(g, G.box(0.34, 0.12, 0.34), mat, x, y0 + h - 0.06, z);
    }
  }

  function railing(g, x0, x1, z, y0, mat, gapCenter) {
    const len = x1 - x0;
    const n = Math.max(2, Math.round(len / 0.28));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (len * i) / n;
      if (gapCenter && Math.abs(x - (x0 + x1) / 2) < 0.8) continue;
      part(g, G.box(0.07, 0.6, 0.07), mat, x, y0 + 0.3, z);
    }
    if (gapCenter) {
      const mid = (x0 + x1) / 2;
      part(g, G.box(mid - 0.8 - x0, 0.09, 0.14), mat, (x0 + mid - 0.8) / 2, y0 + 0.62, z);
      part(g, G.box(x1 - mid - 0.8, 0.09, 0.14), mat, (x1 + mid + 0.8) / 2, y0 + 0.62, z);
    } else {
      part(g, G.box(len, 0.09, 0.14), mat, (x0 + x1) / 2, y0 + 0.62, z);
    }
  }

  function windowUnit(g, x, y, z, ry, w, h) {
    const win = new T.Group();
    win.position.set(x, y, z);
    win.rotation.y = ry || 0;
    g.add(win);
    part(win, G.box(w + 0.2, h + 0.2, 0.12), M().woodDark, 0, 0, 0);
    part(win, G.box(w, h, 0.14), M().windowDark, 0, 0, 0);
    for (let i = 1; i < 4; i++) part(win, G.box(0.04, h, 0.18), M().wood, -w / 2 + (w * i) / 4, 0, 0);
    // shutters swung open
    part(win, G.box(w / 2, h, 0.05), M().wood, -w * 0.75 - 0.1, 0, 0.1, 0, 0.5);
    part(win, G.box(w / 2, h, 0.05), M().wood, w * 0.75 + 0.1, 0, 0.1, 0, -0.5);
  }

  function door(g, x, y, z, ry) {
    const d = new T.Group();
    d.position.set(x, y, z);
    d.rotation.y = ry || 0;
    g.add(d);
    part(d, G.box(1.3, 2.25, 0.14), M().woodDark, 0, 1.12, 0);
    part(d, G.box(1.05, 2.05, 0.18), M().wood, 0, 1.05, 0);
    part(d, G.box(0.04, 2.0, 0.2), M().woodDark, 0, 1.05, 0);
    part(d, G.sph(0.04, 6, 4), M().brass, 0.18, 1.05, 0.12);
    part(d, G.sph(0.04, 6, 4), M().brass, -0.18, 1.05, 0.12);
  }

  function pot(g, x, y, z, plant) {
    part(g, G.cyl(0.22, 0.15, 0.35, 8), M().terracotta, x, y + 0.17, z);
    if (plant !== false) part(g, KT.blob(0.28, 0, 0.25, Math.floor(x * 10 + z)), M().leafLight, x, y + 0.5, z, 0, 0, 0, 1, 1.1, 1);
  }

  function lamp(g, x, y, z) {
    part(g, G.box(0.16, 0.24, 0.16), M().lampGlow, x, y, z);
    part(g, G.cone(0.16, 0.12, 4), M().black, x, y + 0.18, z, 0, Math.PI / 4);
  }

  // Classic Kerala house with laterite plinth, veranda pillars & hip roof
  // crowned with a decorative gable.
  Models.keralaHouse = function (opts) {
    opts = opts || {};
    const g = new T.Group();
    const w = opts.w || 9, d = opts.d || 6;
    const wallH = opts.wallH || 2.8;
    const plinthH = opts.plinthH || 0.7;
    const verandaD = 2.4;
    const pw = w + 1.0, pd = d + verandaD + 0.8;
    const pzc = verandaD / 2; // plinth centre z offset (veranda at +z)
    const wallMat = opts.wallMat || M().plaster;
    const roofMat = opts.roofMat || M().roof;
    const baseMat = opts.baseMat || M().laterite;
    part(g, G.box(pw, plinthH, pd), baseMat, 0, plinthH / 2, pzc);
    // steps
    for (let i = 0; i < 3; i++) {
      part(g, G.box(2.2, plinthH / 3, 0.45), M().stoneGrey, 0, (plinthH / 3) * (i + 0.5), pzc + pd / 2 + 0.45 * (3 - i) - 0.2);
    }
    const y0 = plinthH;
    // walls (core block)
    part(g, G.box(w, wallH, d), wallMat, 0, y0 + wallH / 2, -0.4);
    // dark skirting
    part(g, G.box(w + 0.04, 0.3, d + 0.04), M().maroon, 0, y0 + 0.15, -0.4);
    const front = -0.4 + d / 2 + 0.07;
    door(g, 0, y0, front);
    windowUnit(g, -w * 0.3, y0 + 1.5, front, 0, 0.9, 1.0);
    windowUnit(g, w * 0.3, y0 + 1.5, front, 0, 0.9, 1.0);
    windowUnit(g, w / 2 + 0.07, y0 + 1.5, -0.4, Math.PI / 2, 0.9, 1.0);
    windowUnit(g, -w / 2 - 0.07, y0 + 1.5, -0.4, -Math.PI / 2, 0.9, 1.0);
    windowUnit(g, 0, y0 + 1.5, -0.4 - d / 2 - 0.07, Math.PI, 0.9, 1.0);
    // veranda pillars & railing
    const vz = pzc + pd / 2 - 0.35;
    const pillarCount = Math.max(3, Math.round(w / 2.2));
    pillarsRow(g, -w / 2 + 0.2, w / 2 - 0.2, vz, y0, wallH, pillarCount, M().wood);
    railing(g, -w / 2 + 0.2, w / 2 - 0.2, vz, y0, M().wood, true);
    // bench in veranda
    part(g, G.box(1.6, 0.1, 0.5), M().woodDark, -w * 0.3, y0 + 0.45, front + 0.5);
    part(g, G.box(1.5, 0.4, 0.06), M().woodDark, -w * 0.3, y0 + 0.22, front + 0.5);
    lamp(g, 1.0, y0 + 2.0, front + 0.1);
    lamp(g, -1.0, y0 + 2.0, front + 0.1);
    // roof
    const rw = w + 2.6, rd = d + verandaD + 2.2;
    const roofY = y0 + wallH;
    const roofH = opts.roofH || 2.6;
    const roof = part(g, KT.hipRoofGeometry(rw, rd, roofH, 0.42), roofMat, 0, roofY, pzc - 0.4 + 0.2);
    roof.userData.isRoof = true;
    // fascia boards
    part(g, G.box(rw, 0.18, 0.08), M().woodDark, 0, roofY - 0.05, pzc + rd / 2 - 0.2);
    part(g, G.box(rw, 0.18, 0.08), M().woodDark, 0, roofY - 0.05, pzc - rd / 2 - 0.2);
    // ceiling under roof
    part(g, G.box(rw - 0.2, 0.06, rd - 0.2), M().woodDark, 0, roofY + 0.02, pzc - 0.2);
    // decorative gable (mukhappu) at ridge ends, with a small upper roof
    const ridgeHalf = (rw * 0.42) / 2;
    if (opts.gable !== false) {
      [-1, 1].forEach((s) => {
        const tri = part(g, KT.triangleGeometry(1.7, 1.1, 0.08), M().woodDark, s * (ridgeHalf + 0.1), roofY + roofH - 1.0, pzc - 0.2 + 0.0, 0, s * Math.PI / 2);
        tri.position.z += 0;
      });
      part(g, KT.gableRoofGeometry(rw * 0.42 + 0.9, 2.2, 0.9), roofMat, 0, roofY + roofH - 0.55, pzc - 0.2);
      part(g, G.cyl(0.06, 0.06, 0.5, 6), M().brass, -ridgeHalf - 0.4, roofY + roofH + 0.55, pzc - 0.2);
      part(g, G.cyl(0.06, 0.06, 0.5, 6), M().brass, ridgeHalf + 0.4, roofY + roofH + 0.55, pzc - 0.2);
    }
    // ridge cap tiles along the hip ridge and rafter tails under the eaves
    const rz = pzc - 0.2;
    part(g, G.cyl(0.09, 0.09, rw * 0.42 + 0.1, 12), M().terracotta, 0, roofY + roofH + 0.03, rz, 0, 0, Math.PI / 2);
    for (let x = -rw / 2 + 0.3; x < rw / 2 - 0.2; x += 0.55) {
      [-1, 1].forEach((sd) => part(g, G.box(0.07, 0.09, 0.45), M().woodDark, x, roofY - 0.12, rz + sd * (rd / 2 - 0.25)));
    }
    for (let z = -rd / 2 + 0.6; z < rd / 2 - 0.4; z += 0.55) {
      [-1, 1].forEach((sd) => part(g, G.box(0.45, 0.09, 0.07), M().woodDark, sd * (rw / 2 - 0.25), roofY - 0.12, rz + z));
    }
    // plinth moulding, corner pilasters and window sills
    part(g, G.box(pw + 0.08, 0.1, pd + 0.08), M().stoneGrey, 0, plinthH - 0.03, pzc);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((c) => part(g, G.box(0.22, wallH, 0.22), M().plasterCream, c[0] * (w / 2), y0 + wallH / 2, -0.4 + c[1] * (d / 2)));
    [-w * 0.3, w * 0.3].forEach((x) => part(g, G.box(1.2, 0.07, 0.22), M().woodDark, x, y0 + 0.92, front + 0.06));
    // potted plants by steps
    pot(g, -1.5, 0, pzc + pd / 2 + 0.7);
    pot(g, 1.5, 0, pzc + pd / 2 + 0.7);
    if (opts.cycle) {
      // bicycle leaning on plinth
      const b = new T.Group();
      b.position.set(w / 2 + 0.9, 0, pzc + pd / 2 - 0.5);
      g.add(b);
      part(b, G.torus(0.33, 0.03, 5, 18), M().black, -0.5, 0.35, 0);
      part(b, G.torus(0.33, 0.03, 5, 18), M().black, 0.5, 0.35, 0);
      part(b, G.cyl(0.025, 0.025, 1.0, 5), M().red, 0, 0.6, 0, 0, 0, Math.PI / 2);
      part(b, G.cyl(0.025, 0.025, 0.6, 5), M().red, -0.2, 0.55, 0, 0, 0, 0.7);
      part(b, G.box(0.25, 0.05, 0.1), M().black, -0.3, 0.85, 0);
    }
    g.userData.colliders = [{ type: 'box', x: 0, z: pzc, hw: pw / 2, hd: pd / 2 }];
    g.userData.entrance = new T.Vector3(0, 0, pzc + pd / 2 + 1.6);
    return KT.bake(g);
  };

  Models.villageHouse = function () {
    return Models.keralaHouse({ w: 7.5, d: 5.5, wallMat: M().plasterCream, cycle: true, roofH: 2.3 });
  };

  Models.coastalHouse = function () {
    const g = Models.keralaHouse({ w: 8, d: 5.5, wallMat: M().plasterCream, gable: false, roofH: 2.2 });
    return g;
  };

  Models.hillHouse = function () {
    return Models.keralaHouse({ w: 8, d: 5.5, roofMat: M().roofGreen, baseMat: M().stoneGrey, roofH: 2.2 });
  };

  Models.thatchedHut = function () {
    const g = new T.Group();
    part(g, G.box(4.6, 0.4, 4.2), M().laterite, 0, 0.2, 0);
    part(g, G.box(4, 2.2, 3.6), M().bamboo, 0, 1.5, 0);
    door(g, 0, 0.4, 1.87);
    part(g, KT.hipRoofGeometry(5.6, 5.2, 2.2, 0.3), M().thatch, 0, 2.6, 0);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 2.4, hd: 2.2 }];
    return KT.bake(g);
  };

  // Backwater stilt house on wooden piles (origin at water surface).
  Models.stiltHouse = function () {
    const g = new T.Group();
    const w = 8, d = 6, deckY = 1.4;
    for (let x = -4; x <= 4; x += 2) {
      for (let z = -3; z <= 4.5; z += 2.5) part(g, G.cyl(0.13, 0.15, deckY + 2.5, 6), M().woodDark, x, deckY / 2 - 1.2, z);
    }
    part(g, G.box(w + 1.2, 0.2, d + 3), M().wood, 0, deckY, 0.8);
    part(g, G.box(w, 2.6, d), M().wood, 0, deckY + 1.4, -0.3);
    const front = -0.3 + d / 2 + 0.07;
    door(g, 0, deckY + 0.1, front);
    windowUnit(g, -2.6, deckY + 1.5, front, 0, 1.1, 1.0);
    windowUnit(g, 2.6, deckY + 1.5, front, 0, 1.1, 1.0);
    pillarsRow(g, -w / 2, w / 2, 3.6, deckY + 0.1, 2.5, 4, M().wood, 0.11);
    railing(g, -w / 2, w / 2, 3.6, deckY + 0.1, M().wood, false);
    part(g, KT.hipRoofGeometry(w + 2.4, d + 4, 2.3, 0.4), M().roof, 0, deckY + 2.7, 0.6);
    // life ring
    part(g, G.torus(0.3, 0.08, 6, 14), M().orange, 2.6, deckY + 0.6, 3.68);
    lamp(g, -1.0, deckY + 2.2, front + 0.1);
    lamp(g, 1.0, deckY + 2.2, front + 0.1);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0.8, hw: w / 2 + 0.6, hd: (d + 3) / 2 }];
    return KT.bake(g);
  };

  Models.modernHouse = function () {
    const g = new T.Group();
    part(g, G.box(12, 0.4, 9), M().stoneGrey, 0, 0.2, 0);
    part(g, G.box(9, 3, 7), M().plaster, -1, 1.9, -0.5);
    part(g, G.box(7, 2.8, 6), M().plaster, 0.5, 4.8, -0.8);
    part(g, G.box(9.8, 0.25, 8), M().plaster, -0.6, 3.45, 0);
    part(g, G.box(8, 0.25, 7), M().plaster, 0.5, 6.3, -0.6);
    part(g, G.box(3, 2.6, 0.1), M().wood, 2.0, 4.8, 2.25);
    part(g, G.box(3.5, 2.2, 0.1), M().glass, -2.5, 1.7, 3.05);
    part(g, G.box(2.6, 2.0, 0.1), M().glass, -1.2, 4.8, 2.25);
    door(g, 1.5, 0.4, 3.02);
    part(g, G.box(7, 0.06, 0.06), M().black, -0.5, 4.4, 3.7);
    for (let i = 0; i < 8; i++) part(g, G.box(0.04, 0.9, 0.04), M().black, -4 + i, 3.95, 3.7);
    // car port + car
    part(g, G.box(3.5, 0.15, 5), M().plaster, 5.2, 3.1, 0.5);
    part(g, G.box(0.25, 2.8, 0.25), M().plaster, 6.8, 1.6, 2.8);
    const car = new T.Group();
    car.position.set(5.2, 0.4, 0.8);
    g.add(car);
    part(car, G.box(1.8, 0.7, 4.2), M().white, 0, 0.55, 0);
    part(car, G.box(1.6, 0.6, 2.2), M().glass, 0, 1.15, -0.2);
    [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]].forEach((p) => part(car, G.cyl(0.33, 0.33, 0.25, 12), M().black, p[0], 0.33, p[1], 0, 0, Math.PI / 2));
    pot(g, -5, 0.4, 3.6); pot(g, -3.8, 0.4, 3.6);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 6, hd: 4.5 }];
    return KT.bake(g);
  };

  // Kerala temple: laterite compound, tiered gopuram gate, round sreekovil
  // with copper conical roof, flag mast and brass lamp tower.
  Models.temple = function () {
    const g = new T.Group();
    const S = 40, wallH = 2.4, hs = S / 2;
    const cols = [];
    // compound wall (gate opening on +z side)
    part(g, G.box(S, wallH, 0.8), M().laterite, 0, wallH / 2, -hs);
    part(g, G.box(0.8, wallH, S), M().laterite, -hs, wallH / 2, 0);
    part(g, G.box(0.8, wallH, S), M().laterite, hs, wallH / 2, 0);
    part(g, G.box(hs - 3, wallH, 0.8), M().laterite, -(hs + 3) / 2, wallH / 2, hs);
    part(g, G.box(hs - 3, wallH, 0.8), M().laterite, (hs + 3) / 2, wallH / 2, hs);
    // wall coping tiles
    [[0, -hs, S, 1.2], [-(hs + 3) / 2, hs, hs - 3, 1.2], [(hs + 3) / 2, hs, hs - 3, 1.2]].forEach((p) => {
      part(g, KT.gableRoofGeometry(p[2], p[3], 0.4), M().roof, p[0], wallH, p[1]);
    });
    [-hs, hs].forEach((x) => part(g, KT.gableRoofGeometry(S, 1.2, 0.4), M().roof, x, wallH, 0, 0, Math.PI / 2));
    cols.push({ type: 'box', x: 0, z: -hs, hw: hs, hd: 0.6 });
    cols.push({ type: 'box', x: -hs, z: 0, hw: 0.6, hd: hs });
    cols.push({ type: 'box', x: hs, z: 0, hw: 0.6, hd: hs });
    cols.push({ type: 'box', x: -(hs + 3) / 2, z: hs, hw: (hs - 3) / 2, hd: 0.6 });
    cols.push({ type: 'box', x: (hs + 3) / 2, z: hs, hw: (hs - 3) / 2, hd: 0.6 });
    // gopuram (gate house) - two-tier roof
    const gp = new T.Group();
    gp.position.set(0, 0, hs);
    g.add(gp);
    part(gp, G.box(8, 0.6, 5), M().laterite, 0, 0.3, 0);
    pillarsRow(gp, -3.4, 3.4, 2.1, 0.6, 3, 4, M().woodDark, 0.18);
    pillarsRow(gp, -3.4, 3.4, -2.1, 0.6, 3, 4, M().woodDark, 0.18);
    part(gp, G.box(2.4, 3, 0.4), M().woodDark, -2.4, 2.1, 0);
    part(gp, G.box(2.4, 3, 0.4), M().woodDark, 2.4, 2.1, 0);
    part(gp, KT.hipRoofGeometry(10, 7, 1.8, 0.5), M().roof, 0, 3.6, 0);
    part(gp, G.box(5, 1.4, 3.4), M().woodDark, 0, 5.6, 0);
    part(gp, KT.hipRoofGeometry(7, 5, 1.8, 0.4), M().roof, 0, 6.2, 0);
    part(gp, G.cyl(0.12, 0.25, 0.8, 8), M().gold, 0, 8.3, 0);
    cols.push({ type: 'box', x: -3.4, z: hs, hw: 1.6, hd: 2.4 });
    cols.push({ type: 'box', x: 3.4, z: hs, hw: 1.6, hd: 2.4 });
    // sreekovil (round sanctum)
    const sk = new T.Group();
    sk.position.set(0, 0, -6);
    g.add(sk);
    part(sk, G.cyl(5.2, 5.6, 0.9, 24), M().laterite, 0, 0.45, 0);
    part(sk, G.cyl(4.2, 4.2, 3.4, 24), M().plasterCream, 0, 2.6, 0);
    part(sk, G.cyl(4.25, 4.25, 0.35, 24), M().maroon, 0, 1.08, 0);
    part(sk, G.cone(6.5, 3.2, 24), M().copper, 0, 5.9, 0);
    part(sk, G.cyl(2.6, 2.6, 1.2, 20), M().woodDark, 0, 7.8, 0);
    part(sk, G.cone(3.6, 2.4, 20), M().copper, 0, 9.4, 0);
    part(sk, G.sph(0.4, 10, 8), M().gold, 0, 10.8, 0);
    part(sk, G.cone(0.3, 1.1, 10), M().gold, 0, 11.5, 0);
    part(sk, G.box(1.6, 2.6, 0.3), M().gold, 0, 2.2, 4.15);
    part(sk, G.box(1.2, 2.2, 0.3), M().windowDark, 0, 2.1, 4.25);
    for (let i = 0; i < 4; i++) part(sk, G.box(1.8, 0.2, 0.6), M().stoneGrey, 0, 0.1 + i * 0.22, 5.6 + (3 - i) * 0.5);
    cols.push({ type: 'circle', x: 0, z: -6, r: 5.6 });
    // namaskara mandapam
    const nm = new T.Group();
    nm.position.set(0, 0, 4.5);
    g.add(nm);
    part(nm, G.box(5, 0.7, 5), M().laterite, 0, 0.35, 0);
    [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach((p) => part(nm, G.cyl(0.18, 0.2, 2.8, 8), M().stoneGrey, p[0], 2.1, p[1]));
    part(nm, KT.hipRoofGeometry(6.4, 6.4, 2.6, 0.02), M().copper, 0, 3.5, 0);
    part(nm, G.sph(0.25, 8, 6), M().gold, 0, 6.2, 0);
    cols.push({ type: 'box', x: 0, z: 4.5, hw: 2.6, hd: 2.6 });
    // dhwajastambham (golden flag mast)
    const dh = new T.Group();
    dh.position.set(0, 0, 11);
    g.add(dh);
    part(dh, G.box(1.6, 0.8, 1.6), M().stoneGrey, 0, 0.4, 0);
    part(dh, G.cyl(0.16, 0.24, 13, 10), M().gold, 0, 7.2, 0);
    for (let i = 0; i < 6; i++) part(dh, G.cyl(0.32, 0.32, 0.12, 10), M().gold, 0, 2 + i * 2.1, 0);
    part(dh, G.box(1.2, 0.15, 0.3), M().gold, 0, 13.8, 0);
    for (let i = 0; i < 5; i++) part(dh, G.sph(0.08, 6, 4), M().gold, -0.48 + i * 0.24, 13.6, 0);
    cols.push({ type: 'circle', x: 0, z: 11, r: 1.1 });
    // deepastambham (brass lamp tower)
    const dp = new T.Group();
    dp.position.set(0, 0, 15.5);
    g.add(dp);
    part(dp, G.cyl(0.9, 1.1, 0.5, 12), M().stoneGrey, 0, 0.25, 0);
    part(dp, G.cyl(0.12, 0.2, 5.2, 10), M().brass, 0, 3, 0);
    for (let i = 0; i < 8; i++) {
      const r = 1.1 - i * 0.1;
      part(dp, G.cyl(r, r * 0.8, 0.1, 16), M().brass, 0, 0.9 + i * 0.6, 0);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        part(dp, G.sph(0.05, 5, 4), M().lampGlow, Math.cos(a) * r * 0.9, 1.0 + i * 0.6, Math.sin(a) * r * 0.9);
      }
    }
    cols.push({ type: 'circle', x: 0, z: 15.5, r: 1.2 });
    // a few side shrines and banyan pedestal (thara)
    part(g, G.cyl(3.2, 3.4, 0.6, 16), M().laterite, -12, 0.3, -12);
    cols.push({ type: 'circle', x: -12, z: -12, r: 3.4 });
    const ss = new T.Group();
    ss.position.set(12, 0, -10);
    g.add(ss);
    part(ss, G.box(3.4, 0.6, 3.4), M().laterite, 0, 0.3, 0);
    part(ss, G.box(2.6, 2.4, 2.6), M().plasterCream, 0, 1.8, 0);
    part(ss, KT.hipRoofGeometry(4, 4, 1.8, 0.02), M().copper, 0, 3, 0);
    cols.push({ type: 'box', x: 12, z: -10, hw: 1.8, hd: 1.8 });
    g.userData.colliders = cols;
    return KT.bake(g);
  };

  // Kerala Syrian-Christian style church with white tiered facade.
  Models.church = function () {
    const g = new T.Group();
    part(g, G.box(11, 0.6, 22), M().stoneGrey, 0, 0.3, -6);
    part(g, G.box(9, 6, 16), M().plaster, 0, 3.6, -8);
    part(g, KT.gableRoofGeometry(18, 11, 3.2), M().roof, 0, 6.6, -8, 0, Math.PI / 2);
    // facade
    const f = new T.Group();
    f.position.set(0, 0.6, 0.4);
    g.add(f);
    part(f, G.box(11, 9, 1.2), M().plaster, 0, 4.5, 0);
    part(f, G.box(7, 2.6, 1.2), M().plaster, 0, 10.3, 0);
    part(f, G.box(3.4, 2.4, 1.2), M().plaster, 0, 12.8, 0);
    part(f, KT.triangleGeometry(3.4, 1.4, 1.2), M().plaster, 0, 14, -0.6);
    part(f, G.box(0.25, 1.8, 0.25), M().gold, 0, 16.2, 0);
    part(f, G.box(1.0, 0.25, 0.25), M().gold, 0, 16.5, 0);
    // pilasters & mouldings
    [-5.2, -2, 2, 5.2].forEach((x) => part(f, G.box(0.5, 9, 1.4), M().plasterCream, x, 4.5, 0));
    [3, 6, 9].forEach((y) => part(f, G.box(11.4, 0.25, 1.5), M().plasterCream, 0, y, 0));
    // arched door
    part(f, G.box(2.2, 3.2, 1.3), M().woodDark, 0, 1.6, 0.05);
    part(f, G.cyl(1.1, 1.1, 1.3, 16, 1, false, 0, Math.PI), M().woodDark, 0, 3.2, 0.05, Math.PI / 2, 0, 0);
    // windows
    [-3.5, 3.5].forEach((x) => {
      part(f, G.box(1.1, 2, 1.3), M().windowDark, x, 4.5, 0.05);
      part(f, G.cyl(0.55, 0.55, 1.3, 12), M().windowDark, x, 5.5, 0.05, Math.PI / 2);
    });
    part(f, G.cyl(0.8, 0.8, 1.3, 16), M().glass, 0, 7.5, 0.1, Math.PI / 2);
    // bell
    part(f, G.cone(0.45, 0.7, 10), M().brass, 0, 12.6, 0.4);
    // steps
    for (let i = 0; i < 3; i++) part(g, G.box(5, 0.2, 0.5), M().stoneGrey, 0, 0.1 + i * 0.2, 2.6 - i * 0.5);
    g.userData.colliders = [{ type: 'box', x: 0, z: -6, hw: 5.7, hd: 11 }];
    return KT.bake(g);
  };

  // Red & white striped lighthouse (Kovalam / Vizhinjam).
  Models.lighthouse = function () {
    const g = new T.Group();
    part(g, G.cyl(4.5, 5, 1.2, 16), M().stoneGrey, 0, 0.6, 0);
    const H = 26, bands = 7;
    for (let i = 0; i < bands; i++) {
      const h = H / bands;
      const r0 = KT.lerp(2.8, 1.9, i / bands), r1 = KT.lerp(2.8, 1.9, (i + 1) / bands);
      part(g, G.cyl(r1, r0, h, 8), i % 2 ? M().white : M().red, 0, 1.2 + h * (i + 0.5), 0);
    }
    const top = 1.2 + H;
    part(g, G.cyl(2.8, 2.6, 0.4, 16), M().darkGrey, 0, top + 0.2, 0);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      part(g, G.box(0.06, 1, 0.06), M().darkGrey, Math.cos(a) * 2.6, top + 0.9, Math.sin(a) * 2.6);
    }
    part(g, G.torus(2.6, 0.05, 4, 24), M().darkGrey, 0, top + 1.4, 0, Math.PI / 2);
    part(g, G.cyl(1.4, 1.4, 2.2, 12), M().glass, 0, top + 1.5, 0);
    part(g, G.sph(0.6, 10, 8), M().lampGlow, 0, top + 1.5, 0);
    part(g, G.cone(1.8, 1.4, 12), M().red, 0, top + 3.3, 0);
    part(g, G.sph(0.25, 8, 6), M().darkGrey, 0, top + 4.1, 0);
    for (let i = 0; i < 3; i++) part(g, G.box(0.6, 1.0, 0.1), M().windowDark, 0, 6 + i * 7, 2.6 - i * 0.25);
    part(g, G.box(1.2, 2.2, 0.2), M().woodDark, 0, 2.3, 2.85);
    const baked = KT.bake(g);
    // rotating beam (animated, not baked)
    const beam = new T.Group();
    beam.position.set(0, top + 1.5, 0);
    const beamMat = new T.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending });
    const cone = new T.Mesh(new T.ConeGeometry(3, 26, 16, 1, true), beamMat);
    cone.rotation.z = Math.PI / 2;
    cone.position.x = 13;
    beam.add(cone);
    baked.add(beam);
    baked.userData.beam = beam;
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 5 }];
    baked.userData.top = top;
    return baked;
  };

  // Chinese fishing net (Cheena vala) - cantilevered and animated.
  Models.chineseNet = function () {
    const g = new T.Group();
    // platform on piles over water (origin on the shore edge, net reaching +z)
    part(g, G.box(4, 0.25, 5), M().wood, 0, 1.0, 0);
    for (let x = -1.5; x <= 1.5; x += 1.5) for (let z = -2; z <= 2; z += 2) part(g, G.cyl(0.12, 0.14, 4, 6), M().woodDark, x, -1, z);
    const baked = KT.bake(g);
    const pivot = new T.Group();
    pivot.position.set(0, 2.6, 1.5);
    baked.add(pivot);
    const arm = new T.Group();
    pivot.add(arm);
    // A-frame support
    const legL = part(baked, G.cyl(0.1, 0.13, 3.2, 6), M().woodDark, -0.8, 2.6, 1.0, 0.4, 0, 0.25);
    const legR = part(baked, G.cyl(0.1, 0.13, 3.2, 6), M().woodDark, 0.8, 2.6, 1.0, 0.4, 0, -0.25);
    legL.userData.noBake = legR.userData.noBake = true;
    // main beam reaching out over the water
    part(arm, G.cyl(0.1, 0.16, 16, 7), M().woodDark, 0, 0, 6, Math.PI / 2);
    part(arm, G.cyl(0.08, 0.12, 6, 6), M().woodDark, 0, 0, -3, Math.PI / 2);
    // spreader poles and net
    const tip = new T.Group();
    tip.position.set(0, 0, 13.5);
    arm.add(tip);
    const span = 5;
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach((s) => {
      const p = part(tip, G.cyl(0.04, 0.05, span * 1.4, 5), M().woodLight, s[0] * span * 0.5, -1.4, s[1] * span * 0.5);
      p.lookAt(new T.Vector3(s[0] * span, -2.8, s[1] * span).add(tip.position));
      p.rotation.set(s[1] * 0.75, 0, -s[0] * 0.75);
    });
    // the net: an inverted pyramid of translucent mesh
    const netG = new T.ConeGeometry(span * 0.95, 2.5, 4, 1, true);
    netG.rotateY(Math.PI / 4);
    const net = new T.Mesh(netG, M().net);
    net.position.set(0, -3.9, 0);
    net.rotation.x = Math.PI;
    tip.add(net);
    // counterweight stones on ropes
    for (let i = 0; i < 5; i++) {
      part(arm, G.cyl(0.01, 0.01, 1.4, 3), M().rope, 0, -0.7, -5.5 + i * 0.4);
      part(arm, KT.blob(0.25, 0, 0.2, i), M().rock, 0, -1.5, -5.5 + i * 0.4);
    }
    arm.rotation.x = -0.2;
    baked.userData.arm = arm;
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 2, hd: 2.5 }];
    return baked;
  };

  Models.marketStall = function (seed) {
    const g = new T.Group();
    const rng = KT.makeRng(seed || 1);
    [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]].forEach((p) => part(g, G.cyl(0.07, 0.07, 2.6, 6), M().wood, p[0], 1.3, p[1]));
    part(g, G.box(3, 0.9, 1.4), M().wood, 0, 0.45, 0.2);
    part(g, KT.hipRoofGeometry(3.8, 2.8, 1.0, 0.4), M().thatch, 0, 2.55, 0);
    const fruitMats = [KT.mat('mango', { color: 0xe7b521 }), M().red, M().orange, KT.mat('bananaFruit', { color: 0xf0d040 }), M().leafLight];
    for (let i = 0; i < 4; i++) {
      part(g, G.box(0.62, 0.12, 0.8), M().woodLight, -1.05 + i * 0.7, 0.96, 0.35);
      const fm = fruitMats[Math.floor(rng() * fruitMats.length)];
      for (let k = 0; k < 6; k++) part(g, G.sph(0.09, 6, 5), fm, -1.25 + i * 0.7 + (k % 3) * 0.17, 1.08 + Math.floor(k / 3) * 0.08, 0.2 + Math.floor(k / 3) * 0.2);
    }
    // hanging banana bunches
    for (let i = 0; i < 3; i++) part(g, G.cyl(0.12, 0.08, 0.5, 6), KT.mat('bananaFruit', { color: 0xf0d040 }), -0.9 + i * 0.9, 1.9, 0.85);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.6, hd: 1.0 }];
    return KT.bake(g);
  };

  Models.teaCart = function () {
    const g = new T.Group();
    part(g, G.box(1.8, 0.8, 1.0), M().wood, 0, 0.9, 0);
    part(g, G.box(1.9, 0.08, 1.1), M().woodLight, 0, 1.34, 0);
    [-0.7, 0.7].forEach((x) => part(g, G.torus(0.4, 0.05, 5, 16), M().woodDark, x, 0.42, 0.56));
    [-0.7, 0.7].forEach((x) => part(g, G.torus(0.4, 0.05, 5, 16), M().woodDark, x, 0.42, -0.56));
    part(g, G.cyl(0.18, 0.2, 0.5, 10), M().brass, -0.4, 1.62, 0);
    part(g, G.cyl(0.04, 0.04, 0.3, 6), M().brass, -0.2, 1.65, 0, 0, 0, 1.2);
    for (let i = 0; i < 4; i++) part(g, G.cyl(0.05, 0.04, 0.1, 8), M().glass, 0.2 + i * 0.13, 1.43, 0.2);
    part(g, G.cyl(0.03, 0.03, 2.4, 6), M().woodDark, 0.6, 2.2, 0);
    part(g, G.cone(1.3, 0.5, 8), M().red, 0.6, 3.3, 0);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.1, hd: 0.8 }];
    return KT.bake(g);
  };

  Models.well = function () {
    const g = new T.Group();
    part(g, new T.CylinderGeometry(1.1, 1.1, 1.0, 16, 1, true), KT.mat('lateriteDS', { map: KT.tex('laterite'), side: T.DoubleSide }, 0.35), 0, 0.5, 0);
    part(g, G.torus(1.1, 0.15, 6, 20), M().stoneGrey, 0, 1.0, 0, Math.PI / 2);
    part(g, G.cyl(1.0, 1.0, 0.05, 16), KT.mat('wellWater', { color: 0x1e3b48, roughness: 0.1 }), 0, 0.5, 0);
    part(g, G.box(0.15, 2.2, 0.15), M().woodDark, -1.0, 1.6, 0);
    part(g, G.box(0.15, 2.2, 0.15), M().woodDark, 1.0, 1.6, 0);
    part(g, G.cyl(0.06, 0.06, 2.2, 6), M().woodDark, 0, 2.3, 0, 0, 0, Math.PI / 2);
    part(g, KT.gableRoofGeometry(2.8, 1.8, 0.8), M().roof, 0, 2.7, 0);
    part(g, G.cyl(0.02, 0.02, 1, 4), M().rope, 0.2, 1.8, 0);
    part(g, G.cyl(0.14, 0.11, 0.25, 8), M().brass, 0.2, 1.2, 0);
    g.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 1.3 }];
    return KT.bake(g);
  };

  Models.watchTower = function () {
    const g = new T.Group();
    const H = 7;
    [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach((p) => {
      part(g, G.box(0.3, H + 3, 0.3), M().woodDark, p[0], (H + 3) / 2, p[1]);
      part(g, G.box(0.6, 0.5, 0.6), M().stoneGrey, p[0], 0.25, p[1]);
    });
    for (let y = 1.5; y < H; y += 2.2) {
      part(g, G.box(3, 0.12, 0.12), M().wood, 0, y, 1.4, 0, 0, 0.5);
      part(g, G.box(3, 0.12, 0.12), M().wood, 0, y, -1.4, 0, 0, -0.5);
    }
    part(g, G.box(3.6, 0.2, 3.6), M().wood, 0, H, 0);
    railing(g, -1.6, 1.6, 1.7, H, M().wood, false);
    railing(g, -1.6, 1.6, -1.7, H, M().wood, false);
    part(g, KT.hipRoofGeometry(4.4, 4.4, 1.8, 0.02), M().roof, 0, H + 3, 0);
    // ladder / stairs
    for (let i = 0; i < 14; i++) part(g, G.box(1.0, 0.08, 0.3), M().wood, 2.3, 0.4 + i * 0.48, 2.6 - i * 0.28);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.7, hd: 1.7 }];
    g.userData.deckY = H;
    return KT.bake(g);
  };

  Models.gazebo = function () {
    const g = new T.Group();
    part(g, G.cyl(3, 3.2, 0.5, 8), M().stoneGrey, 0, 0.25, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(g, G.cyl(0.11, 0.13, 2.6, 8), M().wood, Math.cos(a) * 2.6, 1.8, Math.sin(a) * 2.6);
    }
    part(g, G.cone(4, 2.2, 8), M().roof, 0, 4.2, 0, 0, Math.PI / 8);
    part(g, G.sph(0.2, 8, 6), M().brass, 0, 5.4, 0);
    part(g, G.cyl(1.0, 1.0, 0.5, 12), M().wood, 0, 0.75, 0);
    g.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 1.2 }];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (i === 2) continue; // entrance gap
      g.userData.colliders.push({ type: 'circle', x: Math.cos(a) * 2.6, z: Math.sin(a) * 2.6, r: 0.25 });
    }
    return KT.bake(g);
  };

  Models.entranceArch = function (lines) {
    const g = new T.Group();
    [-3, 3].forEach((x) => {
      part(g, G.box(0.6, 4.6, 0.6), M().woodDark, x, 2.3, 0);
      part(g, G.box(0.9, 0.5, 0.9), M().stoneGrey, x, 0.25, 0);
      part(g, KT.blob(0.5, 0, 0.3, x + 9), M().leafLight, x, 4.8, 0, 0, 0, 0, 1.2, 0.6, 1.2);
    });
    part(g, G.box(7.4, 0.4, 0.6), M().woodDark, 0, 4.5, 0);
    part(g, KT.gableRoofGeometry(7.8, 1.4, 0.6), M().roof, 0, 4.7, 0);
    const sign = new T.Mesh(G.plane(4.8, 1.2), new T.MeshStandardMaterial({ map: KT.textTexture(lines || ['Welcome to Kerala', "God's Own Country"], { width: 1024, height: 256 }), roughness: 0.8 }));
    sign.position.set(0, 3.7, 0.32);
    g.add(sign);
    const back = sign.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.32;
    g.add(back);
    part(g, G.box(4.9, 1.3, 0.55), M().wood, 0, 3.7, 0);
    g.userData.colliders = [{ type: 'circle', x: -3, z: 0, r: 0.6 }, { type: 'circle', x: 3, z: 0, r: 0.6 }];
    return KT.bake(g);
  };

  // Koothambalam-style stage for the Kathakali performance.
  Models.kathakaliStage = function () {
    const g = new T.Group();
    part(g, G.box(8, 1.0, 6), M().laterite, 0, 0.5, 0);
    part(g, G.box(7.6, 0.08, 5.6), M().woodLight, 0, 1.04, 0);
    [[-3.6, -2.6], [3.6, -2.6], [-3.6, 2.6], [3.6, 2.6]].forEach((p) => part(g, G.cyl(0.16, 0.18, 3.6, 8), M().woodDark, p[0], 2.8, p[1]));
    part(g, KT.hipRoofGeometry(10, 8, 2.6, 0.35), M().roof, 0, 4.6, 0);
    part(g, G.box(7.2, 3.4, 0.2), M().maroon, 0, 2.7, -2.6);
    // nilavilakku (brass lamp) at the front of stage
    part(g, G.cyl(0.25, 0.3, 0.1, 10), M().brass, 0, 1.1, 2.2);
    part(g, G.cyl(0.04, 0.06, 1.1, 8), M().brass, 0, 1.65, 2.2);
    part(g, G.cyl(0.3, 0.12, 0.12, 10), M().brass, 0, 2.25, 2.2);
    part(g, G.sph(0.08, 6, 5), M().lampGlow, 0, 2.38, 2.2);
    for (let i = 0; i < 3; i++) part(g, G.box(1.6, 0.25, 0.5), M().stoneGrey, 0, 0.12 + i * 0.25, 3.2 + (2 - i) * 0.5);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 4, hd: 3 }];
    g.userData.stageY = 1.08;
    return KT.bake(g);
  };

  Models.infoKiosk = function () {
    const g = new T.Group();
    part(g, G.box(3.6, 1.1, 1.6), M().wood, 0, 0.55, 0);
    part(g, G.box(3.8, 0.1, 1.8), M().woodLight, 0, 1.15, 0);
    [[-1.7, -0.7], [1.7, -0.7], [-1.7, 0.7], [1.7, 0.7]].forEach((p) => part(g, G.cyl(0.07, 0.07, 2.6, 6), M().woodDark, p[0], 1.3, p[1]));
    part(g, KT.hipRoofGeometry(4.6, 2.8, 1.0, 0.4), M().roof, 0, 2.6, 0);
    const sign = new T.Mesh(G.plane(2.6, 0.6), new T.MeshStandardMaterial({ map: KT.textTexture(['Tourist Information', 'Kerala Tourism'], { width: 1024, height: 256, bg: '#1f5f3f' }) }));
    sign.position.set(0, 2.35, 0.75);
    g.add(sign);
    for (let i = 0; i < 5; i++) part(g, G.box(0.25, 0.02, 0.35), [M().red, M().blue, M().yellow, M().teal, M().pink][i], -1.2 + i * 0.5, 1.21, 0.2);
    g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.9, hd: 0.9 }];
    return KT.bake(g);
  };
})();
