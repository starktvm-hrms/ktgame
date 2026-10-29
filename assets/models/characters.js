// Player & NPC characters: stylised traveller (male / female) with outfits,
// hairstyles, accessories, facial features and a procedural animation rig
// (idle, walk, run, jump, namaskaram, paddle, wave, kathakali dance).
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};

  const C = (hex) => KT.mat('c' + hex.toString(16), { color: hex });

  Models.OUTFITS = {
    male: {
      casual: { label: 'Casual Traveller', top: 0x5f7a45, inner: 0xf1ece0, bottom: 0xcdb791, shoes: 0x6b4a2e, sleeve: 'short', lower: 'pants', open: true, pockets: true },
      mundu: { label: 'Traditional (Mundu)', top: 0xf8f6ef, inner: 0xf8f6ef, bottom: 0xf8f6ef, shoes: 0x7a5233, sleeve: 'short', lower: 'mundu', border: 0xd4a434, sandals: true },
      hiking: { label: 'Outdoor / Hiking', top: 0x2f5f9e, inner: 0x2f5f9e, bottom: 0x55585a, shoes: 0x5a4030, sleeve: 'long', lower: 'shorts', socks: 0xf0f0f0 },
      formal: { label: 'Formal Casual', top: 0x86acd8, inner: 0x86acd8, bottom: 0xd2c19c, shoes: 0x6a3f22, sleeve: 'long', lower: 'pants' },
      rain: { label: 'Rain Wear', top: 0xf2c230, inner: 0xf2c230, bottom: 0x2a2f3a, shoes: 0x1f1f1f, sleeve: 'long', lower: 'pants', hood: true, coat: true }
    },
    female: {
      casual: { label: 'Casual Traveller', top: 0x617a48, inner: 0xf1e7d6, bottom: 0x8f8c5e, shoes: 0x6b4a2e, sleeve: 'short', lower: 'pants', open: true, pockets: true },
      saree: { label: 'Kasavu Saree', top: 0xd4a434, inner: 0xd4a434, bottom: 0xf6f1e2, shoes: 0x7a5233, sleeve: 'cap', lower: 'saree', border: 0xd4a434, sandals: true },
      churidar: { label: 'Churidar', top: 0x3aa39a, inner: 0x3aa39a, bottom: 0xf2efe6, shoes: 0x7a5233, sleeve: 'long', lower: 'churidar', dupatta: 0xf3c7d4, sandals: true },
      hiking: { label: 'Outdoor / Hiking', top: 0xe0457b, inner: 0xe0457b, bottom: 0x232326, shoes: 0x5a4030, sleeve: 'long', lower: 'pants' },
      rain: { label: 'Rain Wear', top: 0xf2c230, inner: 0xf2c230, bottom: 0x2a2f3a, shoes: 0xf2c230, sleeve: 'long', lower: 'pants', hood: true, coat: true }
    }
  };
  Models.HAIR = {
    male: { default: 'Default', short: 'Short', wavy: 'Wavy', curly: 'Curly' },
    female: { default: 'Ponytail', loose: 'Loose', braid: 'Braid', bun: 'Bun' }
  };

  function limb(parent, len, r0, r1, mat, seg) {
    return part(parent, G.cyl(r1, r0, len, seg || 10), mat, 0, -len / 2, 0);
  }

  function buildHair(head, cfg, hairMat) {
    const female = cfg.gender === 'female';
    const style = cfg.hair || 'default';
    // scalp cap
    const cap = new T.SphereGeometry(0.212, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56);
    part(head, cap, hairMat, 0, 0.225, -0.03, 0.22, 0, 0, 1, 1.0, 1.04);
    // back of head
    part(head, G.sph(0.2, 14, 10), hairMat, 0, 0.17, -0.06, 0, 0, 0, 1.02, 1.05, 0.95);
    if (!female) {
      if (style === 'short') {
        part(head, G.sph(0.2, 12, 8), hairMat, 0, 0.3, 0.02, 0, 0, 0, 1.02, 0.55, 1.0);
      } else if (style === 'curly') {
        const rng = KT.makeRng(4);
        for (let i = 0; i < 26; i++) {
          const a = rng() * Math.PI * 2, e = 0.2 + rng() * 1.0;
          part(head, G.sph(0.06, 7, 5), hairMat, Math.cos(a) * Math.cos(e) * 0.2, 0.22 + Math.sin(e) * 0.2, Math.sin(a) * Math.cos(e) * 0.2 - 0.02);
        }
      } else {
        // default / wavy: swept tufts with a fringe
        const wav = style === 'wavy' ? 1.25 : 1;
        const tufts = [[0, 0.41, 0.06, 0.11], [0.09, 0.4, 0.1, 0.09], [-0.1, 0.39, 0.09, 0.09], [0.05, 0.37, 0.15, 0.08], [-0.06, 0.36, 0.16, 0.08], [0.15, 0.33, 0.05, 0.08], [-0.15, 0.33, 0.04, 0.08], [0, 0.4, -0.06, 0.1]];
        tufts.forEach((t, i) => part(head, G.sph(t[3] * wav * 0.82, 9, 7), hairMat, t[0], t[1] + 0.01, t[2] - 0.02, 0.3, i, 0, 1.2, 0.75, 1.1));
        part(head, G.sph(0.06, 8, 6), hairMat, 0.06, 0.35, 0.16, 0.6, 0, 0.4, 1.3, 0.6, 0.8);
      }
      // sideburns
      [-1, 1].forEach((s) => part(head, G.box(0.03, 0.1, 0.06), hairMat, s * 0.195, 0.17, 0.02));
      return null;
    }
    // female
    part(head, G.sph(0.075, 8, 6), hairMat, 0.08, 0.36, 0.14, 0.5, 0, -0.5, 1.6, 0.6, 0.8);
    part(head, G.sph(0.07, 8, 6), hairMat, -0.1, 0.35, 0.13, 0.5, 0, 0.5, 1.5, 0.6, 0.8);
    [-1, 1].forEach((s) => part(head, G.box(0.05, 0.2, 0.08), hairMat, s * 0.19, 0.14, 0.04));
    const tail = new T.Group();
    tail.position.set(0, 0.25, -0.2);
    head.add(tail);
    if (style === 'loose') {
      part(head, G.box(0.38, 0.5, 0.1), hairMat, 0, -0.02, -0.15, 0.1);
      part(head, G.sph(0.2, 10, 8), hairMat, 0, -0.25, -0.17, 0, 0, 0, 0.95, 0.4, 0.45);
      return null;
    } else if (style === 'bun') {
      part(tail, G.sph(0.11, 10, 8), hairMat, 0, 0.08, -0.02);
      part(tail, G.torus(0.09, 0.02, 4, 12), C(0xd4a434), 0, 0.06, 0.0, 0.5);
      return null;
    } else if (style === 'braid') {
      for (let i = 0; i < 7; i++) part(tail, G.sph(0.065 - i * 0.004, 8, 6), hairMat, (i % 2 ? 0.02 : -0.02), -0.05 - i * 0.09, -0.02 - i * 0.012);
      part(tail, G.cyl(0.03, 0.03, 0.04, 6), C(0xd8203a), 0, -0.68, -0.1);
    } else {
      part(tail, G.sph(0.06, 8, 6), C(0xd8203a), 0, 0, 0);
      for (let i = 0; i < 6; i++) part(tail, G.sph(0.085 - i * 0.008, 9, 7), hairMat, 0, -0.04 - i * 0.075, -0.05 - i * 0.02, 0, 0, 0, 1, 1.25, 1);
    }
    tail.rotation.x = 0.25;
    return tail;
  }

  function buildFace(head, cfg, skin) {
    const female = cfg.gender === 'female';
    const white = C(0xffffff), iris = C(0x2b1a10), pupil = C(0x0a0605);
    [-1, 1].forEach((s) => {
      part(head, G.sph(0.046, 12, 10), white, s * 0.075, 0.2, 0.165, 0, 0, 0, 1, female ? 1.15 : 1.0, 0.55);
      part(head, G.sph(0.03, 10, 8), iris, s * 0.075, 0.195, 0.186, 0, 0, 0, 1, 1.1, 0.5);
      part(head, G.sph(0.016, 6, 5), pupil, s * 0.075, 0.195, 0.197, 0, 0, 0, 1, 1, 0.4);
      part(head, G.sph(0.008, 4, 4), white, s * 0.075 + 0.01, 0.207, 0.2);
      // brows
      part(head, G.box(0.075, female ? 0.012 : 0.018, 0.02), C(0x24160e), s * 0.078, 0.268, 0.178, 0, 0, s * (female ? -0.12 : -0.08));
      if (female) part(head, G.box(0.07, 0.012, 0.02), C(0x120a06), s * 0.078, 0.238, 0.18, 0, 0, s * -0.15);
      // ears
      part(head, G.sph(0.045, 8, 6), skin, s * 0.2, 0.18, 0, 0, 0, 0, 0.5, 1, 0.8);
      if (female) part(head, G.sph(0.016, 6, 4), C(0xd4a434), s * 0.205, 0.13, 0.01);
    });
    part(head, G.sph(0.03, 8, 6), skin, 0, 0.16, 0.2, 0, 0, 0, 0.8, 0.9, 0.9);
    // smile
    part(head, G.torus(0.04, 0.009, 4, 12, Math.PI), C(0x8a3a2e), 0, 0.105, 0.177, 0, 0, Math.PI, 1, 0.6, 1);
    if (female) part(head, G.sph(0.012, 6, 4), C(0xb3261e), 0, 0.26, 0.19);
  }

  // cfg: {gender, outfit, hair, acc:{backpack,camera,hat,sunglasses}, skin, colors:{top,bottom}, lite}
  Models.character = function (cfg) {
    cfg = Object.assign({ gender: 'male', outfit: 'casual', hair: 'default', acc: { backpack: true } }, cfg || {});
    const female = cfg.gender === 'female';
    const of = Object.assign({}, Models.OUTFITS[cfg.gender][cfg.outfit] || Models.OUTFITS[cfg.gender].casual, cfg.colors || {});
    const skin = C(cfg.skin || (female ? 0xc8916a : 0xc08660));
    const hairMat = C(cfg.hairColor || 0x1d130e);
    const topM = C(of.top), innerM = C(of.inner), botM = C(of.bottom), shoeM = C(of.shoes);
    const root = new T.Group();
    const rig = {};
    const shoulderW = female ? 0.215 : 0.25;
    // hips
    const hips = rig.hips = new T.Group();
    hips.position.y = 0.93;
    root.add(hips);
    part(hips, G.cyl(0.175, 0.185, 0.2, 12), botM, 0, 0, 0, 0, 0, 0, 1, 1, 0.8);
    part(hips, G.cyl(0.165, 0.165, 0.05, 12), C(0x3a2a1c), 0, 0.09, 0, 0, 0, 0, 1, 1, 0.82);
    // legs
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const hip = rig['hip' + side] = new T.Group();
      hip.position.set(s * 0.095, -0.02, 0);
      hips.add(hip);
      const thighMat = of.lower === 'churidar' ? botM : botM;
      limb(hip, 0.43, 0.1, 0.08, of.lower === 'shorts' ? botM : thighMat);
      if (of.pockets) part(hip, G.box(0.04, 0.12, 0.1), botM, s * 0.08, -0.24, 0);
      const knee = rig['knee' + side] = new T.Group();
      knee.position.y = -0.43;
      hip.add(knee);
      limb(knee, 0.4, 0.077, 0.062, of.lower === 'shorts' ? skin : botM);
      if (of.socks) part(knee, G.cyl(0.06, 0.06, 0.12, 8), C(of.socks), 0, -0.36, 0);
      if (of.sandals) {
        part(knee, G.sph(0.06, 8, 6), skin, 0, -0.43, 0.03, 0, 0, 0, 0.9, 0.6, 1.6);
        part(knee, G.box(0.11, 0.025, 0.24), shoeM, 0, -0.485, 0.04);
      } else {
        part(knee, G.box(0.13, 0.13, 0.27), shoeM, 0, -0.435, 0.04);
        part(knee, G.box(0.135, 0.035, 0.28), C(0x2a1d14), 0, -0.485, 0.045);
        part(knee, G.cyl(0.07, 0.072, 0.12, 10), shoeM, 0, -0.36, 0);
      }
    });
    // lower garments that hang from the hips
    if (of.lower === 'mundu' || of.lower === 'saree') {
      const len = of.lower === 'saree' ? 0.86 : 0.8;
      const flare = of.lower === 'saree' ? 0.27 : 0.23;
      part(hips, G.cyl(0.17, flare, len, 16), botM, 0, -len / 2 + 0.06, 0.01, 0, 0, 0, 1, 1, 0.85);
      part(hips, G.cyl(flare + 0.004, flare + 0.004, 0.06, 16), C(of.border), 0, -len + 0.1, 0.01, 0, 0, 0, 1, 1, 0.85);
      part(hips, G.cyl(flare - 0.005, flare + 0.002, 0.02, 16), C(of.border), 0, -len + 0.15, 0.01, 0, 0, 0, 1, 1, 0.85);
      if (of.lower === 'mundu') part(hips, G.box(0.03, len - 0.1, 0.02), C(of.border), 0.06, -len / 2 + 0.06, 0.2, 0, 0, 0.05);
      else {
        // pleats at the front
        for (let i = 0; i < 4; i++) part(hips, G.box(0.03, len - 0.1, 0.03), botM, -0.06 + i * 0.04, -len / 2 + 0.04, 0.2 + (i % 2) * 0.01, -0.12);
      }
    } else if (of.lower === 'churidar') {
      part(hips, G.cyl(0.18, 0.26, 0.5, 14), topM, 0, -0.18, 0, 0, 0, 0, 1, 1, 0.85);
      part(hips, G.cyl(0.262, 0.262, 0.04, 14), C(0xd4a434), 0, -0.42, 0, 0, 0, 0, 1, 1, 0.85);
    } else if (of.coat) {
      part(hips, G.cyl(0.18, 0.23, 0.45, 14), topM, 0, -0.16, 0, 0, 0, 0, 1, 1, 0.85);
    }
    // spine / chest
    const spine = rig.spine = new T.Group();
    spine.position.y = 0.08;
    hips.add(spine);
    const chestW = female ? 0.19 : 0.215;
    part(spine, G.cyl(chestW, 0.17, 0.44, 14), topM, 0, 0.22, 0, 0, 0, 0, 1, 1, 0.75);
    if (of.open) {
      part(spine, G.box(0.13, 0.4, 0.04), innerM, 0, 0.22, 0.12);
      [-1, 1].forEach((s) => part(spine, G.box(0.04, 0.38, 0.03), topM, s * 0.075, 0.22, 0.13, 0, 0, s * 0.08));
    }
    if (of.lower === 'saree') {
      // midriff, blouse and the draped pallu across the chest
      part(spine, G.cyl(0.15, 0.15, 0.08, 12), skin, 0, 0.02, 0, 0, 0, 0, 1, 1, 0.75);
      part(spine, G.box(0.36, 0.08, 0.3), botM, 0, 0.2, 0.0, 0, 0, 0.55);
      part(spine, G.box(0.1, 0.5, 0.05), botM, 0.03, 0.22, 0.12, 0, 0, 0.6);
      part(spine, G.box(0.1, 0.03, 0.055), C(of.border), 0.1, 0.36, 0.125, 0, 0, 0.6);
      part(spine, G.box(0.12, 0.6, 0.04), botM, 0.12, 0.1, -0.13, 0.05);
      part(spine, G.box(0.125, 0.04, 0.045), C(of.border), 0.12, -0.18, -0.13);
    }
    if (of.dupatta) {
      part(spine, G.torus(0.17, 0.035, 6, 14), C(of.dupatta), 0, 0.42, 0.0, Math.PI / 2 + 0.2, 0, 0, 1, 0.8, 1);
      [-1, 1].forEach((s) => part(spine, G.box(0.07, 0.45, 0.03), C(of.dupatta), s * 0.15, 0.15, -0.12, 0.1));
    }
    if (of.coat) {
      [-1, 1].forEach((s) => part(spine, G.sph(0.012, 5, 4), C(0x333333), 0.02, 0.1 + s * 0.08, 0.15));
      part(spine, G.box(0.02, 0.4, 0.02), C(0xc79a1f), 0, 0.22, 0.145);
    }
    // collar
    part(spine, G.torus(0.085, 0.025, 6, 14), of.open ? topM : topM, 0, 0.46, 0.0, Math.PI / 2, 0, 0);
    // neck & head
    part(spine, G.cyl(0.058, 0.065, 0.12, 10), skin, 0, 0.5, 0);
    const head = rig.head = new T.Group();
    head.position.set(0, 0.55, 0.01);
    spine.add(head);
    part(head, G.sph(0.2, 18, 14), skin, 0, 0.19, 0, 0, 0, 0, 0.94, 1.0, 0.96);
    part(head, G.sph(0.13, 12, 10), skin, 0, 0.1, 0.06, 0, 0, 0, 1, 0.8, 1); // jaw / cheeks
    buildFace(head, cfg, skin);
    rig.tail = buildHair(head, cfg, hairMat);
    if (of.hood) {
      part(head, new T.SphereGeometry(0.235, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), topM, 0, 0.2, -0.03, -0.35, 0, 0, 1, 1.02, 1.05);
    }
    const acc = cfg.acc || {};
    if (acc.hat && !of.hood) {
      part(head, G.cyl(0.31, 0.31, 0.02, 20), C(0xc9ad7f), 0, 0.37, 0, -0.06);
      part(head, G.cyl(0.16, 0.19, 0.15, 16), C(0xc9ad7f), 0, 0.45, -0.01, -0.06);
      part(head, G.cyl(0.192, 0.192, 0.04, 16), C(0x5a3a22), 0, 0.395, -0.01, -0.06);
    }
    if (acc.sunglasses) {
      [-1, 1].forEach((s) => part(head, G.box(0.075, 0.05, 0.02), C(0x101010), s * 0.075, 0.205, 0.205));
      part(head, G.box(0.04, 0.012, 0.015), C(0x101010), 0, 0.215, 0.205);
      [-1, 1].forEach((s) => part(head, G.box(0.012, 0.012, 0.18), C(0x101010), s * 0.12, 0.215, 0.12));
    }
    // arms
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const sh = rig['sh' + side] = new T.Group();
      sh.position.set(s * shoulderW, 0.42, 0);
      spine.add(sh);
      part(sh, G.sph(0.08, 10, 8), topM, 0, 0, 0);
      const longSleeve = of.sleeve === 'long';
      limb(sh, 0.29, 0.07, 0.058, of.sleeve === 'cap' ? skin : (longSleeve ? topM : skin));
      if (of.sleeve === 'short') part(sh, G.cyl(0.082, 0.076, 0.18, 10), topM, 0, -0.08, 0);
      if (of.sleeve === 'cap') part(sh, G.cyl(0.07, 0.066, 0.08, 10), topM, 0, -0.03, 0);
      const el = rig['el' + side] = new T.Group();
      el.position.y = -0.29;
      sh.add(el);
      limb(el, 0.26, 0.057, 0.047, longSleeve ? topM : skin);
      if (longSleeve) part(el, G.cyl(0.046, 0.046, 0.04, 8), skin, 0, -0.27, 0);
      part(el, G.sph(0.052, 10, 8), skin, 0, -0.31, 0.005, 0, 0, 0, 0.8, 1.1, 1);
      if (side === 'L' && !female) part(el, G.cyl(0.05, 0.05, 0.035, 10), C(0x222222), 0, -0.22, 0);
      if (female) part(el, G.torus(0.045, 0.008, 4, 10), C(0xd4a434), 0, -0.24, 0, Math.PI / 2);
      sh.rotation.z = s * 0.08;
    });
    if (acc.backpack) {
      part(spine, G.box(0.34, 0.42, 0.18), C(0x5b4330), 0, 0.24, -0.22);
      part(spine, G.box(0.26, 0.18, 0.06), C(0x4a3627), 0, 0.15, -0.33);
      part(spine, G.cyl(0.07, 0.07, 0.36, 10), C(0x7a6650), 0, 0.5, -0.2, 0, 0, Math.PI / 2);
      [-1, 1].forEach((s) => {
        part(spine, G.box(0.04, 0.42, 0.03), C(0x3e2c1f), s * 0.11, 0.25, 0.135, -0.05);
        part(spine, G.box(0.04, 0.12, 0.2), C(0x3e2c1f), s * 0.11, 0.44, 0.03);
      });
    }
    if (acc.camera) {
      part(spine, G.box(0.13, 0.08, 0.06), C(0x1b1b1b), 0, 0.2, 0.17);
      part(spine, G.cyl(0.03, 0.03, 0.05, 10), C(0x2b2b2b), 0, 0.2, 0.21, Math.PI / 2);
      part(spine, G.torus(0.13, 0.008, 4, 12, Math.PI), C(0x1b1b1b), 0, 0.3, 0.13, 0, 0, Math.PI);
    }
    root.scale.setScalar(cfg.scale || 0.95);
    rig.root = root;
    root.userData.rig = rig;
    root.userData.anim = { phase: 0, t: 0, blink: 0 };
    root.userData.headBase = 0;
    KT.skinify(root);
    return root;
  };

  // Kathakali performer (pacha vesham): green face, white chutti, golden
  // kireedam and voluminous skirt.
  Models.kathakaliDancer = function () {
    const root = new T.Group();
    const rig = {};
    const red = C(0xc8322a), white = C(0xf6f1e2), gold = C(0xd4a434), green = C(0x2f9a45), skin = C(0xa86f4c), black = C(0x111111);
    const hips = rig.hips = new T.Group();
    hips.position.y = 0.9;
    root.add(hips);
    // the big round skirt (koshavam)
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new T.Vector2(0.18 + Math.sin(t * Math.PI * 0.9) * 0.45 + t * 0.05, -t * 0.8));
    }
    part(hips, new T.LatheGeometry(pts, 20), white, 0, 0.1, 0);
    for (let k = 0; k < 3; k++) part(hips, G.torus(0.6 - k * 0.05, 0.02, 4, 24), k === 1 ? gold : red, 0, -0.35 - k * 0.12, 0, Math.PI / 2);
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const hip = rig['hip' + side] = new T.Group();
      hip.position.set(s * 0.12, -0.05, 0);
      hips.add(hip);
      limb(hip, 0.43, 0.08, 0.07, white);
      const knee = rig['knee' + side] = new T.Group();
      knee.position.y = -0.43;
      hip.add(knee);
      limb(knee, 0.4, 0.065, 0.055, red);
      part(knee, G.torus(0.065, 0.02, 4, 10), gold, 0, -0.38, 0, Math.PI / 2);
      part(knee, G.box(0.12, 0.05, 0.22), skin, 0, -0.45, 0.04);
    });
    const spine = rig.spine = new T.Group();
    spine.position.y = 0.08;
    hips.add(spine);
    part(spine, G.cyl(0.21, 0.17, 0.46, 14), red, 0, 0.22, 0, 0, 0, 0, 1, 1, 0.75);
    for (let i = 0; i < 5; i++) part(spine, G.sph(0.03, 6, 5), gold, -0.12 + i * 0.06, 0.38, 0.14);
    part(spine, G.torus(0.16, 0.03, 6, 16), gold, 0, 0.42, 0.03, Math.PI / 2 + 0.3);
    for (let i = 0; i < 6; i++) part(spine, G.box(0.05, 0.4, 0.02), [white, red, gold][i % 3], -0.15 + i * 0.06, 0.05, 0.17, -0.2);
    const head = rig.head = new T.Group();
    head.position.set(0, 0.52, 0.01);
    spine.add(head);
    part(head, G.sph(0.19, 18, 14), green, 0, 0.19, 0, 0, 0, 0, 0.95, 1, 0.95);
    // chutti (white paper frame around the jaw)
    part(head, G.torus(0.2, 0.045, 6, 20, Math.PI), white, 0, 0.17, 0.05, 0, 0, Math.PI, 1, 0.9, 0.6);
    part(head, G.box(0.16, 0.025, 0.02), red, 0, 0.1, 0.185);
    [-1, 1].forEach((s) => {
      part(head, G.sph(0.04, 10, 8), C(0xffffff), s * 0.07, 0.22, 0.165, 0, 0, 0, 1.2, 0.8, 0.5);
      part(head, G.sph(0.022, 8, 6), C(0xb3261e), s * 0.07, 0.22, 0.186);
      part(head, G.box(0.09, 0.018, 0.02), black, s * 0.075, 0.27, 0.18, 0, 0, s * 0.3);
    });
    part(head, G.box(0.03, 0.08, 0.02), C(0xf2c230), 0, 0.31, 0.18);
    // kireedam - golden halo crown
    part(head, G.cyl(0.21, 0.19, 0.16, 16), gold, 0, 0.4, 0);
    part(head, G.cyl(0.42, 0.42, 0.04, 24), gold, 0, 0.45, -0.12, Math.PI / 2 - 0.15);
    part(head, G.cyl(0.36, 0.36, 0.05, 24), red, 0, 0.45, -0.1, Math.PI / 2 - 0.15);
    part(head, G.cone(0.12, 0.25, 10), gold, 0, 0.6, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(head, G.sph(0.035, 6, 5), i % 2 ? C(0x1b8fd6) : C(0xd8203a), Math.cos(a) * 0.4, 0.45 + Math.sin(a) * 0.4, -0.07);
    }
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const sh = rig['sh' + side] = new T.Group();
      sh.position.set(s * 0.25, 0.42, 0);
      spine.add(sh);
      part(sh, G.sph(0.09, 10, 8), red, 0, 0, 0);
      limb(sh, 0.29, 0.065, 0.055, red);
      const el = rig['el' + side] = new T.Group();
      el.position.y = -0.29;
      sh.add(el);
      limb(el, 0.26, 0.052, 0.045, white);
      part(el, G.torus(0.05, 0.02, 4, 10), gold, 0, -0.24, 0, Math.PI / 2);
      part(el, G.sph(0.055, 10, 8), green, 0, -0.31, 0, 0, 0, 0, 0.8, 1.1, 1);
      for (let k = 0; k < 3; k++) part(el, G.cone(0.008, 0.1, 4), C(0xdedede), -0.02 + k * 0.02, -0.39, 0, Math.PI);
    });
    rig.root = root;
    root.userData.rig = rig;
    root.userData.anim = { phase: 0, t: 0 };
    root.userData.dancer = true;
    KT.skinify(root);
    return root;
  };

  // --------------------------------------------------------- animation
  const POSES = {
    idle: function (p, a) {
      const b = Math.sin(a.t * 1.8) * 0.02;
      return { spine: [b, 0, 0], shL: [0.05, 0, 0.1], shR: [0.05, 0, -0.1], elL: [-0.15, 0, 0], elR: [-0.15, 0, 0], head: [Math.sin(a.t * 0.6) * 0.04, Math.sin(a.t * 0.35) * 0.25, 0], bob: 0 };
    },
    walk: function (p) {
      const s = Math.sin(p), c = Math.cos(p);
      return {
        hipL: [-s * 0.55, 0, 0], hipR: [s * 0.55, 0, 0],
        kneeL: [Math.max(0, c) * 0.9 + 0.05, 0, 0], kneeR: [Math.max(0, -c) * 0.9 + 0.05, 0, 0],
        shL: [s * 0.5, 0, 0.08], shR: [-s * 0.5, 0, -0.08], elL: [-0.35, 0, 0], elR: [-0.35, 0, 0],
        spine: [0.05, s * 0.06, 0], head: [-0.03, -s * 0.05, 0], bob: Math.abs(c) * 0.035
      };
    },
    run: function (p) {
      const s = Math.sin(p), c = Math.cos(p);
      return {
        hipL: [-s * 0.95, 0, 0], hipR: [s * 0.95, 0, 0],
        kneeL: [Math.max(0, c) * 1.6 + 0.2, 0, 0], kneeR: [Math.max(0, -c) * 1.6 + 0.2, 0, 0],
        shL: [s * 0.9, 0, 0.12], shR: [-s * 0.9, 0, -0.12], elL: [-1.4, 0, 0], elR: [-1.4, 0, 0],
        spine: [0.22, s * 0.12, 0], head: [-0.15, -s * 0.08, 0], bob: Math.abs(c) * 0.08
      };
    },
    jump: function () {
      return { hipL: [-0.9, 0, 0], kneeL: [1.3, 0, 0], hipR: [-0.2, 0, 0], kneeR: [0.5, 0, 0], shL: [-2.4, 0, 0.3], shR: [-2.0, 0, -0.3], elL: [-0.4, 0, 0], elR: [-0.4, 0, 0], spine: [0.05, 0, 0], head: [-0.15, 0, 0], bob: 0.05 };
    },
    fall: function () {
      return { hipL: [-0.4, 0, 0], kneeL: [0.6, 0, 0], hipR: [-0.1, 0, 0], kneeR: [0.3, 0, 0], shL: [-0.6, 0, 0.9], shR: [-0.6, 0, -0.9], elL: [-0.3, 0, 0], elR: [-0.3, 0, 0], spine: [0, 0, 0], head: [0.1, 0, 0], bob: 0 };
    },
    namaskaram: function (p, a) {
      return { shL: [-0.75, 0, -0.42], shR: [-0.75, 0, 0.42], elL: [-1.75, 0.3, 0], elR: [-1.75, -0.3, 0], spine: [0.18, 0, 0], head: [0.3, 0, 0], bob: 0 };
    },
    wave: function (p, a) {
      return { shR: [-0.2, 0, -2.6], elR: [-0.3, 0, Math.sin(a.t * 9) * 0.45], shL: [0.05, 0, 0.1], elL: [-0.15, 0, 0], head: [-0.05, 0, 0.1], spine: [0, 0, 0], bob: 0 };
    },
    sit: function (p, a) {
      return { hipL: [-1.45, 0, 0.12], hipR: [-1.45, 0, -0.12], kneeL: [1.35, 0, 0], kneeR: [1.35, 0, 0], shL: [0.05, 0, 0.1], shR: [0.05, 0, -0.1], elL: [-0.8, 0, 0], elR: [-0.8, 0, 0], spine: [0, 0, 0], head: [0, Math.sin(a.t * 0.4) * 0.4, 0], bob: -0.42 };
    },
    paddle: function (p, a) {
      const s = Math.sin(p), c = Math.cos(p);
      return {
        hipL: [-1.45, 0, 0.12], hipR: [-1.45, 0, -0.12], kneeL: [1.35, 0, 0], kneeR: [1.35, 0, 0],
        shL: [-0.9 + s * 0.5, 0, -0.2], shR: [-0.6 + s * 0.6, 0, 0.1 + c * 0.3], elL: [-0.9, 0, 0], elR: [-0.6, 0, 0],
        spine: [0.15 + s * 0.08, c * 0.25, 0], head: [-0.1, -c * 0.15, 0], bob: -0.42
      };
    },
    dance: function (p, a) {
      const t = a.t;
      const s = Math.sin(t * 2.2), c = Math.cos(t * 1.1);
      return {
        hipL: [-0.5, 0, 0.45], hipR: [-0.5, 0, -0.45], kneeL: [0.9, 0, 0], kneeR: [0.9, 0, 0],
        shL: [-0.6 + s * 0.5, 0, 1.0 + c * 0.4], shR: [-0.6 - s * 0.5, 0, -1.0 + c * 0.4], elL: [-1.4 + c * 0.4, 0, 0], elR: [-1.4 - c * 0.4, 0, 0],
        spine: [0.05, Math.sin(t * 1.1) * 0.35, Math.sin(t * 2.2) * 0.08], head: [Math.sin(t * 4.4) * 0.12, Math.sin(t * 2.2) * 0.4, Math.sin(t * 3.3) * 0.15], bob: -0.12 + Math.abs(s) * 0.05
      };
    }
  };
  const JOINTS = ['hipL', 'hipR', 'kneeL', 'kneeR', 'shL', 'shR', 'elL', 'elR', 'spine', 'head'];

  // state: idle|walk|run|jump|fall|namaskaram|wave|sit|paddle|dance
  Models.animateCharacter = function (ch, state, dt, speedFactor) {
    const rig = ch.userData.rig, a = ch.userData.anim;
    a.t += dt;
    const rate = state === 'run' ? 10.5 : state === 'walk' ? 7.2 : state === 'paddle' ? 3 : 0;
    a.phase += dt * rate * (speedFactor || 1);
    const pose = (POSES[state] || POSES.idle)(a.phase, a);
    const k = 1 - Math.exp(-dt * (state === 'jump' ? 10 : 12));
    JOINTS.forEach((j) => {
      const bone = rig[j];
      if (!bone) return;
      const tgt = pose[j] || (j.indexOf('sh') === 0 ? [0.05, 0, j === 'shL' ? 0.08 : -0.08] : [0, 0, 0]);
      bone.rotation.x += (tgt[0] - bone.rotation.x) * k;
      bone.rotation.y += (tgt[1] - bone.rotation.y) * k;
      bone.rotation.z += (tgt[2] - bone.rotation.z) * k;
    });
    const baseY = 0.93;
    rig.hips.position.y += (baseY + (pose.bob || 0) - rig.hips.position.y) * k;
    if (rig.tail) {
      rig.tail.rotation.x = 0.25 + (state === 'run' ? 0.5 : state === 'walk' ? 0.2 : 0) + Math.sin(a.phase * 2) * 0.08;
      rig.tail.rotation.z = Math.sin(a.phase) * 0.12;
    }
  };
})();
