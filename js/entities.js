// Living world: NPCs with dialogue, wandering wildlife, boats on the
// backwaters, bird flocks, collectibles (coins & plastic waste) and the
// player's canoe.
(function () {
  'use strict';
  const T = THREE;
  const Geo = KT.Geo, Models = KT.Models;
  const SX = Geo.shoreX, PX = Geo.promenadeX, HP = Math.PI / 2;
  const E = KT.Entities = {
    npcs: [], animals: [], boats: [], flocks: [], plastics: [], coins: [], interactables: [], photoTargets: []
  };
  let World;

  // ---------------------------------------------------------- dialogue
  const FACTS = {
    guide: [
      'Namaskaram! Welcome to Kerala — God’s Own Country. I’m Anjali from Kerala Tourism.',
      'You are on the Alleppey promenade beside Vembanad, the longest lake in India. Its backwaters weave through over 900 km of canals, rivers and lagoons.',
      'Sadly, plastic waste is choking our waterways. Could you help us clean the backwaters? Look for bottles and bags floating along the promenade.',
      'Follow the green marker on your compass and minimap. Every new place you discover earns you a star!'
    ],
    guideLater: [
      'Kerala is said to take its name from "kera" — the coconut palm. You will see why!',
      'Monsoon arrives here first in India, around the first of June. Everything turns emerald green.',
      'Try karimeen pollichathu — pearl-spot fish grilled in banana leaf — a backwater speciality.'
    ],
    boatman: [
      'A kettuvallam — our houseboat — is built without a single nail! Planks of anjili wood are stitched together with coir rope.',
      'Want to explore? My canoe is tied at the end of the jetty. Walk up to it and press E to climb in.',
      'Paddle east to Pathiramanal island — the name means "sand of midnight". Birds love it there.'
    ],
    fisher: [
      'These are cheena vala — Chinese fishing nets. Traders from the court of Kublai Khan are said to have brought them in the 14th century.',
      'Each net is a giant lever of teak poles. Four to six of us work the ropes and the heavy stones balance it.',
      'Fort Kochi is the most famous place to see them, rising and dipping all day long.'
    ],
    kathakaliFan: [
      'Kathakali is a 17th-century dance-drama of Kerala. The green face — pacha — shows a noble hero.',
      'The make-up can take four hours! The white frame around the jaw is the chutti, made of rice paste and paper.',
      'Watch the eyes and the hand gestures — the mudras. Without a single word, they tell the whole story.'
    ],
    devotee: [
      'At Thrissur Pooram, thirty caparisoned elephants stand in rows wearing golden nettipattams.',
      'The kudamattam — the swift changing of bright silk umbrellas atop the elephants — is a sight you will never forget!',
      'Greet the elephants respectfully with a Namaskaram — press N with your palms together.'
    ],
    church: [
      'Christianity in Kerala traces back to St. Thomas the Apostle, believed to have arrived at Muziris in 52 AD.',
      'Kerala is a land where temples, churches and mosques stand side by side in harmony.'
    ],
    manager: [
      'Welcome to Munnar, 1,600 metres up in the Western Ghats. Tea has grown on these slopes since the 1880s.',
      'Every twelve years the hills turn blue when the Neelakurinji flowers bloom!',
      'The best view is from the watch tower at the very top of the trail. Climb it!'
    ],
    picker: [
      'We pick only two leaves and a bud — that makes the finest tea.',
      'A good picker gathers more than 30 kilograms of leaves in a day.'
    ],
    ranger: [
      'Welcome to Periyar Tiger Reserve in Thekkady — home to elephants, gaur, sambar deer and the elusive tiger.',
      'Wildlife photographers wanted! Press C for camera mode and capture a peacock, a deer and an elephant.',
      'Please keep a safe distance and never feed the animals.'
    ],
    keeper: [
      'This is the Vizhinjam lighthouse, 36 metres tall and guiding ships since 1972.',
      'Kovalam has three crescent beaches — Lighthouse, Hawah and Samudra. Ayurveda massages and fresh seafood await!',
      'Some careless visitors left plastic on the sand. Please help keep our beach clean.'
    ],
    villager: [
      'During Onam we prepare the Sadya — a feast of more than 20 dishes served on a banana leaf!',
      'Kerala has the highest literacy rate in India. Our libraries are in every village.',
      'For breakfast, try puttu with kadala curry, or soft appam with stew.',
      'The Nehru Trophy snake boat race happens every August on Punnamada lake. Over 100 rowers in one boat!',
      'Coconut gives us everything: food, oil, coir rope, roofs and even toddy.',
      'Theyyam, Mohiniyattam, Kalaripayattu... Kerala’s arts are as rich as its landscapes.'
    ],
    tourist: [
      'Isn’t this place magical? I came for a weekend and stayed two weeks!',
      'I just had a banana-leaf meal. Best lunch of my life.',
      'The houseboat cruise at sunset is a must!'
    ]
  };
  E.FACTS = FACTS;

  // --------------------------------------------------------- utilities
  function spawn(obj, x, z, rot) {
    const y = World.groundY(x, z).y;
    obj.position.set(x, y, z);
    obj.rotation.y = rot || 0;
    World.scene.add(obj);
    return obj;
  }

  function validGround(x, z) {
    if (x < Geo.BOUNDS.minX || x > Geo.BOUNDS.maxX || z < Geo.BOUNDS.minZ || z > Geo.BOUNDS.maxZ) return false;
    return World.groundY(x, z).y > 0.35 && !World.isBlocked(x, z, 0.6);
  }

  // A wandering agent (people and animals share this).
  function makeWanderer(obj, opts) {
    return Object.assign({
      obj, home: { x: obj.position.x, z: obj.position.z }, radius: 10, speed: 1.1, target: null,
      wait: Math.random() * 4, moving: false, heading: obj.rotation.y, stuck: 0, r: 0.4
    }, opts);
  }

  function pickTarget(w) {
    for (let i = 0; i < 8; i++) {
      let x, z;
      if (w.route === 'promenade') {
        z = KT.clamp(w.obj.position.z + (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 18), -160, 160);
        x = PX(z) + (Math.random() - 0.5) * 2.4;
      } else {
        const a = Math.random() * Math.PI * 2, r = Math.random() * w.radius;
        x = w.home.x + Math.cos(a) * r; z = w.home.z + Math.sin(a) * r;
      }
      if (validGround(x, z)) return { x, z };
    }
    return null;
  }

  const _p = new T.Vector3();
  function updateWanderer(w, dt, player) {
    const o = w.obj;
    if (w.talking) {
      w.moving = false;
      const a = World.faceTo(o.position.x, o.position.z, player.pos.x, player.pos.z);
      o.rotation.y = KT.angleLerp(o.rotation.y, a, 1 - Math.exp(-dt * 6));
      return;
    }
    if (w.static) { w.moving = false; return; }
    if (w.wait > 0) { w.wait -= dt; w.moving = false; return; }
    if (!w.target) {
      w.target = pickTarget(w);
      if (!w.target) { w.wait = 2; return; }
    }
    const dx = w.target.x - o.position.x, dz = w.target.z - o.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) { w.target = null; w.wait = 2 + Math.random() * 6; w.moving = false; return; }
    const step = Math.min(d, w.speed * dt);
    _p.set(o.position.x + (dx / d) * step, o.position.y, o.position.z + (dz / d) * step);
    World.resolve(_p, w.r);
    // don't walk into the player
    const pdx = _p.x - player.pos.x, pdz = _p.z - player.pos.z;
    const pd = Math.hypot(pdx, pdz);
    if (pd < 0.9 && pd > 0.001) { _p.x = player.pos.x + (pdx / pd) * 0.9; _p.z = player.pos.z + (pdz / pd) * 0.9; }
    const moved = Math.hypot(_p.x - o.position.x, _p.z - o.position.z);
    if (moved < step * 0.3) { w.stuck += dt; if (w.stuck > 1.2) { w.target = null; w.stuck = 0; w.wait = 1; } }
    else w.stuck = 0;
    const g = World.groundY(_p.x, _p.z, o.position.y);
    if (g.y < 0.3) { w.target = null; w.moving = false; return; }
    o.position.set(_p.x, g.y, _p.z);
    w.moving = true;
    const a = Math.atan2(dx, dz);
    o.rotation.y = KT.angleLerp(o.rotation.y, a, 1 - Math.exp(-dt * 5));
  }

  // ---------------------------------------------------------------- NPCs
  const SKINS = [0xd9a27c, 0xc08660, 0xa8704c, 0x8d5a3b, 0xe2b08c];
  const MALE_LOCAL = [
    { outfit: 'mundu', colors: { top: 0xf8f6ef } }, { outfit: 'mundu', colors: { top: 0x7fb3e0 } },
    { outfit: 'mundu', colors: { top: 0xe7c46a, bottom: 0x2f6f4f, border: 0x2f6f4f } }, { outfit: 'formal' },
    { outfit: 'casual', colors: { top: 0x8a3b3b } }, { outfit: 'hiking' },
    { outfit: 'tee' }, { outfit: 'tee', colors: { top: 0xd2492a, bottom: 0x3a5a8a } }, { outfit: 'sweater' },
    { outfit: 'coat' }, { outfit: 'sweater', colors: { top: 0x6a3fa0, bottom: 0x2a2f3a } }
  ];
  const FEMALE_LOCAL = [
    { outfit: 'saree' }, { outfit: 'saree', colors: { bottom: 0xe5b7c8, border: 0xb3261e, top: 0xb3261e } },
    { outfit: 'saree', colors: { bottom: 0x9fd3c7, border: 0xd4a434, top: 0x2a7f6f } }, { outfit: 'churidar' },
    { outfit: 'churidar', colors: { top: 0xd65a8a, dupatta: 0xf7e3b5 } }, { outfit: 'casual', colors: { top: 0x6a5acd } },
    { outfit: 'hiking' }, { outfit: 'overalls' }, { outfit: 'overalls', colors: { bottom: 0xe0a030, top: 0x2a2a2a } }
  ];

  function makeNPC(def, rng) {
    const female = def.gender ? def.gender === 'female' : rng() < 0.5;
    const pick = def.look || rng.pick(female ? FEMALE_LOCAL : MALE_LOCAL);
    const cfg = {
      gender: female ? 'female' : 'male', outfit: pick.outfit, colors: pick.colors,
      hair: female ? rng.pick(['default', 'braid', 'bun', 'loose', 'curly']) : rng.pick(['default', 'short', 'wavy', 'curly']),
      skin: rng.pick(SKINS), hairColor: rng() < 0.15 ? 0x9a9a96 : rng.pick([0x1d130e, 0x2a1a12, 0x3a2414]),
      beard: !female && rng() < 0.18, glasses: rng() < 0.18,
      acc: def.acc || { backpack: def.tourist, hat: def.tourist && rng() < 0.4, sunglasses: def.tourist && rng() < 0.5, camera: def.tourist && rng() < 0.4 },
      scale: 0.9 + rng() * 0.1,
      lite: true
    };
    const obj = Models.character(cfg);
    spawn(obj, def.x, def.z, def.rot || 0);
    // distant stand-in with far fewer triangles
    const far = Models.character(Object.assign({}, cfg, { lite: 'far' }));
    far.visible = false;
    World.scene.add(far);
    const w = makeWanderer(obj, {
      name: def.name, lines: def.lines, radius: def.radius || 8, static: !!def.static, far: far,
      route: def.route, speed: def.speed || 1.0 + rng() * 0.3, pose: def.pose, id: def.id, kind: 'npc'
    });
    E.npcs.push(w);
    if (def.lines) {
      E.interactables.push({
        id: def.id, label: 'Talk to ' + def.name.split(' (')[0], radius: 2.6,
        pos: () => obj.position,
        action: () => KT.Game.talkTo(w)
      });
    }
    return w;
  }

  function buildNPCs() {
    const rng = KT.makeRng(2024);
    const kiosk = World.sites.kiosk[0];
    makeNPC({ id: 'guide', name: 'Anjali (Tourism Guide)', gender: 'female', look: { outfit: 'saree' }, acc: {}, x: kiosk.x + 2.6, z: kiosk.z + 0.5, rot: HP, static: true, lines: FACTS.guide, pose: 'idle' }, rng);
    makeNPC({ id: 'boatman', name: 'Kuttan (Boatman)', gender: 'male', look: { outfit: 'mundu', colors: { top: 0xe7c46a } }, acc: { hat: false }, x: World.jettyStart.x + 1.5, z: 2.2, rot: Math.PI, static: true, lines: FACTS.boatman }, rng);
    makeNPC({ id: 'fisher', name: 'Joseph (Fisherman)', gender: 'male', look: { outfit: 'mundu', colors: { top: 0x3b6ea8 } }, acc: {}, x: PX(152) - 0.5, z: 152, rot: HP, static: true, lines: FACTS.fisher }, rng);
    makeNPC({ id: 'kfan', name: 'Ravi (Kathakali fan)', gender: 'male', look: { outfit: 'formal' }, acc: {}, x: -34, z: 50, rot: HP, static: true, lines: FACTS.kathakaliFan }, rng);
    makeNPC({ id: 'devotee', name: 'Lakshmi (Devotee)', gender: 'female', look: { outfit: 'saree' }, acc: {}, x: -122, z: -84, rot: Math.PI, static: true, lines: FACTS.devotee }, rng);
    makeNPC({ id: 'church', name: 'Thomas (Caretaker)', gender: 'male', look: { outfit: 'formal', colors: { top: 0xf2f2f2 } }, acc: {}, x: -9, z: -88, rot: 0, static: true, lines: FACTS.church }, rng);
    makeNPC({ id: 'manager', name: 'Meera (Tea Estate)', gender: 'female', look: { outfit: 'hiking', colors: { top: 0x2f7a4a } }, acc: { hat: true }, x: 40, z: -240, rot: 0, static: true, lines: FACTS.manager }, rng);
    makeNPC({ id: 'ranger', name: 'Suresh (Forest Ranger)', gender: 'male', look: { outfit: 'hiking', colors: { top: 0x55603a, bottom: 0x55603a } }, acc: { hat: true }, x: -163, z: 44, rot: -HP, static: true, lines: FACTS.ranger }, rng);
    makeNPC({ id: 'keeper', name: 'Abdul (Lighthouse Keeper)', gender: 'male', look: { outfit: 'mundu', colors: { top: 0x2f4f8f } }, acc: {}, x: 112, z: 236, rot: 0, static: true, lines: FACTS.keeper }, rng);
    // promenade walkers
    for (let i = 0; i < 7; i++) {
      const z = -140 + i * 42;
      makeNPC({ id: 'walker' + i, name: rng.pick(['Arun', 'Divya', 'Priya', 'Manoj', 'Sneha', 'Rahul', 'Fathima']) + ' (Local)', x: PX(z), z, route: 'promenade', lines: [rng.pick(FACTS.villager), rng.pick(FACTS.villager)] }, rng);
    }
    for (let i = 0; i < 3; i++) {
      const z = -60 + i * 50;
      makeNPC({ id: 'tourist' + i, name: rng.pick(['Emma', 'Lucas', 'Aiko', 'Carlos']) + ' (Traveller)', tourist: true, x: PX(z) + 0.5, z, route: 'promenade', lines: [rng.pick(FACTS.tourist)] }, rng);
    }
    // village folk
    const village = [[-45, 30], [-60, 55], [-30, 20], [-80, 40], [-50, 10], [-20, 90]];
    village.forEach((p, i) => makeNPC({ id: 'villager' + i, name: rng.pick(['Ammini', 'Gopalan', 'Saraswathi', 'Varghese', 'Kunjamma', 'Hassan']) + ' (Villager)', x: p[0], z: p[1], radius: 14, lines: [FACTS.villager[i % FACTS.villager.length], FACTS.villager[(i + 2) % FACTS.villager.length]] }, rng));
    // temple crowd
    for (let i = 0; i < 4; i++) makeNPC({ id: 'pilgrim' + i, name: 'Pilgrim', x: -136 + i * 4, z: -80, radius: 6, lines: [FACTS.devotee[i % 2]] }, rng);
    // beach
    for (let i = 0; i < 5; i++) makeNPC({ id: 'beach' + i, name: rng.pick(['Sam', 'Anna', 'Vivek', 'Neha', 'Oliver']) + ' (Beachgoer)', tourist: true, x: -100 + i * 40, z: 224, radius: 16, lines: [rng.pick(FACTS.tourist), FACTS.keeper[2]] }, rng);
    // tea pickers
    for (let i = 0; i < 4; i++) makeNPC({ id: 'picker' + i, name: 'Tea picker', gender: 'female', look: { outfit: 'saree', colors: { bottom: 0x8a5ab0, border: 0xd4a434, top: 0x6a3a90 } }, acc: { hat: true }, x: -10 + i * 22, z: -228 - i * 6, radius: 8, lines: FACTS.picker }, rng);
    // Kathakali performer on stage
    const stage = World.sites.kathakaliStage[0];
    const dancer = Models.kathakaliDancer();
    dancer.position.set(stage.x, Geo.height(stage.x, stage.z) + 1.08 - 0.05, stage.z);
    dancer.rotation.y = -HP;
    World.scene.add(dancer);
    E.dancer = dancer;
    E.stage = stage;
  }

  // ------------------------------------------------------------- animals
  function addAnimal(obj, x, z, rot, opts) {
    KT.skinify(obj);
    spawn(obj, x, z, rot);
    const w = makeWanderer(obj, Object.assign({ kind: obj.userData.kind || 'animal', speed: 0.8, r: obj.userData.radius || 0.6 }, opts || {}));
    E.animals.push(w);
    if (obj.userData.kind) E.photoTargets.push(w);
    return w;
  }

  function buildAnimals() {
    // Pooram elephants in front of the temple gate
    [-146, -139, -121, -114].forEach((x, i) => {
      const w = addAnimal(Models.elephant(true, i + 1), x, -92, 0, { static: true });
      World.addCollider({ type: 'circle', x, z: -92, r: 2.0 });
      w.kind = 'elephant';
    });
    // wild elephants in Periyar
    addAnimal(Models.elephant(false, 9), -270, -10, 1, { radius: 30, speed: 0.9, kind: 'elephant' });
    addAnimal(Models.elephant(false, 10), -290, 20, 2, { radius: 25, speed: 0.8, kind: 'elephant' });
    addAnimal(Models.elephant(false, 11), -255, 0, 2, { radius: 20, speed: 0.7, kind: 'elephant' }).obj.scale.setScalar(0.6);
    // deer herd
    for (let i = 0; i < 7; i++) addAnimal(Models.deer(), -225 + (i % 3) * 4, 85 + Math.floor(i / 3) * 4, i, { radius: 18, speed: 1.4, kind: 'deer' });
    // peacocks
    [[-212, 25], [-236, 66], [-190, 78], [-60, 100]].forEach((p, i) => addAnimal(Models.peacock(), p[0], p[1], i, { radius: 8, speed: 0.5, kind: 'peacock' }));
    // monkeys on the temple wall & forest
    [[-150.6, -125], [-109.4, -100], [-260, 60], [-262, 62], [-210, 40]].forEach((p, i) => {
      const m = addAnimal(Models.monkey(), p[0], p[1], i * 2, { static: true, kind: 'monkey' });
      if (i < 2) m.obj.position.y = Geo.height(p[0], p[1]) + 2.6;
    });
    // cows & buffalo in the village / paddy edge
    [[-95, 50], [-60, 140], [-120, 120], [-30, 150], [-130, 0]].forEach((p, i) => addAnimal(Models.cow(), p[0], p[1], i, { radius: 12, speed: 0.6, kind: 'cow' }));
    [[-58, 110], [-56, 95], [-118, 90]].forEach((p, i) => addAnimal(Models.buffalo(), p[0], p[1], i, { radius: 8, speed: 0.5, kind: 'buffalo' }));
    // water birds
    const egretSpots = [[-90, 80], [-75, 120], [-100, 105], [-70, 70], [160, -30], [185, 10], [168, 5], [PX(140) - 6, 140]];
    egretSpots.forEach((p, i) => addAnimal(Models.egret(), p[0], p[1], i, { radius: 4, speed: 0.4, kind: 'egret' }));
    World.mooringPosts.forEach((p, i) => {
      const b = i % 2 ? Models.kingfisher() : Models.cormorant();
      KT.skinify(b);
      b.position.copy(p);
      b.rotation.y = i;
      World.scene.add(b);
      E.animals.push({ obj: b, static: true, kind: b.userData.kind, moving: false, wait: 0 });
    });
    for (let i = 0; i < 3; i++) {
      const k = Models.kingfisher();
      KT.skinify(k);
      const z = -100 + i * 90;
      k.position.set(PX(z) + 2.55, World.promenadeY(z) + 1.0, z);
      k.rotation.y = HP;
      World.scene.add(k);
      E.animals.push({ obj: k, static: true, kind: 'kingfisher', moving: false, wait: 0 });
    }
  }

  function buildFlocks() {
    const centers = [[150, -40, 34, 70], [60, 120, 28, 50], [-200, 0, 45, 80], [-40, -260, 70, 60]];
    centers.forEach((c, i) => {
      const flock = { cx: c[0], cz: c[1], h: c[2], r: c[3], speed: 0.12 + i * 0.02, birds: [], phase: i * 1.7 };
      for (let k = 0; k < 6; k++) {
        const b = Models.flyingBird(i % 2 === 0);
        b.scale.setScalar(2.2);
        World.scene.add(b);
        flock.birds.push({ obj: b, off: new T.Vector3((k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2.5, Math.sin(k) * 0.8, -Math.ceil(k / 2) * 2.2), t: k * 0.37 });
      }
      E.flocks.push(flock);
    });
  }

  // --------------------------------------------------------------- boats
  function loopCurve(pts) {
    return new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(p[0], 0, p[1])), true, 'centripetal');
  }
  function addBoat(model, pts, speed, offset, opts) {
    const curve = loopCurve(pts);
    World.scene.add(model);
    const b = Object.assign({ obj: model, curve, len: curve.getLength(), u: offset || 0, speed, radius: model.userData.radius || 4 }, opts || {});
    E.boats.push(b);
    return b;
  }

  function buildBoats() {
    const loopA = [[105, -60], [175, -82], [245, -45], [255, 30], [200, 58], [130, 48], [92, 0]];
    const loopB = [[70, 100], [150, 135], [290, 145], [305, 60], [220, 62], [130, 80]];
    const loopC = [[60, -140], [150, -152], [295, -132], [305, -70], [240, -95], [120, -112]];
    addBoat(Models.houseboat(), loopA, 2.6, 0.0);
    addBoat(Models.houseboat(), loopA, 2.6, 0.5);
    addBoat(Models.houseboat(), loopB, 2.4, 0.3);
    addBoat(Models.houseboat(), loopC, 2.8, 0.6);
    addBoat(Models.snakeBoat(), loopB, 9, 0.75, { snake: true });
    addBoat(Models.ferryBoat(), [[55, -24], [100, -36], [140, -22], [100, -14]], 3.2, 0.1);
    addBoat(Models.motorBoat(), loopC, 6, 0.1);
    addBoat(Models.motorBoat(), loopA, 5.5, 0.25);
    // moored houseboats beside the jetty
    const jx = World.jettyStart.x;
    [[jx + 12, 8.5, 0.05], [jx + 12, -8.5, Math.PI - 0.05]].forEach((m) => {
      const hb = Models.houseboat();
      hb.position.set(m[0], 0, m[1]);
      hb.rotation.y = HP + m[2];
      World.scene.add(hb);
      E.boats.push({ obj: hb, moored: true, radius: 10, baseRot: hb.rotation.y });
    });
    // stilt houses on the water
    [[SX(-118) + 14, -118], [SX(136) + 15, 136]].forEach((p) => {
      const sh = Models.stiltHouse();
      sh.position.set(p[0], 0, p[1]);
      sh.rotation.y = -HP;
      World.scene.add(sh);
      World.addCollider({ type: 'box', x: p[0], z: p[1], hw: 4.5, hd: 6.5, rot: -HP });
    });
    // fishing canoes on the beach
    [[-40, 230, 0.3], [-10, 232, -0.2], [70, 231, 0.5]].forEach((p) => {
      const c = Models.canoe();
      c.position.set(p[0], Geo.height(p[0], p[1]) + 0.25, p[1]);
      c.rotation.y = p[2];
      World.scene.add(c);
      World.addCollider({ type: 'box', x: p[0], z: p[1], hw: 0.5, hd: 2.8, rot: p[2] });
    });
    // Chinese fishing nets
    E.nets = [];
    [148, 157, 166].forEach((z, i) => {
      const n = Models.chineseNet();
      n.position.set(SX(z) + 0.6, 0, z);
      n.rotation.y = HP;
      World.scene.add(n);
      World.addCollider({ type: 'box', x: SX(z) + 0.6, z, hw: 2.5, hd: 2, rot: 0 });
      E.nets.push({ obj: n, phase: i * 2.1 });
    });
  }

  // ---------------------------------------------------------- the canoe
  function buildCanoe() {
    const c = Models.canoe();
    const start = new T.Vector3(World.jettyEnd.x - 3.5, 0.05, 2.9);
    c.position.copy(start);
    c.rotation.y = HP;
    World.scene.add(c);
    const paddle = Models.paddle();
    c.add(paddle);
    paddle.position.set(0.5, 0.9, -0.4);
    paddle.visible = false;
    E.canoe = { obj: c, paddle, heading: HP, speed: 0, start: start.clone(), startHeading: HP, inUse: false };
    E.interactables.push({
      id: 'canoe', label: 'Paddle the canoe', radius: 3.4,
      pos: () => c.position,
      enabled: () => !E.canoe.inUse,
      action: () => KT.Player.boardCanoe()
    });
  }

  // ------------------------------------------------------ collectibles
  function buildCoins() {
    const proto = Models.coin();
    const pts = [];
    const seen = [];
    const tryAdd = (x, z) => {
      const g = World.groundY(x, z);
      if (g.y < 0.4) return;
      if (World.isBlocked(x, z, 0.5)) return;
      for (let i = 0; i < seen.length; i++) if (Math.hypot(seen[i][0] - x, seen[i][1] - z) < 6) return;
      seen.push([x, z]);
      pts.push(new T.Vector3(x, g.y + 0.9, z));
    };
    Geo.PATHS.forEach((p) => {
      for (let i = 0; i < p.pts.length - 1; i++) {
        const a = p.pts[i], b = p.pts[i + 1];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 6; s < len; s += 16) {
          const t = s / len;
          tryAdd(KT.lerp(a[0], b[0], t), KT.lerp(a[1], b[1], t));
        }
      }
    });
    for (let z = -160; z <= 160; z += 13) tryAdd(PX(z), z);
    World.LANDMARKS.forEach((l) => {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        tryAdd(l.x + Math.cos(a) * 5, l.z + Math.sin(a) * 5);
      }
    });
    const meshes = [];
    proto.children.forEach((child) => {
      const im = new T.InstancedMesh(child.geometry, child.material, pts.length);
      im.frustumCulled = false;
      World.scene.add(im);
      meshes.push({ im, local: child.matrix.clone() });
      child.updateMatrix();
      meshes[meshes.length - 1].local = child.matrix.clone();
    });
    E.coins = pts.map((p, i) => ({ id: i, pos: p, taken: false }));
    E.coinMeshes = meshes;
    E.updateCoinMatrices(0);
  }
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _s = new T.Vector3(), _y = new T.Vector3(0, 1, 0), _pv = new T.Vector3();
  E.updateCoinMatrices = function (t) {
    _q.setFromAxisAngle(_y, t * 2.2);
    E.coinMeshes.forEach((m) => {
      E.coins.forEach((c, i) => {
        _s.setScalar(c.taken ? 0.0001 : 1);
        _pv.copy(c.pos);
        _pv.y += Math.sin(t * 2 + i) * 0.12;
        _m.compose(_pv, _q, _s).multiply(m.local);
        m.im.setMatrixAt(i, _m);
      });
      m.im.instanceMatrix.needsUpdate = true;
    });
  };

  function buildPlastics() {
    const rng = KT.makeRng(31);
    const add = (group, x, y, z, floating) => {
      const obj = rng() < 0.5 ? Models.plasticBottle() : Models.plasticBag();
      obj.position.set(x, y, z);
      obj.rotation.set(rng() * 0.6, rng() * 6, HP * (rng() < 0.5 ? 1 : 0.2));
      World.scene.add(obj);
      E.plastics.push({ id: group + E.plastics.length, group, obj, base: y, floating, taken: false });
    };
    [118, 84, 33, -24, -58, -96, -134].forEach((z) => add('backwater', SX(z) + 1.0, 0.08, z, true));
    [[-140, 226], [-95, 229], [-48, 225], [-5, 228], [35, 230], [80, 226], [140, 228]].forEach((p) => add('beach', p[0], Geo.height(p[0], p[1]) + 0.15, p[1], false));
  }

  // ------------------------------------------------------------- build
  E.build = function (scene, world) {
    World = world;
    buildBoats();
    buildCanoe();
    buildNPCs();
    buildAnimals();
    buildFlocks();
    buildCoins();
    buildPlastics();
    E.beacon = Models.beacon();
    scene.add(E.beacon);
  };

  // People and animals near the player act as solid obstacles.
  E.agentColliders = function (pos) {
    const out = [];
    const add = (w, r) => {
      const o = w.obj;
      if (Math.abs(o.position.x - pos.x) > 8 || Math.abs(o.position.z - pos.z) > 8) return;
      if (Math.abs(o.position.y - pos.y) > 2.5) return;
      out.push({ type: 'circle', x: o.position.x, z: o.position.z, r: r });
    };
    E.npcs.forEach((w) => add(w, 0.3));
    E.animals.forEach((w) => { if (w.home || w.static) add(w, Math.min(1.6, (w.obj.userData.radius || 0.5) * 0.8 * w.obj.scale.x)); });
    if (E.dancer) add({ obj: E.dancer }, 0.4);
    return out;
  };

  // dynamic colliders of boats (for the canoe)
  E.boatColliders = function () {
    const out = [];
    E.boats.forEach((b) => {
      const o = b.obj;
      const r = b.radius;
      const n = r > 6 ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const off = n === 1 ? 0 : (i - 1) * r * 0.6;
        out.push({ type: 'circle', x: o.position.x + Math.sin(o.rotation.y) * off, z: o.position.z + Math.cos(o.rotation.y) * off, r: n === 1 ? r * 0.5 : 2.3 });
      }
    });
    return out;
  };

  const _tan = new T.Vector3();
  E.update = function (dt, t, player, camera) {
    const pp = player.pos;
    // boats
    E.boats.forEach((b) => {
      const o = b.obj;
      if (b.moored) {
        o.position.y = Math.sin(t * 0.9 + o.position.x) * 0.05;
        o.rotation.z = Math.sin(t * 0.7) * 0.012;
        return;
      }
      b.u = (b.u + (b.speed * dt) / b.len) % 1;
      b.curve.getPointAt(b.u, o.position);
      b.curve.getTangentAt(b.u, _tan);
      o.rotation.y = Math.atan2(_tan.x, _tan.z);
      o.position.y = Math.sin(t * 1.1 + b.u * 40) * 0.05;
      o.rotation.z = Math.sin(t * 0.8 + b.u * 20) * 0.015;
      if (b.snake && o.userData.oars) {
        const near = o.position.distanceTo(pp) < 220;
        if (near) o.userData.oars.forEach((oar) => {
          const ph = t * 7 + oar.i * 0.15;
          oar.g.rotation.x = Math.sin(ph) * 0.6;
          oar.g.rotation.z = oar.s * (0.15 + Math.cos(ph) * 0.15);
        });
      }
    });
    // nets
    E.nets.forEach((n) => {
      const c = (Math.sin(t * 0.35 + n.phase) + 1) / 2;
      n.obj.userData.arm.rotation.x = -0.35 + c * 0.6;
    });
    // lighthouse beam
    const lh = World.sites.lighthouse && World.sites.lighthouse[0].object;
    if (lh) lh.userData.beam.rotation.y += dt * 0.9;
    // agents
    const animDist = 140;
    E.npcs.forEach((w) => {
      const d = Math.hypot(w.obj.position.x - pp.x, w.obj.position.z - pp.z);
      updateWanderer(w, dt, player);
      const near = d < 32;
      w.obj.visible = near;
      w.far.visible = !near && d < 140;
      if (w.far.visible) { w.far.position.copy(w.obj.position); w.far.rotation.y = w.obj.rotation.y; }
      if (d < animDist) {
        let state = w.moving ? 'walk' : (w.talking ? 'wave' : 'idle');
        if (w.talking && w.talkTime > 2.5) state = 'idle';
        if (w.id === 'guide' && !w.talking && Math.sin(t * 0.4) > 0.85) state = 'namaskaram';
        if (w.talking) w.talkTime = (w.talkTime || 0) + dt; else w.talkTime = 0;
        Models.animateCharacter(near ? w.obj : w.far, state, dt, w.speed / 1.1);
      }
    });
    E.animals.forEach((w) => {
      const d = Math.hypot(w.obj.position.x - pp.x, w.obj.position.z - pp.z);
      w.obj.visible = d < (w.kind === 'elephant' ? 260 : 170);
      if (w.home) updateWanderer(w, dt, player);
      if (d < animDist && w.obj.userData.animate) w.obj.userData.animate(t + w.obj.id, w.moving, 6);
    });
    if (E.dancer) {
      const d = Math.hypot(E.dancer.position.x - pp.x, E.dancer.position.z - pp.z);
      if (d < animDist) Models.animateCharacter(E.dancer, 'dance', dt);
    }
    // flocks
    E.flocks.forEach((f) => {
      const a = t * f.speed + f.phase;
      const cx = f.cx + Math.cos(a) * f.r, cz = f.cz + Math.sin(a) * f.r;
      const heading = Math.atan2(-Math.sin(a), Math.cos(a));
      f.birds.forEach((b) => {
        const ox = b.off.x * Math.cos(heading) + b.off.z * Math.sin(heading);
        const oz = -b.off.x * Math.sin(heading) + b.off.z * Math.cos(heading);
        b.obj.position.set(cx + ox, f.h + b.off.y + Math.sin(t + b.t) * 0.6, cz + oz);
        b.obj.rotation.y = heading;
        b.obj.userData.animate(t + b.t);
      });
    });
    // collectibles
    E.updateCoinMatrices(t);
    E.plastics.forEach((p) => {
      if (p.taken) return;
      if (p.floating) {
        p.obj.position.y = p.base + Math.sin(t * 1.4 + p.obj.position.z) * 0.06;
        p.obj.rotation.y += dt * 0.2;
      }
    });
  };
})();
