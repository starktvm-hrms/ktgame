// HD characters: realistic, rigged glTF people (CC0 MakeHuman bodies built
// with the open-source Ara 3D Gen; see assets/hd/LICENSE.txt) worn over the
// game's own light characters.
//
// Every character keeps its light procedural rig, and the game goes on
// posing that rig (walk, run, sit, drive, paddle, climb, namaskaram...).
// Near the camera an HD body is laid over it: each frame the rig's joint
// rotations are carried over onto the HD skeleton, so every pose and prop
// keeps working. Far away the light model is shown as before.
(function () {
  'use strict';
  const T = THREE;
  const HD = KT.HD = { enabled: true, near: 36, max: 16, list: [], ready: {}, loading: {} };

  // The outfits: one body per look, the cloth is white and tinted per person.
  const VARIANTS = {
    m_mundu: 'assets/hd/m_mundu.glb',
    m_pants: 'assets/hd/m_pants.glb',
    m_tee: 'assets/hd/m_tee.glb',
    f_saree: 'assets/hd/f_saree.glb',
    f_churidar: 'assets/hd/f_churidar.glb',
    f_jeans: 'assets/hd/f_jeans.glb',
    k_boy: 'assets/hd/k_boy.glb',
    k_girl: 'assets/hd/k_girl.glb'
  };
  // children are the adult rig scaled down (scale under 0.8)
  const isKid = (cfg) => (cfg.scale || 1) < 0.8;
  function variantFor(cfg) {
    const female = cfg.gender === 'female';
    if (isKid(cfg)) return female ? 'k_girl' : 'k_boy';
    const of = KT.Models.OUTFITS[female ? 'female' : 'male'][cfg.outfit] || {};
    if (female) {
      if (of.bottomType === 'saree') return 'f_saree';
      if (of.topType === 'kurta') return 'f_churidar';
      return 'f_jeans';
    }
    if (of.bottomType === 'mundu') return 'm_mundu';
    if (of.bottomType === 'shorts') return 'm_tee';
    return 'm_pants';
  }

  // game joint -> HD bones (spine is shared out over the three spine bones)
  const MAP = {
    Hips: 'hips', LeftUpLeg: 'hipL', RightUpLeg: 'hipR', LeftLeg: 'kneeL', RightLeg: 'kneeR',
    LeftFoot: 'ankleL', RightFoot: 'ankleR', LeftArm: 'shL', RightArm: 'shR', LeftForeArm: 'elL', RightForeArm: 'elR',
    Spine: 'spine', Spine1: 'spine', Spine2: 'spine', Head: 'head'
  };
  const SPINE_SHARE = { Spine: 0.34, Spine1: 0.67, Spine2: 1 };
  // the game rig hangs its limbs straight down at rest; the HD body stands in
  // an A-pose, so each limb is first turned to hang the same way
  const ALIGN = { LeftUpLeg: 'LeftLeg', RightUpLeg: 'RightLeg', LeftLeg: 'LeftFoot', RightLeg: 'RightFoot',
    LeftArm: 'LeftForeArm', RightArm: 'RightForeArm', LeftForeArm: 'LeftHand', RightForeArm: 'RightHand' };
  const PARENT = { hips: null, spine: 'hips', head: 'spine', shL: 'spine', shR: 'spine', elL: 'shL', elR: 'shR',
    hipL: 'hips', hipR: 'hips', kneeL: 'hipL', kneeR: 'hipR', ankleL: 'kneeL', ankleR: 'kneeR' };
  const JOINTS = Object.keys(PARENT);
  const DOWN = new T.Vector3(0, -1, 0);

  function prepare(name, gltf) {
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    const bones = [];
    scene.traverse((o) => { if (o.isBone) bones.push(o.name); });
    const q = {}, p = {};
    scene.traverse((o) => { if (o.isBone) { q[o.name] = o.getWorldQuaternion(new T.Quaternion()); p[o.name] = o.getWorldPosition(new T.Vector3()); } });
    // per mapped bone: the A-pose -> hanging-down turn, times the rest pose
    const pre = {};
    Object.keys(MAP).forEach((b) => {
      if (!q[b]) return;
      const a = new T.Quaternion();
      if (ALIGN[b] && p[ALIGN[b]]) a.setFromUnitVectors(p[ALIGN[b]].clone().sub(p[b]).normalize(), DOWN);
      pre[b] = a.multiply(q[b]);
    });
    // the skin texture's average colour, so any skin tone can be tinted from it
    let skinRef = new T.Color(0xe7b48f);
    scene.traverse((o) => {
      const m = o.isMesh && o.material;
      if (!m || m.name !== 'Skin' || !m.map || !m.map.image) return;
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 16;
        const x = c.getContext('2d');
        x.drawImage(m.map.image, 0, 0, 16, 16);
        const d = x.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, bl = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (!(d[i] > d[i + 1] && d[i + 1] > d[i + 2]) || d[i] < 60 || d[i] > 250) continue; // skin-coloured texels only
          r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++;
        }
        if (n) skinRef = new T.Color(r / n / 255, g / n / 255, bl / n / 255);
      } catch (err) { /* keep the default */ }
    });
    const legLen = p.LeftUpLeg && p.LeftFoot ? p.LeftUpLeg.y - p.LeftFoot.y : 0.79;
    HD.ready[name] = { gltf, bones, pre, skinRef, hipsY: p.Hips ? scene.getObjectByName('Hips').position.y : 0.95, legRatio: legLen / 0.79 };
  }

  // fetch every body in the background once the game is running, so
  // nobody waits on a download when they come near
  HD.preload = function () {
    if (!HD.enabled) return;
    Object.keys(VARIANTS).forEach((n, i) => setTimeout(() => HD.load(n), i * 400));
  };
  HD.load = function (name) {
    if (HD.ready[name] || HD.loading[name] || !T.GLTFLoader) return;
    HD.loading[name] = true;
    new T.GLTFLoader().load(VARIANTS[name], (g) => { prepare(name, g); HD.loading[name] = false; }, undefined, () => { HD.loading[name] = 'failed'; });
  };

  // skin and cloth tints (the HD skin texture is a light brown; darker
  // skins are made by tinting it)
  const TOP = ['Uniform shirt', 'Epaulettes', 'Resort shirt', 'Silk blouse', 'Woven tunic', 'Oversized tee', 'Tank top'];
  const BOTTOM = ['Wrapper', 'Trousers', 'Cargo shorts', 'Baggy jeans'];
  function tint(c, ref) {
    const t = new T.Color(c);
    // the ratio is taken on screen colours and turned into a linear-light
    // multiplier, so the skin on screen comes out at the asked-for tone
    if (ref) ['r', 'g', 'b'].forEach((k) => { t[k] = Math.min(1.25, Math.pow(t[k] / ref[k], 1.5)); });
    return t;
  }

  function build(e) {
    const src = HD.ready[e.variant];
    const cfg = e.cfg, female = cfg.gender === 'female';
    const of = Object.assign({}, KT.Models.OUTFITS[female ? 'female' : 'male'][cfg.outfit] || {}, cfg.colors || {});
    const model = T.SkeletonUtils.clone(src.gltf.scene);
    const skinC = tint(cfg.skin || (female ? 0xe2ae8a : 0xd9a27c), src.skinRef);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      const m = o.material = o.material.clone();
      const n = m.name;
      if (n === 'Skin' || n === 'Skin details') m.color.copy(skinC);
      else if (TOP.indexOf(n) >= 0) m.color.set(of.topType === 'open' ? (of.top || 0xffffff) : (of.top || 0xffffff));
      else if (BOTTOM.indexOf(n) >= 0) m.color.set(of.bottom || 0xffffff);
      else if (n === 'Shoulder drape') m.color.set(of.dupatta || of.bottom || 0xffffff);
      else if (n === 'Shoes') m.color.set(of.shoes || 0x5a3a24);
      if (m.map && KT.Toon && KT.Toon.enabled) m.roughness = Math.max(m.roughness, 0.6);
    });
    const bones = {}, order = [];
    model.traverse((o) => { if (o.isBone) { bones[o.name] = o; order.push(o); } });
    e.model = model;
    e.bones = bones;
    e.order = order;
    e.rest = order.map((b) => b.quaternion.clone());
    e.mq = order.map(() => new T.Quaternion());
    e.par = order.map((b) => order.indexOf(b.parent));
    e.restPos = bones.Hips.position.clone();
    model.updateMatrixWorld(true);
    e.baseQ = bones.Hips.parent.getWorldQuaternion(new T.Quaternion());
    e.src = src;
    // a child's HD body is already child-sized: undo the rig's shrinking
    if (isKid(cfg)) model.scale.setScalar(1 / (cfg.scale || 1));
    // the traffic police keep their peaked cap: it follows the game rig's
    // head (where the lite model wears it) over the HD body
    if (of.police && KT.Models.policeCap) {
      const cap = KT.Models.policeCap();
      cap.position.set(0, 0.04, 0.012); // (the HD head is a little lower than the rig's)
      const holder = new T.Group();
      holder.add(cap);
      holder.visible = false;
      e.root.add(holder);
      e.cap = holder;
      // and the black belt with its brass buckle, round the rig's hips
      const belt = new T.Group();
      const bm = new T.Mesh(new T.TorusGeometry(0.15, 0.013, 8, 24), KT.mat('c151515', { color: 0x151515 }));
      bm.rotation.x = Math.PI / 2; bm.scale.z = 0.72; bm.position.y = 0.075;
      const buckle = new T.Mesh(new T.BoxGeometry(0.03, 0.022, 0.008), KT.mat('cd8b24a', { color: 0xd8b24a }));
      buckle.position.set(0, 0.075, 0.112);
      belt.add(bm, buckle);
      belt.visible = false;
      e.root.add(belt);
      e.belt = belt;
    }
    model.visible = false;
    e.root.add(model);
  }

  // A character asks for an HD body (cfg is its Models.character cfg).
  HD.register = function (root, cfg, opts) {
    if (!HD.enabled || !cfg || cfg.lite === 'far' || cfg.hd === false) return;
    const e = { root, cfg, variant: variantFor(cfg), always: opts && opts.always, model: null, on: false, born: performance.now() };
    root.userData.hd = e;
    HD.list.push(e);
    if (e.always) HD.load(e.variant);
  };

  // ------------------------------------------------------------ retarget
  HD.jawOpen = 0.3;
  const _qj = new T.Quaternion(), _ax = new T.Vector3(1, 0, 0);
  const Q = {}, _q = new T.Quaternion(), _q2 = new T.Quaternion(), _e = new T.Euler(), _id = new T.Quaternion();
  JOINTS.forEach((j) => { Q[j] = new T.Quaternion(); });
  HD.pose = function (e) {
    const rig = e.root.userData.rig;
    if (!rig || !e.model) return;
    JOINTS.forEach((j) => {
      const g = rig[j];
      _q.setFromEuler(g ? _e.copy(g.rotation) : _e.set(0, 0, 0));
      if (PARENT[j]) Q[j].copy(Q[PARENT[j]]).multiply(_q); else Q[j].copy(_q);
    });
    const order = e.order, pre = e.src.pre, mq = e.mq, par = e.par;
    for (let i = 0; i < order.length; i++) {
      const b = order[i];
      const pq = par[i] >= 0 ? mq[par[i]] : e.baseQ;
      const j = MAP[b.name];
      if (j && pre[b.name]) {
        let w = Q[j];
        if (SPINE_SHARE[b.name] !== undefined) w = _q2.copy(Q.hips).multiply(_q.setFromEuler(_e.copy(rig.spine.rotation)).slerp(_id, 1 - SPINE_SHARE[b.name]));
        mq[i].copy(w).multiply(pre[b.name]);
        b.quaternion.copy(pq).invert().multiply(mq[i]);
      } else {
        b.quaternion.copy(e.rest[i]);
        mq[i].copy(pq).multiply(b.quaternion);
      }
    }
    if (e.cap && rig.head) {
      // the cap sits where the rig's head is, inside the root
      rig.head.updateWorldMatrix(true, false);
      e.cap.matrix.copy(e.root.matrixWorld).invert().multiply(rig.head.matrixWorld);
      e.cap.matrix.decompose(e.cap.position, e.cap.quaternion, e.cap.scale);
      if (e.belt && rig.hips) {
        rig.hips.updateWorldMatrix(true, false);
        e.belt.matrix.copy(e.root.matrixWorld).invert().multiply(rig.hips.matrixWorld);
        e.belt.matrix.decompose(e.belt.position, e.belt.quaternion, e.belt.scale);
      }
    }
    const hb = e.bones.Hips;
    hb.position.copy(e.restPos);
    hb.position.y += (rig.hips.position.y - 0.93) * e.src.legRatio;
    // talking: the jaw opens with the voice (root.userData.mouth, 0..1)
    const jaw = e.bones.Jaw, m = e.root.userData.mouth || 0;
    if (jaw && m > 0.01) jaw.quaternion.multiply(_qj.setFromAxisAngle(_ax, m * HD.jawOpen));
  };

  function show(e, on) {
    if (on && !e.model) {
      if (!HD.ready[e.variant]) { HD.load(e.variant); return false; }
      build(e);
    }
    if (!e.model) return false;
    e.on = on;
    e.model.visible = on;
    if (e.cap) e.cap.visible = on;
    if (e.belt) e.belt.visible = on;
    const sm = e.root.userData.skinned;
    if (sm) sm.visible = !on;
    return on;
  }

  // Each frame: the nearest few characters wear their HD bodies.
  const _p = new T.Vector3();
  let scanT = 0;
  HD.update = function (dt, camera) {
    if (!HD.enabled || !HD.list.length) return;
    if ((scanT -= dt) <= 0) {
      scanT = 0.3;
      const now = performance.now(), cand = [];
      HD.list = HD.list.filter((e) => {
        let o = e.root, seen = true;
        while (o.parent) { if (!o.visible) seen = false; o = o.parent; }
        if (!o.isScene) {
          // taken out of the world: forget it (the player and the creator's
          // model are swapped out whole when the look changes)
          if (now - e.born > (e.always ? 1500 : 15000)) { if (e.on) show(e, false); return false; }
          seen = false;
        }
        if (!e.root.visible) seen = false;
        e.d = seen ? (e.always ? -1 : e.root.getWorldPosition(_p).distanceTo(camera.position)) : 1e9;
        if (e.d < HD.near) cand.push(e);
        return true;
      });
      cand.sort((a, b) => a.d - b.d);
      const want = new Set(cand.slice(0, HD.max));
      HD.list.forEach((e) => { if (want.has(e) !== e.on) show(e, want.has(e)); });
    }
    for (let i = 0; i < HD.list.length; i++) if (HD.list[i].on) HD.pose(HD.list[i]);
  };
  HD.always = function (root) {
    const e = root && root.userData.hd;
    if (e) { e.always = true; HD.load(e.variant); }
  };
  // for scenes outside the main loop (the character creator)
  HD.poseNow = function (root) {
    const e = root && root.userData.hd;
    if (!e) return;
    if (!e.on) show(e, true);
    if (e.on) HD.pose(e);
  };
})();
