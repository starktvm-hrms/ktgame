// Mission chain: a guided tour of Kerala's highlights.
(function () {
  'use strict';
  const Geo = KT.Geo;
  const Ms = KT.Missions = {};

  Ms.LIST = [
    { id: 'welcome', title: 'Welcome to God’s Own Country', desc: 'Talk to Anjali at the Tourist Information kiosk.', type: 'talk', npc: 'guide', reward: { coins: 20, xp: 40 } },
    { id: 'clean', title: 'Clean the Backwaters', desc: 'Help remove plastic waste and protect Kerala’s waterways.', type: 'collect', group: 'backwater', count: 5, reward: { coins: 50, xp: 80 } },
    { id: 'nets', title: 'Cheena Vala', desc: 'Walk south along the promenade to the Chinese fishing nets and meet Joseph.', type: 'talk', npc: 'fisher', reward: { coins: 30, xp: 50 } },
    { id: 'canoe', title: 'Row the Backwaters', desc: 'Take the canoe at the end of the houseboat jetty and paddle to Pathiramanal Island.', type: 'island', reward: { coins: 60, xp: 90 } },
    { id: 'kathakali', title: 'Kathakali Evening', desc: 'Watch the Kathakali performance at the village stage.', type: 'watch', time: 8, reward: { coins: 40, xp: 60 } },
    { id: 'pooram', title: 'Pooram Festival', desc: 'Visit the temple elephants and greet them with a Namaskaram (press N).', type: 'gesture', gesture: 'namaskaram', x: -130, z: -88, r: 16, reward: { coins: 50, xp: 80 } },
    { id: 'munnar', title: 'Tea Trails of Munnar', desc: 'Hike up through the tea estates and climb the viewpoint tower.', type: 'climb', reward: { coins: 60, xp: 100 } },
    { id: 'periyar', title: 'Wildlife of Periyar', desc: 'Photograph a peacock, a deer and an elephant (press C for camera).', type: 'photo', kinds: ['peacock', 'deer', 'elephant'], reward: { coins: 80, xp: 120 } },
    { id: 'kovalam', title: 'Sunset at Kovalam', desc: 'Travel south to Kovalam beach and reach the lighthouse.', type: 'reach', x: 118, z: 238, r: 10, reward: { coins: 50, xp: 80 } },
    { id: 'beach', title: 'Eco Hero', desc: 'Clean up Kovalam beach: collect plastic waste from the sand.', type: 'collect', group: 'beach', count: 5, reward: { coins: 100, xp: 150 } }
  ];

  Ms.current = function () {
    return Ms.LIST[KT.Game.data.mission] || null;
  };

  Ms.progressInfo = function () {
    const m = Ms.current();
    const d = KT.Game.data;
    if (!m) return { done: 1, total: 1 };
    if (m.type === 'collect') {
      const n = KT.Entities.plastics.filter((p) => p.group === m.group && p.taken).length;
      return { done: Math.min(n, m.count), total: m.count };
    }
    if (m.type === 'photo') return { done: m.kinds.filter((k) => d.photos.indexOf(k) >= 0).length, total: m.kinds.length };
    if (m.type === 'watch') return { done: Math.min(m.time, Math.floor(d.mprog || 0)), total: m.time };
    return { done: 0, total: 1 };
  };

  function npcPos(id) {
    const n = KT.Entities.npcs.find((w) => w.id === id);
    return n ? n.obj.position : null;
  }

  // Where should the compass / beacon point?
  Ms.target = function () {
    const m = Ms.current();
    if (!m) return null;
    const P = KT.Player;
    switch (m.type) {
      case 'talk': return npcPos(m.npc);
      case 'collect': {
        let best = null, bd = 1e9;
        KT.Entities.plastics.forEach((p) => {
          if (p.taken || p.group !== m.group) return;
          const d = p.obj.position.distanceTo(P.pos);
          if (d < bd) { bd = d; best = p.obj.position; }
        });
        return best;
      }
      case 'island':
        return P.mode === 'canoe' ? KT.World.islandJetty : KT.Entities.canoe.obj.position;
      case 'watch': {
        const s = KT.Entities.stage;
        return { x: s.x - 9, y: 0, z: s.z };
      }
      case 'gesture': return { x: m.x, y: 0, z: m.z };
      case 'climb': {
        const t = KT.World.sites.watchTower[0];
        return { x: t.x, y: 0, z: t.z };
      }
      case 'photo': {
        // nearest wanted animal
        let best = null, bd = 1e9;
        KT.Entities.photoTargets.forEach((w) => {
          if (m.kinds.indexOf(w.kind) < 0 || KT.Game.data.photos.indexOf(w.kind) >= 0) return;
          if (w.kind === 'elephant' && w.static) return;
          const d = w.obj.position.distanceTo(P.pos);
          if (d < bd) { bd = d; best = w.obj.position; }
        });
        return best || { x: -240, y: 0, z: 40 };
      }
      case 'reach': return { x: m.x, y: 0, z: m.z };
      default: return null;
    }
  };

  // Called every frame with the player.
  Ms.update = function (dt) {
    const m = Ms.current();
    if (!m) return;
    const P = KT.Player, d = KT.Game.data;
    switch (m.type) {
      case 'collect': {
        const p = Ms.progressInfo();
        if (p.done >= p.total) Ms.complete();
        break;
      }
      case 'island': {
        const isl = Geo.ISLANDS[0];
        if (Math.hypot(P.pos.x - isl.x, P.pos.z - isl.z) < isl.r + 14) Ms.complete();
        break;
      }
      case 'watch': {
        const s = KT.Entities.stage;
        const dist = Math.hypot(P.pos.x - s.x, P.pos.z - s.z);
        if (dist < 16) {
          const before = Math.floor(d.mprog || 0);
          d.mprog = (d.mprog || 0) + dt;
          if (Math.floor(d.mprog) !== before) KT.UI.updateMission(m);
          if (d.mprog >= m.time) Ms.complete();
        }
        break;
      }
      case 'climb': {
        const t = KT.World.sites.watchTower[0];
        if (Math.hypot(P.pos.x - t.x, P.pos.z - t.z) < 3 && P.pos.y > KT.Geo.height(t.x, t.z) + 5) Ms.complete();
        break;
      }
      case 'photo': {
        if (m.kinds.every((k) => d.photos.indexOf(k) >= 0)) Ms.complete();
        break;
      }
      case 'reach':
        if (Math.hypot(P.pos.x - m.x, P.pos.z - m.z) < m.r) Ms.complete();
        break;
      default: break;
    }
  };

  Ms.onTalk = function (npcId) {
    const m = Ms.current();
    if (m && m.type === 'talk' && m.npc === npcId) Ms.complete();
  };
  Ms.onGesture = function (name) {
    const m = Ms.current();
    const P = KT.Player;
    if (m && m.type === 'gesture' && m.gesture === name && Math.hypot(P.pos.x - m.x, P.pos.z - m.z) < m.r) {
      setTimeout(() => Ms.complete(), 1200);
    }
  };

  Ms.complete = function () {
    const m = Ms.current();
    if (!m || Ms._completing) return;
    Ms._completing = true;
    const d = KT.Game.data;
    d.mission++;
    d.mprog = 0;
    KT.Game.addCoins(m.reward.coins || 0, true);
    KT.Game.addXP(m.reward.xp || 0);
    KT.Audio.play('mission');
    KT.UI.banner('Mission Complete!', m.title + '  •  +' + (m.reward.coins || 0) + ' coins', 'mission');
    const next = Ms.current();
    setTimeout(() => {
      KT.UI.updateMission(next);
      if (next) KT.UI.toast('New mission: ' + next.title, 'info');
      else KT.Game.finale();
      Ms._completing = false;
    }, 1500);
    KT.Game.save();
  };
})();
