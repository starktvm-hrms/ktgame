// Sign in / register screens and the player profile page.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const A = KT.Account = {};

  function setError(id, msg) {
    const el = $(id);
    el.textContent = msg || '';
    el.classList.toggle('hidden', !msg);
  }
  function busy(form, on) {
    form.querySelectorAll('button, input').forEach((el) => { el.disabled = on; });
    form.classList.toggle('busy', on);
  }
  function showTab(name) {
    document.querySelectorAll('[data-auth-tab]').forEach((b) => b.classList.toggle('sel', b.dataset.authTab === name));
    $('form-login').classList.toggle('hidden', name !== 'login');
    $('form-register').classList.toggle('hidden', name !== 'register');
    setError('login-error'); setError('register-error');
  }

  async function checkServer() {
    const el = $('server-status');
    el.className = 'server-status checking';
    el.textContent = 'Connecting to ' + KT.Net.base().replace(/^https?:\/\//, '').split('/')[0] + '…';
    try {
      const h = await KT.Net.health();
      el.className = 'server-status ok';
      el.textContent = 'Server online • ' + h.online + ' playing now • ' + h.players + ' travellers registered';
      return true;
    } catch (e) {
      el.className = 'server-status bad';
      el.textContent = 'Game server unreachable — you can still play offline as a guest.';
      return false;
    }
  }

  // Resolves with the signed-in user, or null for a guest.
  A.init = function () {
    return new Promise((resolve) => {
      A.resolve = resolve;
      document.querySelectorAll('[data-auth-tab]').forEach((b) => { b.onclick = () => showTab(b.dataset.authTab); });
      document.querySelectorAll('.pw-toggle').forEach((b) => {
        b.onclick = () => { const i = $(b.dataset.for); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Show' : 'Hide'; };
      });
      $('login-phone').value = KT.Net.lastPhone();
      $('login-remember').checked = !!KT.Net.lastPhone();
      $('form-login').onsubmit = async (e) => {
        e.preventDefault();
        setError('login-error');
        const form = $('form-login');
        busy(form, true);
        try {
          const user = await KT.Net.login({ phone: $('login-phone').value.trim(), password: $('login-password').value, remember: $('login-remember').checked });
          $('login-password').value = '';
          done(user);
        } catch (err) { setError('login-error', err.message); }
        busy(form, false);
      };
      $('form-register').onsubmit = async (e) => {
        e.preventDefault();
        setError('register-error');
        const name = $('reg-name').value.trim(), phone = $('reg-phone').value.trim(), pw = $('reg-password').value;
        if (name.length < 2) return setError('register-error', 'Please enter your name (at least 2 letters).');
        if (!/^(\+?\d[\d\s-]{8,16})$/.test(phone)) return setError('register-error', 'Please enter a valid mobile number.');
        if (pw.length < 6) return setError('register-error', 'Password must be at least 6 characters.');
        if (pw !== $('reg-password2').value) return setError('register-error', 'The two passwords do not match.');
        const form = $('form-register');
        busy(form, true);
        try {
          const user = await KT.Net.register({ name, phone, password: pw, remember: $('reg-remember').checked });
          $('reg-password').value = $('reg-password2').value = '';
          KT.UI.toast('Welcome to Kerala, ' + user.name + '!', 'info');
          done(user);
        } catch (err) { setError('register-error', err.message); }
        busy(form, false);
      };
      $('btn-guest').onclick = () => done(null);
      $('btn-server').onclick = () => {
        const url = window.prompt('Game server address (leave empty for the default online server)', KT.Net.mode() === 'node' ? KT.Net.base() : '');
        if (url === null) return;
        KT.Net.setBase(url.trim());
        checkServer();
      };
      // resume a remembered session
      const s = KT.Net.loadSession();
      if (s && s.token) {
        KT.Net.me().then(done).catch((err) => {
          if (err.status === 401) KT.Net.logout();
          show();
        });
      } else show();
    });
  };
  function show() {
    showTab(KT.Net.lastPhone() ? 'login' : 'register');
    KT.UI.show('auth');
    checkServer();
  }
  function done(user) {
    KT.UI.hide('auth');
    if (A.resolve) { const r = A.resolve; A.resolve = null; r(user); }
  }

  // ------------------------------------------------------------- profile
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
  const fmtTime = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + ' h ' + m + ' min' : m + ' min'; };

  // Open the profile page for the signed-in player (self) or another player (id).
  A.openProfile = async function (id) {
    const self = !id || (KT.Net.user && id === KT.Net.user.id);
    const page = $('profile-page');
    page.classList.toggle('self', self);
    $('pf-body').innerHTML = '<p class="muted">Loading profile…</p>';
    KT.Game.setState('profile');
    let p;
    try {
      if (self) {
        if (!KT.Net.user) {
          p = guestProfile();
        } else {
          KT.Game.save(true);
          const u = await KT.Net.me().catch(() => KT.Net.user);
          p = Object.assign({}, u, { stats: liveStats(u.stats) });
        }
      } else p = await KT.Net.profile(id);
    } catch (e) {
      $('pf-body').innerHTML = '<p class="muted">' + (e.message || 'Could not load this profile.') + '</p>';
      return;
    }
    render(p, self);
  };

  // merge the local game state so the page is never behind the server
  function liveStats(st) {
    const d = KT.Game.data;
    if (!d) return st;
    return Object.assign({}, st, {
      level: d.level, xp: d.xp, coins: d.coins, stars: d.stars.length, leaves: d.leaves,
      districts: d.districts || [], distanceKm: Math.round(d.distanceKm || 0), playTime: Math.round(d.playTime || 0),
      photos: d.photos.length, missions: d.mission,
      fish: (d.fish && d.fish.total) || 0, vehicles: (d.vehicles || []).length
    });
  }
  function guestProfile() {
    return { id: 0, name: (KT.Game.data && KT.Game.data.name) || 'Guest', memberSince: null, guest: true, character: KT.Game.cfg, stats: liveStats({}) };
  }

  function render(p, self) {
    const st = p.stats || {};
    const portrait = KT.Preview.portraitFor(p.character || { gender: 'male', outfit: 'casual', hair: 'default', acc: {} });
    const districts = KT.DISTRICTS.map((d) => {
      const on = (st.districts || []).indexOf(d.id) >= 0;
      return '<li class="' + (on ? 'on' : '') + '" title="' + d.name + '"><span class="dot">' + (on ? '✓' : '') + '</span><span class="nm">' + d.name + '</span></li>';
    }).join('');
    const xpNeed = KT.Game.xpForLevel(st.level || 1);
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    $('pf-body').innerHTML = [
      '<div class="pf-head">',
      '<img class="pf-portrait" src="' + portrait + '" alt="">',
      '<div class="pf-id">',
      '<h2 id="pf-name">' + esc(p.name) + '</h2>',
      self && !p.guest ? '<button class="btn small" id="pf-edit-name">Edit name</button>' : '',
      '<div class="pf-meta">',
      p.guest ? 'Guest explorer — progress saved on this device only' : 'Member since ' + fmtDate(p.memberSince),
      self && p.phone ? ' • ' + esc(p.phone) : '',
      '</div>',
      '<div class="pf-level"><span>Level ' + (st.level || 1) + '</span><div class="xp"><div style="width:' + Math.round(((st.xp || 0) / xpNeed) * 100) + '%"></div></div></div>',
      '</div></div>',
      '<div class="pf-stats">',
      stat('\u{1FA99}', st.coins || 0, 'Coins'), stat('⭐', (st.stars || 0) + '/' + KT.World.LANDMARKS.length, 'Places'),
      stat('\u{1F343}', st.leaves || 0, 'Eco leaves'), stat('\u{1F68C}', (st.distanceKm || 0) + ' km', 'On the road'),
      stat('\u{1F4F7}', st.photos || 0, 'Wildlife photos'), stat('⏱️', fmtTime(st.playTime), 'Time exploring'),
      stat('\u{1F41F}', st.fish || 0, 'Fish caught'), stat('\u{1F6B2}', (st.vehicles || 0) + '/4', 'Vehicles unlocked'), stat('\u{1F3C6}', 'Level ' + (st.level || 1), 'Traveller level'),
      '</div>',
      '<h3>Districts visited — ' + (st.districts || []).length + ' of 14</h3>',
      '<ul class="pf-districts">' + districts + '</ul>',
      self ? '<div class="modal-buttons">' + (p.guest ? '<button class="btn primary" id="pf-signin">Sign in / Register</button>' : '<button class="btn" id="pf-look">Change appearance</button><button class="btn danger" id="pf-logout">Log out</button>') + '</div>' : ''
    ].join('');
    function stat(icon, val, label) { return '<div class="pf-stat"><span class="ic">' + icon + '</span><b>' + esc(val) + '</b><small>' + label + '</small></div>'; }
    if (!self) return;
    const en = $('pf-edit-name');
    if (en) en.onclick = () => {
      const name = window.prompt('Your name', p.name);
      if (!name || name.trim() === p.name) return;
      KT.Net.updateMe({ name: name.trim() }).then((u) => {
        $('pf-name').textContent = u.name;
        KT.Game.data.name = u.name;
        KT.UI.updateStats(KT.Game.data);
        KT.UI.toast('Name updated.');
      }).catch((e) => KT.UI.toast(e.message));
    };
    const lo = $('pf-logout');
    if (lo) lo.onclick = () => { KT.Game.save(true); KT.Net.flushProgress(true); setTimeout(() => { KT.Net.logout(); location.reload(); }, 300); };
    const lk = $('pf-look');
    if (lk) lk.onclick = () => KT.Game.openCreator(true);
    const si = $('pf-signin');
    if (si) si.onclick = () => { KT.Game.save(); location.reload(); };
  }

  // Players nearby (O): view their profiles.
  A.openPlayers = function () {
    const list = KT.Net.nearby(KT.Player.pos);
    const el = $('players-list');
    if (!KT.Net.token) el.innerHTML = '<p class="muted">Sign in to see other travellers exploring Kerala with you.</p>';
    else if (!KT.Net.connected) el.innerHTML = '<p class="muted">Connecting to the game server…</p>';
    else if (!list.length) el.innerHTML = '<p class="muted">No other travellers nearby right now. ' + KT.Net.online + ' online across Kerala.</p>';
    else {
      el.innerHTML = '';
      list.slice(0, 40).forEach((p) => {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = '<span>' + (p.inBus ? '\u{1F68C} ' : '\u{1F9CD} ') + '<b></b></span><small>' + Math.round(p.dist) + ' m</small>';
        row.querySelector('b').textContent = p.name;
        const btn = document.createElement('button');
        btn.className = 'btn small';
        btn.textContent = 'Profile';
        btn.onclick = () => A.openProfile(p.id);
        row.appendChild(btn);
        el.appendChild(row);
      });
    }
    $('players-online').textContent = KT.Net.connected ? KT.Net.online + ' online' : 'offline';
    KT.Game.setState('players');
  };
})();
