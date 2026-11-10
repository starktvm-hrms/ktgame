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
  const inShift = (h, sh) => (sh[0] <= sh[1] ? h >= sh[0] && h < sh[1] : h >= sh[0] || h < sh[1]);
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
    KT.Highway.interactables.push({
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
  const _ground = (x, z) => KT.Highway.groundY(x, z).y;
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
      if (w.where !== 'work' && w.plan !== 'guide' && w.plan !== 'sweep' && w.plan !== 'shopper') { w.queue.push(go([w.post])); w.where = 'work'; }
      else { w.where = 'work'; PLANS[w.plan](w); }
    }
    w.task = w.queue.shift() || { type: 'off', dur: 5 };
  }

  L.update = function (dt, player) {
    const pp = player.pos, h = hours();
    for (let i = 0; i < L.workers.length; i++) {
      const w = L.workers[i], g = w.hub.group;
      if (!g || !g.visible) { if (w.obj) w.obj.visible = false; continue; }
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
      o.position.set(w.x, w.y !== undefined ? w.y : _ground(w.x, w.z), w.z);
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
          const gy = _ground(w.x, w.z);
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

  // for the tests and the README
  L.count = () => L.workers.length;
  L.inShift = inShift;
})();
