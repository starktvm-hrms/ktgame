// Working people. Every district town has its shopkeepers behind their
// counters, a tea maker pulling tea for the regulars on the bench, fruit
// vendors at the market stalls, auto drivers waiting their turn at the
// stand, a traffic policeman at the zebra crossing, a sweeper on the
// footpath in the morning, the KSRTC station master with people waiting
// for the bus, and shoppers going from shop to shop. Every attraction has a
// ticket clerk in a booth, a guard by day and a watchman by night, and a
// guide showing it around. The autos and buses on the roads have drivers.
//
// Each person keeps their own hours by the local clock: they walk in from
// home (up a side street) before work, take a tea break at the tea shop,
// and walk home again when their day is done. Talk to anyone to hear about
// their work and what they are doing right now.
(function () {
  'use strict';
  const T = THREE;
  const L = KT.Life = { workers: [], loose: [] };

  const PAVE = 10.4;                                  // pavement line (townfolk.js)
  const STREETS = [[-40, -1], [100, -1], [-120, 1]];  // side streets (along, side)
  const SHOW = 140, ANIM = 70;                        // distances: shown, animated

  const MALE = ['Babu', 'Rajan', 'Shaji', 'Sunil', 'Anil', 'Biju', 'Jose', 'Hari', 'Rasheed', 'Unni', 'Mohanan', 'Saji', 'Vinod', 'Ashraf', 'Thomas', 'Prakash', 'Gopi', 'Ramesh', 'Sasi', 'Manoj', 'Kunjumon', 'Shibu', 'Navas', 'Dileep'];
  const FEMALE = ['Leela', 'Sindhu', 'Bindu', 'Shobha', 'Mini', 'Asha', 'Rema', 'Lissy', 'Jaya', 'Sabitha', 'Ambili', 'Suja', 'Geetha', 'Shiny', 'Nisha', 'Sreeja', 'Rasiya', 'Molly'];
  const SKINS = [0xe2ae8a, 0xd9a27c, 0xc08660, 0xa8704c, 0x8d5a3b];
  const KHAKI = 0xb59a63, KHAKI_DARK = 0x8f7a4c;
  const SHOP = {
    tea: { title: 'tea shop', hours: [5.5, 21.5], line: 'Chaya, kaapi, pazham pori and parippu vada. Watch the pour: the higher I pull the tea, the more froth on top!' },
    fruit: { title: 'fruit shop', hours: [7, 20.5], line: 'Nendran bananas from Thrissur, pineapple from Vazhakulam, and mangoes when it is the season.' },
    bakery: { title: 'bakery', hours: [7, 22], line: 'The puffs come out hot at four o\'clock, and at Christmas everyone wants our plum cake.' },
    stores: { title: 'provision store', hours: [7, 21], line: 'Rice, coconut oil, spices, soap: every house on this street buys from me.' },
    textiles: { title: 'textile shop', hours: [9.5, 20.5], line: 'Kasavu mundu and set-saree, cream with a gold border. Before Onam the shop is packed.' },
    medical: { title: 'medical shop', hours: [8, 22.5], line: 'We stay open late. If someone falls ill at night they knock on my shutter.' },
    hotel: { title: 'hotel', hours: [6, 22], line: 'Meals at noon on a banana leaf: rice, sambar, avial, thoran, pappadam and payasam.' },
    mobile: { title: 'mobile shop', hours: [10, 21], line: 'Recharge, a new SIM, a cracked screen: bring it here and it is done in an hour.' }
  };

  // ------------------------------------------------------------ helpers
  const hubPt = (hub, along, lat, y) => {
    const q = KT.Highway.at(hub.s + along, lat);
    return { x: q.x, z: q.z, y };
  };
  // a point in an object's own space, in the world
  const local = (obj, lx, lz, y) => {
    const c = Math.cos(obj.rotation.y), s = Math.sin(obj.rotation.y);
    return { x: obj.position.x + lx * c + lz * s, z: obj.position.z - lx * s + lz * c, y };
  };
  // a shift is [from, to] (it may run past midnight), or a list of them
  const inOne = (h, sh) => (sh[0] <= sh[1] ? h >= sh[0] && h < sh[1] : h >= sh[0] || h < sh[1]);
  const inShift = (h, sh) => (Array.isArray(sh[0]) ? sh.some((x) => inOne(h, x)) : inOne(h, sh));
  const fmt = (h) => {
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    const ap = hh >= 12 && hh < 24 ? 'pm' : 'am', h12 = ((hh + 11) % 12) + 1;
    return h12 + (mm ? ':' + String(mm).padStart(2, '0') : '') + ' ' + ap;
  };
  const hours = () => (KT.Sky && KT.Sky.hours !== undefined ? KT.Sky.hours : 12);

  // the way home from the pavement at `along`: along the pavement to the
  // nearest side street on this side, then up it out of the town
  function homeRoute(hub, side, along, off) {
    const streets = STREETS.filter((st) => st[1] === side).sort((a, b) => Math.abs(a[0] - along) - Math.abs(b[0] - along));
    const SA = streets[0][0], lat = side * (PAVE + off);
    const sx = SA + (along < SA ? -3.2 : 3.2);
    return [hubPt(hub, along, lat), hubPt(hub, sx, lat), hubPt(hub, sx, side * 30), hubPt(hub, sx, side * 60), hubPt(hub, sx, side * 88)];
  }

  // ------------------------------------------------------------- props
  const propMats = {};
  const pm = (k, o) => propMats[k] || (propMats[k] = KT.mat('life_' + k, o));
  function addBroom(ch) {
    const r = ch.userData.rig;
    if (!r || !r.elR) return;
    const g = new T.Group();
    const stick = new T.Mesh(KT.G.cyl(0.012, 0.012, 1.1, 5), pm('broomStick', { color: 0x9a7a4a, roughness: 0.9 }));
    stick.position.y = -0.3;
    g.add(stick);
    const head = new T.Mesh(KT.G.cone(0.09, 0.55, 7), pm('broom', { color: 0xc9b27a, roughness: 1 }));
    head.position.y = -1.05;
    head.rotation.x = Math.PI;
    g.add(head);
    g.position.set(0, -0.27, 0.06);
    g.rotation.x = 0.5;
    r.elR.add(g);
  }
  function addGlass(ch, hand, h) {
    const r = ch.userData.rig;
    if (!r || !r['el' + hand]) return;
    const m = new T.Mesh(KT.G.cyl(0.035, 0.028, h || 0.09, 8), pm('teaGlass', { color: 0xc98a4a, roughness: 0.25, transparent: true, opacity: 0.85 }));
    m.position.set(0, -0.31, 0.05);
    r['el' + hand].add(m);
  }
  function addJug(ch) {
    const r = ch.userData.rig;
    if (!r || !r.elL) return;
    const m = new T.Mesh(KT.G.cyl(0.06, 0.05, 0.16, 10), pm('teaJug', { color: 0xc8ccd0, metalness: 0.7, roughness: 0.3 }));
    m.position.set(0, -0.33, 0.06);
    r.elL.add(m);
  }
  function addBucket(ch) {
    const r = ch.userData.rig;
    if (!r || !r.elR) return;
    const b = new T.Mesh(KT.G.cyl(0.13, 0.1, 0.24, 10), pm('bucket', { color: 0x8a9096, metalness: 0.5, roughness: 0.5 }));
    b.position.set(0, -0.42, 0.02);
    r.elR.add(b);
  }
  // a flat basket of jasmine garlands and marigolds
  function addBasket(ch) {
    const r = ch.userData.rig;
    if (!r || !r.elL) return;
    const g = new T.Group();
    g.add(new T.Mesh(KT.G.cyl(0.2, 0.15, 0.08, 12), pm('basket', { color: 0xb08a50, roughness: 0.9 })));
    for (let i = 0; i < 6; i++) {
      const f = new T.Mesh(KT.G.sph(0.05, 6, 4), pm(i % 2 ? 'jasmineW' : 'marigold', { color: i % 2 ? 0xfafaf2 : 0xf2a020, roughness: 0.8 }));
      f.position.set(Math.cos(i) * 0.11, 0.05, Math.sin(i) * 0.11);
      g.add(f);
    }
    g.position.set(0, -0.32, 0.12);
    r.elL.add(g);
  }
  // a ticket booth with an open window and a plastic chair beside it
  let boothProto = null;
  function ticketBooth() {
    if (!boothProto) {
      const g = new T.Group(), part = KT.part, G = KT.G;
      const wall = pm('boothWall', { color: 0xf1e6c8, roughness: 0.85 }), trim = pm('boothTrim', { color: 0x8a3b24, roughness: 0.7 });
      const roof = pm('boothRoof', { color: 0xb5482a, roughness: 0.7 }), chair = pm('chairBlue', { color: 0x2c5fa8, roughness: 0.5 });
      part(g, G.box(1.8, 0.12, 1.6), pm('boothFloor', { color: 0x9a948a, roughness: 0.9 }), 0, 0.06, 0);
      part(g, G.box(1.8, 2.3, 0.1), wall, 0, 1.15, -0.75);
      [-1, 1].forEach((s) => part(g, G.box(0.1, 2.3, 1.6), wall, s * 0.85, 1.15, 0));
      part(g, G.box(1.8, 1.05, 0.1), wall, 0, 0.52, 0.75);
      part(g, G.box(1.9, 0.08, 0.35), trim, 0, 1.08, 0.82);
      part(g, G.box(1.8, 0.45, 0.1), wall, 0, 2.08, 0.75);
      part(g, G.box(2.3, 0.12, 2.1), roof, 0, 2.36, 0.08);
      const sm = KT.signMaterial([{ text: 'TICKETS', size: 64 }], { width: 400, height: 80, bg: '#8a3b24', color: '#fff' });
      const sign = new T.Mesh(G.box(1.5, 0.3, 0.04), [trim, trim, trim, trim, sm, sm]);
      sign.position.set(0, 2.08, 0.82);
      sign.userData.noBake = true;
      g.add(sign);
      // the chair outside, for the watchman
      const c = new T.Group();
      part(c, G.box(0.42, 0.05, 0.42), chair, 0, 0.44, 0);
      part(c, G.box(0.42, 0.42, 0.05), chair, 0, 0.66, -0.19);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => part(c, G.box(0.04, 0.44, 0.04), chair, sx * 0.18, 0.22, sz * 0.18)));
      c.position.set(1.55, 0, 0.6);
      g.add(c);
      boothProto = g;
    }
    const o = boothProto.clone(true);
    o.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 0.95, hd: 0.85 }];
    return o;
  }

  // ---------------------------------------------------------- people
  function makePerson(w) {
    const c = w.look;
    const ch = KT.Models.character(Object.assign({ lite: true, acc: {} }, c));
    ch.userData.cfg = c;
    if (w.prop === 'broom') addBroom(ch);
    if (w.prop === 'tea') { addJug(ch); addGlass(ch, 'R', 0.1); }
    if (w.prop === 'glass') addGlass(ch, 'R');
    if (w.prop === 'bucket') addBucket(ch);
    if (w.prop === 'basket') addBasket(ch);
    return ch;
  }
  function lookFor(rng, kind, female) {
    const skin = SKINS[Math.floor(rng() * SKINS.length)];
    const base = {
      gender: female ? 'female' : 'male', skin, hairColor: rng() < 0.2 ? 0x9a9a96 : 0x24170f,
      hair: female ? ['bun', 'braid', 'default', 'loose'][Math.floor(rng() * 4)] : ['short', 'default', 'wavy'][Math.floor(rng() * 3)],
      mustache: !female && rng() < 0.75, beard: !female && rng() < 0.2, glasses: rng() < 0.2,
      scale: 0.93 + rng() * 0.09, seed: Math.floor(rng() * 1000), acc: {}
    };
    const pick = (a) => a[Math.floor(rng() * a.length)];
    switch (kind) {
      case 'police': return Object.assign(base, { gender: 'male', outfit: 'formal', colors: { top: KHAKI, bottom: KHAKI_DARK }, mustache: true, beard: false, hair: 'short', acc: { hat: false } });
      case 'driver': return Object.assign(base, { gender: 'male', outfit: 'tee', colors: { top: KHAKI, bottom: 0xf3efe6 }, mustache: true });
      case 'ksrtc': return Object.assign(base, { gender: 'male', outfit: 'formal', colors: { top: KHAKI, bottom: KHAKI_DARK } });
      case 'guard': return Object.assign(base, { gender: 'male', outfit: 'formal', colors: { top: 0x2f3e5c, bottom: 0x1f2a3e }, hair: 'short' });
      case 'guide': return Object.assign(base, { outfit: female ? 'churidar' : 'formal', colors: { top: 0x2a9d8f }, acc: { hat: !female && rng() < 0.4, sunglasses: rng() < 0.3 } });
      case 'clerk': return Object.assign(base, { outfit: female ? 'saree' : 'formal', colors: female ? undefined : { top: 0xf3efe6 } });
      case 'sweeper': return Object.assign(base, { gender: 'female', outfit: 'saree', hair: 'bun', colors: { top: 0xe07a1f } });
      case 'tea': return Object.assign(base, { gender: 'male', outfit: 'mundu', colors: { top: 0xf3efe6 } });
      case 'keeper': return Object.assign(base, { outfit: 'formal', colors: { top: 0x4f6b3a, bottom: KHAKI_DARK }, acc: { hat: rng() < 0.5 } });
      case 'mahout': return Object.assign(base, { gender: 'male', outfit: 'mundu', colors: { top: 0x2c5fa8 }, mustache: true });
      case 'lifeguard': return Object.assign(base, { gender: 'male', outfit: 'tee', colors: { top: 0xd8203a, bottom: 0xf2c230 }, acc: { hat: true, sunglasses: true } });
      case 'priest': return Object.assign(base, { gender: 'male', outfit: 'mundu', colors: { top: 0xf3efe6 }, hair: 'short', beard: false });
      case 'flower': return Object.assign(base, { gender: 'female', outfit: 'saree', jasmine: true, hair: 'bun' });
      case 'shopper': return Object.assign(base, { outfit: female ? pick(['saree', 'churidar']) : pick(['mundu', 'formal', 'tee']), carry: rng() < 0.6 ? 'shopping' : null, jasmine: female && rng() < 0.4 });
      default: return Object.assign(base, { outfit: female ? pick(['saree', 'churidar']) : pick(['mundu', 'mundu', 'formal', 'tee']) });
    }
  }

  // A worker. Their day is a queue of tasks: 'go' along a path, 'do' an
  // activity at a spot for a while, 'vanish' (home). When the queue runs
  // out their job plans the next part of the day.
  function addWorker(hub, def) {
    const rng = hub.lifeRng;
    const female = def.female !== undefined ? def.female : rng() < 0.4;
    const w = Object.assign({
      hub, name: (female ? FEMALE : MALE)[Math.floor(rng() * (female ? FEMALE.length : MALE.length))],
      female, look: null, obj: null, first: null, queue: [], task: null, where: 'home', x: 0, z: 0, y: undefined, heading: 0,
      speed: 1.0 + rng() * 0.3, off: rng() * 0.8, rng, init: false
    }, def);
    w.look = w.look || lookFor(rng, def.lookKind || def.job, female);
    if (!w.look.gender) w.look.gender = female ? 'female' : 'male';
    w.female = w.look.gender === 'female';
    if (!def.name) w.name = (w.female ? FEMALE : MALE)[Math.floor(rng() * (w.female ? FEMALE.length : MALE.length))];
    w.first = w.name;
    w.name = w.first + ' (' + w.title + ')';
    w.x = w.post.x; w.z = w.post.z;
    L.workers.push(w);
    (hub.workers = hub.workers || []).push(w);
    (hub.inter || KT.Highway.interactables).push({
      label: 'Talk to ' + w.name, radius: 2.4,
      pos: () => (w.obj ? w.obj.position : _far),
      enabled: () => !!(w.obj && w.obj.visible && w.where !== 'home'),
      action: () => { w.lines = talkLines(w); w.id = 'life-' + hub.index + '-' + w.name; KT.Game.talkTo(w); }
    });
    return w;
  }
  const _far = new T.Vector3(1e9, -1e9, 1e9);

  // ------------------------------------------------- plans for each job
  const go = (path, opt) => Object.assign({ type: 'go', path, i: 0 }, opt);
  const doing = (act, dur, opt) => Object.assign({ type: 'do', act, dur }, opt);

  // at the post: stand (or sit) there doing the job for a while
  function atPost(w, dur, act) {
    return doing(act || w.act, dur, { at: w.post, face: w.face });
  }

  const PLANS = {
    // behind the counter; now and then a tea at the tea shop
    shop(w) {
      const tea = w.hub.shops.find((s) => s.type === 'tea' && s.side === w.shop.side && s !== w.shop);
      if (w.shop.type !== 'tea' && tea && w.rng() < 0.18) {
        const spot = local(tea.obj, 1.2 + w.rng() * 0.6, 3.0, tea.obj.position.y + 0.25);
        const face = local(tea.obj, 1.2, 0);
        w.queue.push(go([w.front, hubPt(w.hub, w.shop.along, w.shop.side * (PAVE + w.off)), hubPt(w.hub, tea.along, w.shop.side * (PAVE + w.off)), spot], { status: 'Going over for a quick tea. My neighbour keeps an eye on the counter.' }));
        w.queue.push(doing('sip', 20 + w.rng() * 15, { at: spot, face, shop: tea, status: 'A strong tea and the gossip of the street. Then back to work.', prop: 'glass' }));
        w.queue.push(go([hubPt(w.hub, tea.along, w.shop.side * (PAVE + w.off)), hubPt(w.hub, w.shop.along, w.shop.side * (PAVE + w.off)), w.front, w.post]));
      } else w.queue.push(atPost(w, 40 + w.rng() * 80));
    },
    // stand at the post doing the job
    post(w) { w.queue.push(atPost(w, 30 + w.rng() * 60)); },
    // the auto driver: chatting at the stand, or sitting in the auto
    auto(w) {
      if (!w.parked || w.hub.parked.indexOf(w.parked) < 0) { w.lost = true; return; }
      if (w.rng() < 0.4) {
        const o = w.parked.obj, seat = local(o, 0, 0.32, o.position.y + 0.1);
        w.queue.push(doing('drive', 25 + w.rng() * 40, { at: seat, face: local(o, 0, 5), status: 'Resting in my auto till my turn comes. Where do you want to go?' }));
      } else w.queue.push(atPost(w, 25 + w.rng() * 40));
    },
    // the guide walks round the sight and stops to point things out
    guide(w) {
      const ring = w.ring;
      let k = w.ringAt || 0;
      const steps = 2 + Math.floor(w.rng() * 3), path = [];
      for (let i = 0; i < steps; i++) { k = (k + 1) % ring.length; path.push(ring[k]); }
      w.ringAt = k;
      w.queue.push(go(path, { speed: 0.8 }));
      w.queue.push(doing('point', 6 + w.rng() * 6, { at: ring[k], face: w.centre, status: 'This way please! Let me tell you about ' + w.sight.name + '.' }));
    },
    // a round of stops: walk to each in turn and work there a while
    round(w) {
      w.k = ((w.k === undefined ? -1 : w.k) + 1) % w.stops.length;
      const st = w.stops[w.k];
      w.queue.push(go((st.via || []).concat([st.at]), { speed: st.speed, anim: st.walk, status: st.going }));
      w.queue.push(doing(st.act || 'idle', (st.dur || 10) * (0.7 + w.rng() * 0.6), { at: st.at, face: st.face, status: st.status }));
    },
    // the sweeper works slowly along the footpath
    sweep(w) {
      const a0 = w.beat[0] + w.rng() * (w.beat[1] - w.beat[0]);
      w.queue.push(go([hubPt(w.hub, a0, w.side * (PAVE + 0.3))], { speed: 0.35, anim: 'sweep', status: 'Sweeping the footpath. Every morning from six, before the shops open.' }));
      w.queue.push(doing('sweep', 6 + w.rng() * 8, { status: 'Sweeping the footpath. Every morning from six, before the shops open.' }));
    },
    // shoppers go from shop to shop along their side of the road
    shopper(w) {
      const shops = w.hub.shops.filter((s) => s.side === w.side && inShift(hours(), SHOP[s.type].hours));
      if (!shops.length) { w.queue.push(doing('idle', 10)); return; }
      const s = shops[Math.floor(w.rng() * shops.length)];
      const lat = w.side * (PAVE + w.off);
      const spot = local(s.obj, (w.rng() - 0.5) * 1.6, 3.0, s.obj.position.y + 0.25);
      w.queue.push(go([hubPt(w.hub, w.along, lat), hubPt(w.hub, s.along, lat), spot], { status: 'Out for the shopping. Then home to cook.' }));
      w.queue.push(doing('idle', 6 + w.rng() * 8, { at: spot, face: local(s.obj, 0, 0), shop: s, status: 'Buying a few things at the ' + SHOP[s.type].title + '.' }));
      w.queue.push(go([hubPt(w.hub, s.along, lat)]));
      w.along = s.along;
      if (w.rng() < 0.3) w.queue.push(doing('idle', 3 + w.rng() * 5, { status: 'Out for the shopping. Then home to cook.' }));
    }
  };

  // ------------------------------------------------------ populate a town
  L.populate = function (hub) {
    if (hub.lifeDone || !hub.shops) return;
    hub.lifeDone = true;
    hub.lifeRng = KT.makeRng(hub.index * 7919 + 11);
    hub.active = onHighway;
    const rng = hub.lifeRng, d = hub.district;
    // shopkeepers (the tea shop has a tea maker and its regulars)
    hub.shops.forEach((s) => {
      const tea = s.type === 'tea', sh = SHOP[s.type].hours;
      const y = s.obj.position.y + 0.27;
      const post = local(s.obj, 0, 1.0, y), front = local(s.obj, 0, 3.0, s.obj.position.y + 0.25);
      const start = sh[0] + rng() * 0.4, end = sh[1] - rng() * 0.4;
      const w = addWorker(hub, {
        job: 'shop', plan: 'shop', lookKind: tea ? 'tea' : 'shopkeeper', female: tea ? false : rng() < 0.35, title: SHOP[s.type].title,
        shop: s, post, front, face: local(s.obj, 0, 6), shift: [start, end], prop: tea ? 'tea' : null,
        act: tea ? 'pour' : () => (s.customers > 0 ? 'serve' : 'idle'),
        approach: () => [front], exit: () => [front].concat(homeRoute(hub, s.side, s.along, w.off))
      });
      w.about = 'I run the ' + SHOP[s.type].title + ' here, from ' + fmt(start) + ' till ' + fmt(end) + '. ' + SHOP[s.type].line;
      if (tea) {
        // the regulars on the bench in front: one in the morning, one in the evening
        [[6, 9.5, -0.45], [16, 19.5, 0.45], [10.5, 12, 0.45]].forEach(([a, b, x], k) => {
          const seat = local(s.obj, x, 3.16, s.obj.position.y);
          const r = addWorker(hub, {
            job: 'regular', plan: 'post', lookKind: 'regular', female: k === 2, title: 'tea shop regular', post: seat, face: local(s.obj, x, 9),
            shift: [a + rng() * 0.5, b], act: 'sitTea', prop: 'glass', approach: () => [local(s.obj, x, 3.9)],
            exit: () => [local(s.obj, x, 3.9)].concat(homeRoute(hub, s.side, s.along, 0.3))
          });
          r.about = ['My tea and the newspaper on this bench: every morning for thirty years.', 'After work I come here for a tea and a pazham pori before going home.', 'A cup of tea in the middle of the day, and I hear all the news of the town.'][k];
        });
      }
    });
    // fruit vendors at the market stalls
    (hub.stalls || []).forEach((st) => {
      const o = st.obj, y = o.position.y;
      const w = addWorker(hub, {
        job: 'vendor', plan: 'post', lookKind: 'vendor', title: 'fruit vendor', post: local(o, 0.4, -0.55, y), face: local(o, 0, 5),
        shift: [6.5 + rng(), 19 + rng()], act: () => (Math.sin(KT.Highway.animTime * 0.3 + st.along) > 0.7 ? 'wave' : 'idle'),
        exit: () => [local(o, 2.4, -0.5), local(o, 2.4, 3.5)].concat(homeRoute(hub, Math.sign(st.lat), st.along, 0.4)), approach: () => [local(o, 2.4, 3.5), local(o, 2.4, -0.5)]
      });
      w.about = 'Fresh fruit every morning from the wholesale market. Mangoes, jackfruit, bananas: I call out to everyone who passes!';
    });
    // auto drivers, each by their own auto (at the stand, or parked along
    // the road), standing on the footpath side or resting in the seat
    (hub.parked || []).filter((p) => p.kind === 'auto').slice(0, 6).forEach((p) => {
      const o = p.obj, pr = KT.Highway.project(o.position.x, o.position.z);
      const side = Math.sign(pr.lat) || 1, along = pr.s - hub.s;
      const post = hubPt(hub, along + 0.6, pr.lat + side * 1.3);
      const w = addWorker(hub, {
        job: 'auto', plan: 'auto', lookKind: 'driver', female: false, title: 'auto driver', parked: p, post, face: hubPt(hub, along - 4, pr.lat),
        shift: [5.5 + rng() * 1.5, 21 + rng() * 1.5], act: 'chat',
        exit: () => homeRoute(hub, side, along, 1.5), approach: () => []
      });
      w.about = 'I drive an auto in ' + d.name + '. Minimum fare is thirty rupees, and I know every shortcut in the district. When there are no passengers I wait here by my auto.';
    });
    // the traffic policeman at the crossing
    const H = KT.Highway, cx = H.CROSSING;
    const pol = addWorker(hub, {
      job: 'police', plan: 'post', lookKind: 'police', female: false, title: 'traffic police', post: hubPt(hub, cx + 3.4, -8.7), face: hubPt(hub, cx + 3.4, 0),
      shift: [8 + rng() * 0.5, 20 + rng() * 0.5], act: 'direct',
      exit: () => homeRoute(hub, -1, cx + 3.4, 0.2), approach: () => [hubPt(hub, cx + 3.4, -(PAVE + 0.2))]
    });
    pol.about = 'Traffic police. From eight to eight I keep this junction moving. Cross at the zebra when the signal stops the vehicles, and always wear a helmet on a scooter!';
    // the morning sweeper
    const sw = addWorker(hub, {
      job: 'sweeper', plan: 'sweep', lookKind: 'sweeper', female: true, title: 'street sweeper', side: 1, beat: [-110, 140],
      post: hubPt(hub, 60, PAVE + 0.3), shift: [6 + rng() * 0.3, 11 + rng()], prop: 'broom', act: 'sweep',
      exit: () => homeRoute(hub, 1, KT.Highway.project(sw.x, sw.z).s - hub.s, 0.3), approach: () => []
    });
    sw.about = 'I sweep the main road every morning, six till eleven. Please put plastic in the bins: keep ' + d.name + ' clean!';
    // the bus stand: station master and people waiting for the bus
    if (hub.standObj) {
      const o = hub.standObj, y = o.position.y + 0.3;
      const sm = addWorker(hub, {
        job: 'ksrtc', plan: 'post', lookKind: 'ksrtc', female: false, title: 'KSRTC station master', post: local(o, 3.2, 0.9, y), face: local(o, 3.2, 8),
        shift: [5 + rng() * 0.5, 23], act: () => (Math.sin(KT.Highway.animTime * 0.2) > 0.75 ? 'point' : 'idle'),
        exit: () => [local(o, 3.2, 3)].concat(homeRoute(hub, -1, 3, 0.6)), approach: () => [local(o, 3.2, 3)]
      });
      sm.about = 'Station master, KSRTC ' + d.name + '. Fast passengers to every district, from five in the morning till late at night. Call the bus from here.';
      [[-4.5, 6.5, 11], [-3.6, 8, 13], [0.4, 11, 16.5], [3.6, 14, 19], [4.4, 16.5, 21]].forEach(([x, a, b], k) => {
        const seat = local(o, x, -1.34, y);
        const p = addWorker(hub, {
          job: 'passenger', plan: 'post', lookKind: 'regular', title: 'waiting for the bus', post: seat, face: local(o, x, 5),
          shift: [a + rng() * 0.5, b], act: 'sit', exit: () => [local(o, x, 2.6)].concat(homeRoute(hub, -1, 3, 0.8)), approach: () => [local(o, x, 2.6)]
        });
        p.about = ['Waiting for the bus to the office. It is always a little late!', 'Going to college in the next town. The bus is full every morning.', 'Going to visit my daughter. The fast passenger stops here at noon.', 'Going home from work. This is the last bus I can catch.', 'I sell vegetables in the next town; the morning bus takes me and my baskets.'][k];
      });
    }
    // shoppers along both pavements
    [-1, -1, 1, 1].forEach((side, k) => {
      const along = [-60, 40, -20, 30][k];
      const w = addWorker(hub, {
        job: 'shopper', plan: 'shopper', lookKind: 'shopper', title: 'out shopping', side, along,
        post: hubPt(hub, along, side * PAVE), shift: [[8, 12], [9.5, 13], [15.5, 19.5], [16.5, 20]][k],
        exit: () => homeRoute(hub, side, w.along, w.off), approach: () => []
      });
      w.about = 'Out for the shopping: fish, vegetables, a few things from the provision store. Everything is here on the main road.';
    });
    // the attractions: ticket clerk, guard and watchman, guide
    H.sightList().filter((sg) => sg.hub === hub.index && !sg.dest).forEach((sg) => sightStaff(hub, sg));
  };

  function sightStaff(hub, sg) {
    const H = KT.Highway, rng = hub.lifeRng;
    const sgn = Math.sign(sg.lat) || 1;
    // the entrance: on the sight's edge facing the road, nudged round if blocked
    let ent = null;
    for (const da of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1]) {
      const a = -Math.PI / 2 * sgn + da;
      const along = sg.along + Math.cos(a) * (sg.r + 3.5), lat = sg.lat + Math.sin(a) * (sg.r + 3.5);
      const q = H.at(hub.s + along, lat);
      if (Math.abs(lat) < 26 || H.isBlocked(q.x, q.z, 1.4) || H.waterLevelAt(q.x, q.z) > -1e8 || H.branchesNear(q.x, q.z, 9).length) continue;
      ent = { along, lat, x: q.x, z: q.z };
      break;
    }
    const centre = { x: sg.x, z: sg.z };
    if (ent) {
      const booth = ticketBooth();
      booth.position.set(ent.x, H.groundY(ent.x, ent.z).y, ent.z);
      booth.rotation.y = Math.atan2(ent.x - sg.x, ent.z - sg.z);
      hub.group.add(booth);
      const cs = Math.cos(booth.rotation.y), sn = Math.sin(booth.rotation.y);
      booth.userData.colliders.forEach((c) => H.addCollider({ type: 'box', x: ent.x + c.x * cs + c.z * sn, z: ent.z - c.x * sn + c.z * cs, hw: c.hw, hd: c.hd, rot: booth.rotation.y }));
      const y = booth.position.y + 0.12;
      const away = (k) => [local(booth, 2.2, 1.8), local(booth, 2.2 + k * 0.5, 22)];
      const clerk = addWorker(hub, {
        job: 'clerk', plan: 'post', lookKind: 'clerk', title: 'ticket counter', post: local(booth, 0, 0.15, y), face: local(booth, 0, 5),
        shift: [8.5 + rng() * 0.5, 17.5 + rng() * 0.5], act: () => (Math.sin(KT.Highway.animTime * 0.25 + sg.x) > 0.5 ? 'serve' : 'idle'),
        exit: () => [local(booth, 0, 1.0, y), local(booth, 1.2, 1.4)].concat(away(0)), approach: () => away(0).reverse().concat([local(booth, 1.2, 1.4), local(booth, 0, 1.0, y)])
      });
      clerk.about = 'Tickets for ' + sg.name + ': thirty rupees for adults, ten for children. The counter is open from ' + fmt(clerk.shift[0]) + ' to ' + fmt(clerk.shift[1]) + '.';
      clerk.sight = sg;
      const guard = addWorker(hub, {
        job: 'guard', plan: 'post', lookKind: 'guard', female: false, title: 'security guard', post: local(booth, -1.6, 0.9), face: local(booth, -1.6, 6),
        shift: [6 + rng() * 0.3, 18 + rng() * 0.3], act: 'idle', exit: () => away(1), approach: () => away(1).reverse()
      });
      guard.about = 'I guard ' + sg.name + ' through the day, six to six. Then the watchman takes over for the night.';
      const watch = addWorker(hub, {
        job: 'watchman', plan: 'post', lookKind: 'guard', female: false, title: 'night watchman', post: local(booth, 1.55, 0.66, booth.position.y), face: local(booth, 1.55, 6),
        shift: [18 + rng() * 0.3, 6], act: 'sit', exit: () => away(2), approach: () => away(2).reverse()
      });
      watch.about = 'Night watchman at ' + sg.name + '. I sit here with my torch from six in the evening till the sun comes up. Quiet work, but someone has to do it.';
    }
    // the guide's round
    const ring = [], R = sg.r + 4.5, n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const along = sg.along + Math.cos(a) * R, lat = sg.lat + Math.sin(a) * R;
      if (Math.abs(lat) < 26) continue;
      const q = H.at(hub.s + along, lat);
      if (H.isBlocked(q.x, q.z, 0.6) || H.waterLevelAt(q.x, q.z) > -1e8) continue;
      ring.push({ x: q.x, z: q.z });
    }
    if (ring.length >= 3) {
      const g = addWorker(hub, {
        job: 'guide', plan: 'guide', lookKind: 'guide', title: 'tourist guide', ring, centre, sight: sg, post: ring[0],
        shift: [9 + rng() * 0.5, 17 + rng()], act: 'point', exit: () => [], approach: () => []
      });
      g.about = 'I am a guide at ' + sg.name + '. ' + ((sg.facts && sg.facts[0]) || '') + ' I show visitors round from ' + fmt(g.shift[0]) + ' till ' + fmt(g.shift[1]) + '.';
      g.vanishFar = true;
    }
  }

  // ---------------------------------------------------------- talking
  function talkLines(w) {
    const t = w.task, h = hours();
    let now;
    if (w.where === 'out' && t && t.type === 'go' && w.goingHome) now = ['That\'s my day done! Home now: dinner is waiting.', 'Finished for today. Going home to my family.', 'Time to go home. See you tomorrow!'][Math.floor(w.rng() * 3)];
    else if (w.where === 'out' && t && t.type === 'go' && w.goingToWork) now = 'I\'m on my way to work. Can\'t be late!';
    else if (t && t.status) now = t.status;
    else if (w.job === 'police') now = (KT.Highway.animTime + w.hub.index * 7) % 27 >= 18 ? 'Stop! Let the people cross first.' : 'Keep moving, keep moving! No parking at the junction.';
    else if (w.job === 'shop' && w.shop.customers > 0) now = 'One moment, I have a customer.';
    else if (w.job === 'shop') now = h < 11 ? 'The morning rush is over; now it is quiet till lunch.' : h < 15 ? 'Lunchtime is busy. Everyone comes for something.' : 'The evening is the busiest time: people stop on their way home.';
    else now = null;
    return [w.about, now].filter(Boolean);
  }

  // ------------------------------------------------------------ update
  const groundOf = (w, x, z) => (w.hub.ground ? w.hub.ground(x, z) : KT.Highway.groundY(x, z).y);
  function nextTask(w, near) {
    w.goingHome = w.goingToWork = false;
    const h = hours(), on = inShift(h, w.shift) && !w.lost;
    if (w.where === 'home') {
      if (!on) { w.task = { type: 'off', dur: 15 }; return; }
      // set out for work from the side street
      const path = (w.exit ? w.exit() : []).slice().reverse();
      if (!path.length && near) { w.task = { type: 'off', dur: 10 }; return; } // appears out of sight
      w.task = go(path.concat([w.post]));
      w.goingToWork = true;
      w.where = 'out';
      if (path.length) { w.x = path[0].x; w.z = path[0].z; w.y = path[0].y; }
      return;
    }
    if (!on) {
      // the day is over: walk home
      const path = w.exit ? w.exit() : [];
      if (!path.length && near) { w.task = doing(typeof w.act === 'function' ? 'idle' : w.act, 10); return; } // leaves out of sight
      w.queue.length = 0;
      w.task = go(path, { home: true });
      w.goingHome = true;
      w.where = 'out';
      return;
    }
    if (!w.queue.length) {
      // not at the post (just arrived, or back from somewhere)
      if (w.where !== 'work' && w.plan !== 'guide' && w.plan !== 'sweep' && w.plan !== 'shopper' && w.plan !== 'round') { w.queue.push(go([w.post])); w.where = 'work'; }
      else { w.where = 'work'; PLANS[w.plan](w); }
    }
    w.task = w.queue.shift() || { type: 'off', dur: 5 };
  }

  L.update = function (dt, player) {
    const pp = player.pos, h = hours();
    for (let i = 0; i < L.workers.length; i++) {
      const w = L.workers[i], g = w.hub.group;
      if (!g || !g.visible || (w.hub.active && !w.hub.active())) { if (w.obj) w.obj.visible = false; continue; }
      const d = Math.hypot(w.x - pp.x, w.z - pp.z), near = d < SHOW;
      if (!w.init) {
        // on arrival everyone is already where their day has them
        w.init = true;
        if (inShift(h, w.shift)) { w.where = 'work'; w.x = w.post.x; w.z = w.post.z; w.y = w.post.y; }
        else w.where = 'home';
      }
      // their auto was taken: off home, grumbling
      if (w.parked && !w.lost && w.hub.parked.indexOf(w.parked) < 0) {
        w.lost = true;
        if (w.obj && w.obj.visible && d < 25 && KT.UI) KT.UI.toast('"Hey! That\'s my auto!" ' + w.first + ' shouts after you.', 'info');
      }
      // the day ends in the middle of something: drop it and go home
      if (w.where !== 'home' && !w.goingHome && (!inShift(h, w.shift) || w.lost) && w.task && w.task.type === 'do') dropTask(w);
      if (w.talking) w.task = w.task || doing('idle', 1);
      else if (!w.task || stepTask(w, dt, near)) nextTask(w, near);
      if (w.where === 'home' || !near) { if (w.obj) w.obj.visible = false; continue; }
      if (!w.obj) { w.obj = makePerson(w); g.add(w.obj); }
      const o = w.obj;
      o.visible = true;
      o.position.set(w.x, w.y !== undefined ? w.y : groundOf(w, w.x, w.z), w.z);
      let face = w.heading;
      if (w.talking) face = Math.atan2(pp.x - w.x, pp.z - w.z);
      o.rotation.y = KT.angleLerp(o.rotation.y, face, 1 - Math.exp(-dt * 6));
      if (d < ANIM) {
        let act = w.talking ? (w.anim === 'sit' || w.anim === 'sitTea' || w.anim === 'drive' ? w.anim : 'chat') : w.anim || 'idle';
        const a = o.userData.anim;
        if (a) a.stop = w.job === 'police' && (KT.Highway.animTime + w.hub.index * 7) % 27 >= 18;
        KT.Models.animateCharacter(o, act, dt, w.anim === 'walk' ? (w.task && w.task.speed || w.speed) / 1.1 : 1);
      }
    }
    updateLoose(dt, pp);
  };

  function dropTask(w) {
    const t = w.task;
    if (t && t.counted && t.dur > 0) t.shop.customers--;
    w.task = null;
    w.queue.length = 0;
  }
  // advance the current task; true when it is finished
  function stepTask(w, dt, near) {
    const t = w.task;
    if (t.type === 'off') { t.dur -= dt; return t.dur <= 0; }
    if (t.type === 'do') {
      if (t.at) { w.x = t.at.x; w.z = t.at.z; w.y = t.at.y; }
      if (t.face) w.heading = Math.atan2(t.face.x - w.x, t.face.z - w.z);
      const act = t.act !== undefined ? t.act : w.act;
      w.anim = typeof act === 'function' ? act() : act;
      if (t.shop && !t.counted) { t.shop.customers++; t.counted = true; }
      t.dur -= dt;
      if (t.dur <= 0 && t.counted) t.shop.customers--;
      return t.dur <= 0;
    }
    if (t.type === 'go') {
      const sp = t.speed || w.speed;
      w.anim = t.anim || 'walk';
      let left = sp * dt;
      // far from the player nobody needs to see the walk
      if (!near) left = 1e9;
      while (left > 0 && t.i < t.path.length) {
        const p = t.path[t.i];
        const dx = p.x - w.x, dz = p.z - w.z, dd = Math.hypot(dx, dz);
        if (dd < 1e-3 || dd <= left) {
          left -= dd;
          w.x = p.x; w.z = p.z; w.y = p.y;
          t.i++;
          t.y0 = p.y;
          continue;
        }
        w.heading = Math.atan2(dx, dz);
        const k = left / dd;
        w.x += dx * k; w.z += dz * k;
        // steps up and down from a raised floor are eased in
        if (p.y !== undefined || t.y0 !== undefined) {
          const gy = groundOf(w, w.x, w.z);
          const ty = p.y !== undefined ? p.y : gy, fy = w.y !== undefined ? w.y : gy;
          w.y = KT.lerp(fy, ty, Math.min(1, k * 2));
          if (dd - left < 0.05) w.y = ty;
        } else w.y = undefined;
        left = 0;
      }
      if (t.i >= t.path.length) {
        if (t.home) { w.where = 'home'; w.goingHome = false; }
        return true;
      }
      return false;
    }
    return true;
  }

  // ------------------------------------------------------------ drivers
  // A driver sitting in an auto or bus on the road (a posed figure that
  // rides along with the vehicle).
  const DRIVER_SEAT = { auto: [0, 0.1, 0.32], bus: [-0.62, 0.55, 4.35] };
  let driverN = 0;
  L.seatDriver = function (obj, kind, rng) {
    const seat = DRIVER_SEAT[kind];
    if (!seat || !obj) return null;
    rng = rng || Math.random;
    const look = lookFor(rng, kind === 'bus' ? 'ksrtc' : 'driver', false);
    look.seed = driverN++;
    const ch = KT.Models.character(Object.assign({ lite: true }, look));
    ch.userData.cfg = look;
    KT.Models.animateCharacter(ch, 'drive', 3, 1);
    ch.position.set(seat[0], seat[1], seat[2]);
    ch.traverse((o) => { o.castShadow = false; });
    obj.add(ch);
    obj.userData.driver = ch;
    return ch;
  };
  // the player takes a vehicle: its driver gets out and complains
  L.driverOut = function (obj, parent) {
    const ch = obj && obj.userData.driver;
    if (!ch) return;
    obj.remove(ch);
    obj.userData.driver = null;
    const p = new T.Vector3(1.4, 0, 0.3);
    obj.localToWorld(p);
    const lvl = KT.L || KT.Highway;
    const man = KT.Models.character(Object.assign({ lite: true }, ch.userData.cfg));
    man.position.set(p.x, lvl.groundY(p.x, p.z).y, p.z);
    (parent || obj.parent || KT.Highway.scene).add(man);
    const dir = Math.atan2(p.x - obj.position.x, p.z - obj.position.z);
    man.rotation.y = dir + Math.PI;
    L.loose.push({ obj: man, t: 0, dir, ground: (x, z) => lvl.groundY(x, z).y });
    if (KT.UI && KT.UI.toast) KT.UI.toast(['"Eda! That\'s my vehicle!" the driver shouts.', '"Bring it back in one piece!" the driver calls after you.', '"Aiyyo! My passengers are waiting!"'][driverN++ % 3], 'info');
  };
  function updateLoose(dt, pp) {
    for (let i = L.loose.length - 1; i >= 0; i--) {
      const l = L.loose[i], o = l.obj;
      l.t += dt;
      if (l.t > 25 || !o.parent) { if (o.parent) o.parent.remove(o); L.loose.splice(i, 1); continue; }
      let act = 'wave';
      if (l.t < 4) o.rotation.y = KT.angleLerp(o.rotation.y, Math.atan2(pp.x - o.position.x, pp.z - o.position.z), 1 - Math.exp(-dt * 5));
      else {
        act = 'walk';
        o.rotation.y = KT.angleLerp(o.rotation.y, l.dir, 1 - Math.exp(-dt * 4));
        o.position.x += Math.sin(o.rotation.y) * 1.1 * dt;
        o.position.z += Math.cos(o.rotation.y) * 1.1 * dt;
        o.position.y = l.ground(o.position.x, o.position.z);
      }
      KT.Models.animateCharacter(o, act, dt, 1);
    }
  }


  // ---------------------------------------------- other places: helpers
  const onHighway = () => KT.Game.level === 'highway';
  // a ticket booth at a spot (with its colliders), facing `rot`
  function placeBooth(site, x, z, rot, addCollider) {
    const booth = ticketBooth();
    booth.position.set(x, site.ground(x, z), z);
    booth.rotation.y = rot;
    site.group.add(booth);
    const cs = Math.cos(rot), sn = Math.sin(rot);
    booth.userData.colliders.forEach((c) => addCollider({ type: 'box', x: x + c.x * cs + c.z * sn, z: z - c.x * sn + c.z * cs, hw: c.hw, hd: c.hd, rot }));
    return booth;
  }
  // clerk, day guard and night watchman at a booth
  function boothStaff(site, booth, place, opts) {
    const y = booth.position.y + 0.12, rng = site.lifeRng;
    const away = opts.away || (() => []);
    const clerk = addWorker(site, {
      job: 'clerk', plan: 'post', lookKind: 'clerk', title: opts.clerkTitle || 'ticket counter', post: local(booth, 0, 0.15, y), face: local(booth, 0, 5),
      shift: opts.hours, act: () => (Math.sin(KT.Highway.animTime * 0.25 + booth.position.x) > 0.5 ? 'serve' : 'idle'),
      exit: () => [local(booth, 0, 1.0, y), local(booth, 1.2, 1.4)].concat(away()), approach: () => []
    });
    clerk.about = opts.ticket || ('Tickets for ' + place + ': thirty rupees for adults, ten for children. The counter is open from ' + fmt(opts.hours[0]) + ' to ' + fmt(opts.hours[1]) + '.');
    if (opts.guard === false) return;
    const guard = addWorker(site, {
      job: 'guard', plan: 'post', lookKind: 'guard', female: false, title: 'security guard', post: local(booth, -1.6, 0.9), face: local(booth, -1.6, 6),
      shift: [6 + rng() * 0.3, 18 + rng() * 0.3], act: 'idle', exit: away, approach: () => []
    });
    guard.about = 'I guard ' + place + ' through the day, six to six. Then the watchman takes over for the night.';
    const watch = addWorker(site, {
      job: 'watchman', plan: 'post', lookKind: 'guard', female: false, title: 'night watchman', post: local(booth, 1.55, 0.66, booth.position.y), face: local(booth, 1.55, 6),
      shift: [18 + rng() * 0.3, 6], act: 'sit', exit: away, approach: () => []
    });
    watch.about = 'Night watchman at ' + place + '. I sit here with my torch from six in the evening till the sun comes up.';
  }

  // ------------------------------------------------------------- the zoo
  // Keepers on their feeding rounds with buckets, the mahout with the
  // tusker, a sweeper on the main path, the snack cart in the forecourt,
  // the ticket booth at the gate with its guard and watchman, and a guide.
  // (Zoo model space: the gate is at z = +56, paths along x = 0 and z = ±20.)
  L.zoo = function (it, root) {
    const Hw = KT.Highway;
    const site = { group: it.group, index: 300 + (it.sg.hub || 0), lifeRng: KT.makeRng(1857), ground: (x, z) => Hw.groundY(x, z).y, inter: Hw.interactables, shops: [], parked: [], active: onHighway };
    const P = (x, z) => local(root, x, z);
    const rng = site.lifeRng, HOURS = [8.5, 17.5];
    const out = (x) => [P(x, 56), P(x, 66), P(x + 14, 78)];
    // the ticket booth and the gate staff
    const booth = placeBooth(site, P(9, 64).x, P(9, 64).z, root.rotation.y, (c) => Hw.addCollider(c));
    boothStaff(site, booth, 'the zoo', { hours: HOURS, away: () => [P(14, 74), P(24, 80)], ticket: 'Zoo tickets: forty rupees for adults, ten for children, and a camera ticket for fifty. We are open from half past eight to half past five, every day except Monday.' });
    // the snack cart in the forecourt
    const cart = KT.Models.teaCart(), cp = P(-9, 66);
    cart.position.set(cp.x, site.ground(cp.x, cp.z), cp.z);
    cart.rotation.y = root.rotation.y;
    it.group.add(cart);
    const cs = Math.cos(cart.rotation.y), sn = Math.sin(cart.rotation.y);
    (cart.userData.colliders || []).forEach((c) => Hw.addCollider({ type: 'box', x: cp.x + c.x * cs + c.z * sn, z: cp.z - c.x * sn + c.z * cs, hw: c.hw, hd: c.hd, rot: cart.rotation.y }));
    const snack = addWorker(site, {
      job: 'vendor', plan: 'post', lookKind: 'tea', title: 'snack cart', post: local(cart, 0, -1.05), face: local(cart, 0, 4), prop: 'tea',
      shift: [9, 18.5], act: () => (Math.sin(KT.Highway.animTime * 0.2) > 0.3 ? 'pour' : 'serve'),
      exit: () => [P(-14, 74), P(-24, 80)], approach: () => []
    });
    snack.about = 'Tea, lime soda, ice cream and peanuts for the zoo visitors. On a hot day the children buy all my ice cream by noon!';
    // the keepers' feeding rounds, each along its own path
    const ROUNDS = [
      { z: 22.5, face: 30, name: 'the zebras, the storks and the elephants', pens: [[-39, 'zebras', 'Fresh grass and bran for the zebras.'], [-15, 'storks', 'Fish for the adjutant storks: they swallow them whole!'], [30, 'elephants', 'Palm leaves and a bucket of rice balls for the elephants.']] },
      { z: 17.5, face: 10, name: 'the big cats and the apes', pens: [[-41, 'lions', 'Meat for the lions. They hear my bucket from far away.'], [-17, 'leopards', 'The leopards like to eat up on their platform.'], [18, 'orangutans', 'Bananas, papaya and boiled eggs for the orangutans.'], [42, 'macaques', 'Fruit and nuts for the lion-tailed macaques.']] },
      { z: -22.5, face: -30, name: 'the tigers, the bears and the deer', pens: [[-30, 'tigers', 'Meat for the tigers, thrown over the moat.'], [18, 'bears', 'Honey, fruit and termite mounds for the sloth bears.'], [42, 'deer', 'Grass and gram for the spotted deer.']] }
    ];
    ROUNDS.forEach((R, k) => {
      const stops = R.pens.map(([x, animal, line]) => ({ at: P(x, R.z), face: P(x, R.face), act: 'serve', dur: 16, status: line, going: 'Next, the ' + animal + '. They know it is feeding time!' }));
      const w = addWorker(site, {
        job: 'keeper', plan: 'round', lookKind: 'keeper', title: 'zookeeper', stops, prop: 'bucket', post: stops[0].at,
        shift: [[7.5 + rng() * 0.5, 12.5], [13.5, 17.5 + rng() * 0.5]], exit: () => [P(0, R.z)].concat(out(2 + k)), approach: () => []
      });
      w.about = 'I am a keeper here. I look after ' + R.name + ': I feed them, clean their enclosures and watch that they are well. Feeding is at ten and at three.';
    });
    // the mahout with the tusker
    const mh = addWorker(site, {
      job: 'mahout', plan: 'round', lookKind: 'mahout', female: false, title: 'mahout',
      stops: [{ at: P(21.5, 31.6), face: P(24, 34), act: 'chat', dur: 30, status: 'Talking to the old tusker. He understands every word, you know.' },
        { at: P(26.5, 31), face: P(26.5, 32), act: 'serve', dur: 20, status: 'Giving him his palm leaves.' }],
      post: P(21.5, 31.6), shift: [6, 18], exit: () => [P(26, 23), P(0, 23)].concat(out(6)), approach: () => []
    });
    mh.about = 'I am his mahout. Twenty years together: he knows my voice better than my own children do.';
    // a sweeper on the main path
    const sw = addWorker(site, {
      job: 'sweeper', plan: 'round', lookKind: 'sweeper', female: true, title: 'sweeper', prop: 'broom',
      stops: [-46, -20, 6, 30, 52, 30, 6, -20].map((z) => ({ at: P(1.6, z), act: 'sweep', walk: 'sweep', speed: 0.35, dur: 8, status: 'Keeping the paths clean. Please use the dustbins: plastic can kill the animals.' })),
      post: P(1.6, 52), shift: [7, 12], exit: () => out(-2), approach: () => []
    });
    sw.about = 'I sweep the zoo paths every morning before the visitors come.';
    // a guide showing visitors round
    const G = [[0, 40, 0, 'Asian elephants'], [-15, 22.5, 30, 'adjutant storks'], [-39, 22.5, 30, 'zebras'], [-41, 17.5, 10, 'lions'], [-17, 17.5, 10, 'leopards'], [18, 17.5, 10, 'orangutans'], [-30, -22.5, -30, 'Bengal tigers'], [18, -22.5, -30, 'sloth bears']];
    const gd = addWorker(site, {
      job: 'guide', plan: 'round', lookKind: 'guide', title: 'zoo guide',
      stops: G.map(([x, z, fz, n]) => ({ at: P(x, z), face: P(x, fz || z), act: 'point', dur: 9, speed: 0.8, status: 'And here are our ' + n + '. Shall I tell you about them?' })),
      post: P(0, 40), shift: [9, 17], exit: () => out(-4), approach: () => []
    });
    gd.about = 'I am a guide at the zoo. It opened in 1857, one of the oldest in India, and the gardens around it are older still.';
  };

  // -------------------------------------------------------- the home map
  // Alleppey: fruit vendors at the promenade stalls, the tea cart and its
  // regulars, the temple priest and the jasmine seller, the palace and the
  // lighthouse ticket counters, a lifeguard and a peanut seller on the
  // beach, and the morning sweeper on the promenade.
  L.home = function () {
    const W = KT.World, E = KT.Entities;
    if (!W || !W.sites || L.homeDone) return;
    L.homeDone = true;
    const site = { group: new T.Group(), index: 900, lifeRng: KT.makeRng(424242), ground: (x, z) => W.groundY(x, z).y, inter: E.interactables, shops: [], parked: [], active: () => KT.Game.level === 'home' };
    W.scene.add(site.group);
    const rng = site.lifeRng;
    const pt = (x, z) => ({ x, z });
    // the way home: to the nearest house's front door (or out of sight)
    const HOUSES = ['keralaHouse', 'villageHouse', 'coastalHouse', 'thatchedHut', 'modernHouse'];
    const homeFrom = (p) => {
      let best = null, bd = 95;
      HOUSES.forEach((k) => (W.sites[k] || []).forEach((s) => { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } }));
      return best ? () => [local(best.object, 0, 7), local(best.object, 0, 2.5)] : () => [];
    };
    // fruit vendors
    (W.sites.stall || []).forEach((s) => {
      const o = s.object, post = local(o, 0.4, -0.55);
      const w = addWorker(site, { job: 'vendor', plan: 'post', lookKind: 'vendor', title: 'fruit vendor', post, face: local(o, 0, 5), shift: [6.5 + rng(), 19 + rng()],
        act: () => (Math.sin(KT.World.animTime * 0.3 + s.z) > 0.7 ? 'wave' : 'idle'), exit: homeFrom(post), approach: () => [] });
      w.about = 'Bananas, pineapples and mangoes from the farms upriver. The boats bring them in every morning.';
    });
    // the tea cart and its regulars
    (W.sites.teaCart || []).forEach((s) => {
      const o = s.object, post = local(o, 0, -1.05);
      const t = addWorker(site, { job: 'vendor', plan: 'post', lookKind: 'tea', title: 'tea cart', post, face: local(o, 0, 4), prop: 'tea', shift: [5.5, 21], act: 'pour', exit: homeFrom(post), approach: () => [] });
      t.about = 'Chaya for ten rupees, and the best view of the backwaters with it. Boatmen, tourists, everyone stops at my cart.';
      [[-0.9, [[6, 9], [16.5, 19]]], [0.9, [[7.5, 11], [15, 18]]]].forEach(([x, sh], k) => {
        const at = local(o, x, 1.8);
        const r = addWorker(site, { job: 'regular', plan: 'post', lookKind: 'regular', title: 'having tea', post: at, face: local(o, x, 0), prop: 'glass', shift: sh, act: 'sip', exit: homeFrom(at), approach: () => [] });
        r.about = ['A tea at this cart before I take my boat out, and another when I get back.', 'I come here every day to watch the houseboats go past with a glass of tea.'][k];
      });
    });
    // the temple: the priest at the shrine, the jasmine seller outside
    (W.sites.temple || []).forEach((s) => {
      const o = s.object;
      const pr = addWorker(site, { job: 'priest', plan: 'post', lookKind: 'priest', female: false, title: 'temple priest', post: local(o, 1.6, 1.2), face: local(o, 0, -6),
        shift: [[4.5, 11.5], [17, 20.5]], act: () => (Math.sin(KT.World.animTime * 0.2) > 0 ? 'namaskaram' : 'idle'), exit: () => [], approach: () => [] });
      pr.about = 'I am the priest here. The temple opens at half past four in the morning for the first pooja, closes at noon and opens again in the evening. The palpayasam here is famous: rice cooked in milk and offered to Krishna.';
      const fl = addWorker(site, { job: 'vendor', plan: 'post', lookKind: 'flower', female: true, title: 'flower seller', post: local(o, -8, 25), face: local(o, -8, 35), prop: 'basket',
        shift: [5, 12], act: () => (Math.sin(KT.World.animTime * 0.25) > 0.6 ? 'serve' : 'idle'), exit: homeFrom(local(o, -8, 25)), approach: () => [] });
      fl.about = 'Jasmine garlands for the hair and marigolds for the offering. Ten rupees a string, fresh every morning.';
    });
    // ticket counters at the palace and the lighthouse
    const arch = (W.sites.entranceArch || []).find((s) => (s.lines || [])[0] === 'Krishnapuram Palace');
    if (arch) {
      const p = local(arch.object, 5.5, 2.5);
      const b = placeBooth(site, p.x, p.z, arch.rot, (c) => W.addCollider ? W.addCollider(c) : null);
      boothStaff(site, b, 'Krishnapuram Palace', { hours: [9, 17], away: homeFrom(p), ticket: 'Tickets for Krishnapuram Palace: twenty rupees. Inside is the Gajendra Moksham mural, one of the biggest in Kerala. Open nine to five, closed Mondays.' });
    }
    (W.sites.lighthouse || []).forEach((s) => {
      const p = local(s.object, 6, 9);
      const b = placeBooth(site, p.x, p.z, s.rot, (c) => W.addCollider ? W.addCollider(c) : null);
      boothStaff(site, b, 'the lighthouse', { hours: [10, 17.5], guard: false, away: homeFrom(p), ticket: 'Twenty rupees to climb the lighthouse. Built in 1862, the first on the Kerala coast. Open from ten till half past five.' });
    });
    // the beach: lifeguard and the peanut seller
    const lg = addWorker(site, { job: 'lifeguard', plan: 'round', lookKind: 'lifeguard', female: false, title: 'lifeguard',
      stops: [[-60, 0.2], [20, -0.4], [80, 0.3]].map(([x, h]) => ({ at: pt(x, 226), face: pt(x + h * 40, 260), act: 'idle', dur: 40, status: 'Watching the swimmers. Don\'t go past the red flags: the currents are strong here.' })),
      post: pt(20, 226), shift: [7, 18.5], exit: homeFrom(pt(20, 226)), approach: () => [] });
    lg.about = 'Lifeguard on Alappuzha beach. When the sea is rough I blow the whistle and call everybody out of the water.';
    const pn = addWorker(site, { job: 'vendor', plan: 'round', lookKind: 'regular', title: 'peanut seller', prop: 'basket',
      stops: [-120, -60, 0, 60, 120, 60, 0, -60].map((x) => ({ at: pt(x, 219), face: pt(x, 200), act: 'serve', dur: 8, speed: 0.8, status: '"Kappalandi! Hot roasted peanuts!"' })),
      post: pt(0, 219), shift: [15.5, 21], exit: homeFrom(pt(0, 219)), approach: () => [] });
    pn.about = 'Roasted peanuts in paper cones, ten rupees. Every evening the beach is full of families watching the sunset.';
    // the morning sweeper on the promenade
    const zs = [110, 70, 30, -10, -50, -90, -50, -10, 30, 70];
    const sw = addWorker(site, { job: 'sweeper', plan: 'round', lookKind: 'sweeper', female: true, title: 'sweeper', prop: 'broom',
      stops: zs.map((z) => ({ at: pt(KT.Geo.promenadeX(z) - 1.5, z), act: 'sweep', walk: 'sweep', speed: 0.35, dur: 8, status: 'Sweeping the promenade before the tourists come.' })),
      post: pt(KT.Geo.promenadeX(30) - 1.5, 30), shift: [6, 10], exit: homeFrom(pt(KT.Geo.promenadeX(30), 30)), approach: () => [] });
    sw.about = 'I sweep the promenade every morning, six to ten. Thank you for picking up plastic: it keeps the backwaters clean!';
  };

  // for the tests and the README
  L.count = () => L.workers.length;
  L.inShift = inShift;
})();
