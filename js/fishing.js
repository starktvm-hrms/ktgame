// Fishing at the Chinese nets of Kochi (Ernakulam): cast the net, wait
// for the fish, then haul it in at the right moment. Each catch is worth
// coins. Fish also jump in the lagoon now and then.
(function () {
  'use strict';
  const T = THREE;
  const $ = (id) => document.getElementById(id);
  const F = KT.Fishing = { spots: [], active: null };

  F.FISH = [
    { id: 'mathi', name: 'Mathi (sardine)', ml: 'മത്തി', coins: 4, w: 30, color: 0x9fb4c4, size: 0.6 },
    { id: 'ayala', name: 'Ayala (mackerel)', ml: 'അയല', coins: 6, w: 24, color: 0x5f8aa0, size: 0.75 },
    { id: 'chemmeen', name: 'Chemmeen (prawns)', ml: 'ചെമ്മീൻ', coins: 8, w: 18, color: 0xf0a080, size: 0.55, prawn: true },
    { id: 'koonthal', name: 'Koonthal (squid)', ml: 'കൂന്തൽ', coins: 10, w: 12, color: 0xe8d8d0, size: 0.75, squid: true },
    { id: 'karimeen', name: 'Karimeen (pearl spot)', ml: 'കരിമീൻ', coins: 14, w: 12, color: 0x5a6a52, size: 0.7 },
    { id: 'neymeen', name: 'Neymeen (seer fish)', ml: 'നെയ്മീൻ', coins: 25, w: 4, color: 0xb8c8d0, size: 1.1 }
  ];
  function pickFish() {
    let r = Math.random() * F.FISH.reduce((a, f) => a + f.w, 0);
    for (let i = 0; i < F.FISH.length; i++) { r -= F.FISH[i].w; if (r <= 0) return F.FISH[i]; }
    return F.FISH[0];
  }

  // Called by the highway when the Ernakulam centre is built.
  F.addSpot = function (stand, target, waterY) {
    const spot = { stand, target, waterY };
    F.spots.push(spot);
    return {
      label: 'Cast the fishing net', radius: 2.4, pos: () => stand,
      enabled: () => KT.Player.mode === 'foot',
      action: () => F.start(spot)
    };
  };

  // --------------------------------------------------------------- panel
  function panel(title, hint, bar) {
    $('fishing').classList.remove('hidden');
    $('fish-title').textContent = title;
    $('fish-hint').textContent = hint || '';
    $('fish-bar').classList.toggle('hidden', !bar);
    $('fish-haul').classList.toggle('hidden', !bar);
  }
  function hidePanel() { $('fishing').classList.add('hidden'); }

  // --------------------------------------------------------------- start
  F.start = function (spot) {
    if (F.active || KT.Player.mode !== 'foot') return;
    const P = KT.Player;
    P.heading = Math.atan2(spot.target.x - P.pos.x, spot.target.z - P.pos.z);
    P.obj.rotation.y = P.heading;
    P.speed = 0; P.gesture = null;
    const net = KT.Models.castNet();
    net.scale.setScalar(0.25);
    KT.Game.scene.add(net);
    F.active = { spot, phase: 'cast', t: 0, net, wait: 1.8 + Math.random() * 2, from: new T.Vector3(), catch: [] };
    KT.Game.setState('fishing');
    panel('Casting the net…', 'Esc to stop fishing');
    KT.Audio.play('jump');
  };

  F.cancel = function () {
    const a = F.active;
    if (!a) return;
    if (a.net.parent) a.net.parent.remove(a.net);
    (a.shown || []).forEach((o) => o.parent && o.parent.remove(o));
    F.active = null;
    hidePanel();
    KT.Game.setState('playing');
  };

  const _v = new T.Vector3();
  function handPos(out) {
    const P = KT.Player;
    return out.set(P.pos.x + Math.sin(P.heading) * 0.5, P.pos.y + 1.5, P.pos.z + Math.cos(P.heading) * 0.5);
  }

  // Runs every frame while the game is in the 'fishing' state.
  F.update = function (dt, input) {
    const a = F.active;
    if (!a) return;
    const P = KT.Player, net = a.net, tgt = a.spot.target;
    a.t += dt;
    if (input.consume('pause')) { KT.UI.toast('You put the net away.'); F.cancel(); return; }
    let pose = 'idle';
    switch (a.phase) {
      case 'cast': {
        pose = 'cast';
        if (a.t < 0.45) { handPos(net.position); break; }
        const k = Math.min(1, (a.t - 0.45) / 0.9);
        handPos(a.from);
        net.position.lerpVectors(a.from, _v.set(tgt.x, a.spot.waterY + 0.05, tgt.z), k);
        net.position.y += Math.sin(k * Math.PI) * 3.2;
        net.scale.setScalar(0.25 + k * 1.35);
        net.rotation.y += dt * 4;
        if (k >= 1) {
          a.phase = 'wait'; a.t = 0;
          KT.Audio.play('splash2');
          a.ring = new T.Mesh(new T.RingGeometry(0.6, 0.8, 32), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
          a.ring.rotation.x = -Math.PI / 2;
          a.ring.position.set(tgt.x, a.spot.waterY + 0.04, tgt.z);
          KT.Game.scene.add(a.ring);
          panel('Waiting for the fish…', 'The net is sinking. Get ready to haul it in!');
        }
        break;
      }
      case 'wait': {
        net.position.y = a.spot.waterY + 0.05 - Math.min(0.7, a.t * 0.4);
        if (a.ring) { a.ring.scale.setScalar(1 + a.t * 2); a.ring.material.opacity = Math.max(0, 0.7 - a.t * 0.5); }
        if (a.t > a.wait) {
          a.phase = 'bite'; a.t = 0;
          a.zone = 0.25 + Math.random() * 0.5; a.zoneW = 0.2;
          a.speed = 2.6 + Math.random() * 1.6;
          $('fish-zone').style.left = ((a.zone - a.zoneW / 2) * 100) + '%';
          $('fish-zone').style.width = (a.zoneW * 100) + '%';
          panel('Fish in the net! Haul it in now!', (KT.Input.touch ? 'Tap Haul' : 'Press E or Space') + ' when the marker is in the green zone', true);
          KT.Audio.play('pickup');
        }
        break;
      }
      case 'bite': {
        const m = 0.5 + 0.5 * Math.sin(a.t * a.speed);
        a.marker = m;
        $('fish-marker').style.left = (m * 100) + '%';
        net.position.y = a.spot.waterY - 0.6 + Math.sin(a.t * 18) * 0.05; // the catch is struggling
        const haul = input.consume('interact') || input.consume('jump') || input.consume('confirm') || F.hauled;
        F.hauled = false;
        if (haul || a.t > 6) {
          const off = Math.abs(m - a.zone);
          a.success = haul && off < a.zoneW / 2;
          a.quality = a.success ? 1 - off / (a.zoneW / 2) : 0;
          a.phase = 'haul'; a.t = 0;
          a.from.copy(net.position);
          panel(a.success ? 'Hauling in the catch…' : 'Too ' + (haul ? (m < a.zone ? 'early' : 'late') : 'slow') + '!', '');
          if (a.success) {
            const n = 1 + Math.floor(Math.random() * 3) + (a.quality > 0.65 ? 1 : 0);
            for (let i = 0; i < n; i++) a.catch.push(pickFish());
            // show the fish in the net as it comes in
            a.shown = a.catch.map((f, i) => {
              const o = KT.Models.fish(f);
              o.position.set(Math.cos(i * 2.1) * 0.35, 0.15, Math.sin(i * 2.1) * 0.35);
              o.rotation.y = i * 1.3;
              net.add(o);
              return o;
            });
          }
          KT.Audio.play('splash2');
        }
        break;
      }
      case 'haul': {
        pose = 'haul';
        const k = Math.min(1, a.t / 1.1);
        handPos(_v);
        _v.y -= 0.6;
        net.position.lerpVectors(a.from, _v, k);
        net.position.y += Math.sin(k * Math.PI) * 1.2;
        net.scale.setScalar(1.6 - k * 1.25);
        (a.shown || []).forEach((o, i) => { o.rotation.z = Math.sin(a.t * 20 + i) * 0.5; });
        if (k >= 1) finish(a);
        break;
      }
      default: break;
    }
    KT.Models.animateCharacter(P.obj, pose, dt);
    if (a.ring && a.phase !== 'wait' && a.phase !== 'bite') { KT.Game.scene.remove(a.ring); a.ring = null; }
  };

  function finish(a) {
    const d = KT.Game.data;
    if (a.success && a.catch.length) {
      const counts = {};
      let coins = 0;
      a.catch.forEach((f) => { counts[f.id] = (counts[f.id] || 0) + 1; coins += f.coins; });
      d.fish = d.fish || { total: 0, kinds: {} };
      d.fish.total += a.catch.length;
      Object.keys(counts).forEach((k) => { d.fish.kinds[k] = (d.fish.kinds[k] || 0) + counts[k]; });
      const list = Object.keys(counts).map((k) => { const f = F.FISH.find((x) => x.id === k); return counts[k] + '× ' + f.name + ' (' + f.ml + ')'; });
      KT.UI.toast('🐟 Caught ' + list.join(', ') + ' • +' + coins + ' coins', 'star');
      KT.Game.addXP(3 * a.catch.length);
      KT.Game.addCoins(coins);
      if (a.catch.some((f) => f.id === 'neymeen')) KT.UI.banner('Neymeen!', 'A big seer fish, the king of the Kerala fish curry', 'star');
    } else {
      KT.UI.toast(a.success === false ? 'The fish slipped out of the net. Cast again!' : 'Empty net. Cast again!');
    }
    if (a.net.parent) a.net.parent.remove(a.net);
    F.active = null;
    hidePanel();
    KT.Game.setState('playing');
    KT.Game.save();
  }

  // ------------------------------------------------- fish jumping (ambient)
  const jumpers = [];
  let jumpT = 2;
  F.ambient = function (dt, lagoon, playerPos) {
    if (!lagoon || Math.hypot(lagoon.x - playerPos.x, lagoon.z - playerPos.z) > 140) return;
    jumpT -= dt;
    if (jumpT <= 0) {
      jumpT = 1.2 + Math.random() * 3;
      const kind = F.FISH[Math.floor(Math.random() * 3)];
      const o = KT.Models.fish(kind);
      const a = Math.random() * Math.PI * 2, r = Math.random() * (lagoon.r - 6);
      const x = lagoon.x + Math.cos(a) * r, z = lagoon.z + Math.sin(a) * r;
      o.rotation.y = Math.random() * Math.PI * 2;
      KT.Game.scene.add(o);
      jumpers.push({ o, x, z, t: 0, dir: o.rotation.y, y0: lagoon.y });
      if (Math.hypot(x - playerPos.x, z - playerPos.z) < 25) KT.Audio.play('splash');
    }
    for (let i = jumpers.length - 1; i >= 0; i--) {
      const j = jumpers[i];
      j.t += dt;
      const k = j.t / 0.8;
      if (k >= 1) { j.o.parent && j.o.parent.remove(j.o); jumpers.splice(i, 1); continue; }
      j.o.position.set(j.x + Math.sin(j.dir) * k * 1.6, j.y0 - 0.2 + Math.sin(k * Math.PI) * 1.2, j.z + Math.cos(j.dir) * k * 1.6);
      j.o.rotation.x = (k - 0.5) * 2.2;
    }
  };

  F.bindUI = function () {
    $('fish-haul').addEventListener('click', () => { F.hauled = true; });
  };
})();
