// Groups: public and private groups, invitations, group chat, live member
// locations ("play together") and the in-game chat dock.
//
// Online (Supabase) each group has a Realtime channel named after a secret
// key that only members receive. Chat messages are saved through the API
// and announced on the channel, members share where they are every few
// seconds, and the voice chat (voice.js) signals over the same channel.
// With the Node server, chat is fetched by polling instead.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const G = KT.Groups = { groups: [], invites: [], messages: {}, presence: {}, active: null, view: null, tab: 'mine' };
  const POS_EVERY = 6, PRESENCE_TTL = 25000, MAX_CHANNELS = 12;
  const channels = new Map(); // groupId -> {ch, key}
  let userCh = null, pollT = 0, posT = 0, msgPollT = 0, started = false;

  // ------------------------------------------------------------ helpers
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function button(text, cls, fn) { const b = el('button', 'btn ' + (cls || ''), text); b.onclick = fn; return b; }
  const me = () => KT.Net.user;
  const online = () => !!(KT.Net.token && me());
  const live = () => !!KT.Net.realtime && KT.Net.mode() === 'supabase';
  const time = (iso) => { try { return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  function store(k, v) { try { localStorage.setItem('kt-' + k + '-' + me().id, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function load(k, d) { try { const v = JSON.parse(localStorage.getItem('kt-' + k + '-' + me().id)); return v === null ? d : v; } catch (e) { return d; } }
  const lastRead = () => load('read', {});
  function markRead(gid) {
    const msgs = G.messages[gid] || [];
    const g = G.groups.find((x) => x.id === gid);
    const top = Math.max(msgs.length ? msgs[msgs.length - 1].id : 0, g ? g.lastMessageId : 0);
    const r = lastRead(); r[gid] = top; store('read', r);
  }
  G.unread = function (g) { return (g.lastMessageId || 0) > (lastRead()[g.id] || 0); };
  function where(p) {
    if (p.l === 2) return 'Kovalam lighthouse';
    if (p.l === 1) {
      const st = KT.Highway.status({ x: p.x, z: p.z });
      return 'Highway near ' + KT.DISTRICTS[st.nearest].name;
    }
    return KT.World.zoneAt ? KT.World.zoneAt(p.x, p.z) : 'Backwaters';
  }

  // ----------------------------------------------------------- start-up
  G.start = function () {
    if (started || !online()) return;
    started = true;
    G.active = load('active', null);
    G.refresh();
    if (live()) {
      // invitations arrive instantly on a personal channel
      userCh = KT.Net.realtime().channel('kt-usr-' + me().id, { config: { broadcast: { self: false } } });
      userCh.on('broadcast', { event: 'invite' }, () => G.loadInvites(true)).subscribe();
    }
    updateBadges();
    updateDock();
  };

  G.refresh = async function () {
    if (!online()) return;
    try {
      const r = await KT.Net.api('GET', '/api/groups');
      G.groups = r.groups;
      if (G.active && !G.groups.find((g) => g.id === G.active)) G.active = null;
      if (!G.active && G.groups.length) G.active = G.groups[0].id;
      store('active', G.active);
      syncChannels();
      if (G.active && !G.messages[G.active]) await loadMessages(G.active);
    } catch (e) { /* offline: try again later */ }
    await G.loadInvites(false);
    updateBadges();
    updateDock();
    // redraw lists only: never wipe a form or chat box the player is typing in
    if (KT.Game.state === 'groups' && !G.view && (G.tab === 'mine' || G.tab === 'invites')) render();
  };

  G.loadInvites = async function (announce) {
    try {
      const before = new Set(G.invites.map((i) => i.id));
      G.invites = (await KT.Net.api('GET', '/api/invites')).invites;
      G.invites.forEach((i) => {
        if (!before.has(i.id) && (announce || before.size || G._invitesLoaded)) KT.UI.toast('\u{1F4E8} @' + (i.from && i.from.username) + ' invited you to “' + i.group.name + '”. Press T to answer.', 'info');
      });
      G._invitesLoaded = true;
      updateBadges();
      if (KT.Game.state === 'groups' && G.tab === 'invites' && !G.view) render();
    } catch (e) { /* ignore */ }
  };

  async function loadMessages(gid, after) {
    const r = await KT.Net.api('GET', '/api/groups/' + gid + '/messages' + (after ? '?after=' + after : ''));
    const list = G.messages[gid] = after ? (G.messages[gid] || []).concat(r.messages.filter((m) => !(G.messages[gid] || []).some((x) => x.id === m.id))) : r.messages;
    if (list.length > 200) list.splice(0, list.length - 200);
    const g = G.groups.find((x) => x.id === gid);
    if (g && list.length) g.lastMessageId = Math.max(g.lastMessageId || 0, list[list.length - 1].id);
    return r.messages;
  }

  // ------------------------------------------------- realtime (Supabase)
  function syncChannels() {
    if (!live()) return;
    const sb = KT.Net.realtime();
    const want = new Map();
    G.groups.slice(0, MAX_CHANNELS).forEach((g) => { if (g.channel) want.set(g.id, g.channel); });
    channels.forEach((c, gid) => { if (want.get(gid) !== c.key) { sb.removeChannel(c.ch); channels.delete(gid); } });
    want.forEach((key, gid) => {
      if (channels.has(gid)) return;
      const ch = sb.channel('kt-grp-' + key, { config: { broadcast: { self: false } } });
      ch.on('broadcast', { event: 'msg' }, (m) => onMessage(gid, m.payload))
        .on('broadcast', { event: 'pos' }, (m) => onPos(gid, m.payload))
        .on('broadcast', { event: 'v' }, (m) => { if (KT.Voice) KT.Voice.onSignal(gid, m.payload); })
        .subscribe((status) => { if (status === 'SUBSCRIBED' && gid === G.active) sendPos(true); });
      channels.set(gid, { ch, key });
    });
  }
  G.channel = (gid) => (channels.get(gid) || {}).ch || null;
  G.send = function (gid, event, payload) {
    const c = channels.get(gid);
    if (c && c.ch.state === 'joined') c.ch.send({ type: 'broadcast', event, payload });
  };

  function onMessage(gid, m) {
    if (!m || typeof m.text !== 'string' || !m.id) return;
    const list = G.messages[gid] = G.messages[gid] || [];
    if (list.some((x) => x.id === m.id)) return;
    list.push({ id: Number(m.id), userId: Number(m.userId), name: String(m.name || '').slice(0, 24), username: String(m.username || '').slice(0, 20), text: m.text.slice(0, 300), at: m.at });
    const g = G.groups.find((x) => x.id === gid);
    if (g) g.lastMessageId = Math.max(g.lastMessageId || 0, Number(m.id));
    if (G.view === gid && KT.Game.state === 'groups') { renderChat(); markRead(gid); }
    else if (gid !== G.active) KT.UI.toast('\u{1F4AC} ' + (g ? g.name : 'Group') + ' • ' + m.name + ': ' + m.text.slice(0, 60));
    updateBadges();
    updateDock();
  }
  function onPos(gid, p) {
    if (!p || !p.i || p.i === me().id || typeof p.x !== 'number' || typeof p.z !== 'number') return;
    const pr = G.presence[gid] = G.presence[gid] || new Map();
    pr.set(p.i, { i: p.i, n: String(p.n || '').slice(0, 24), u: String(p.u || '').slice(0, 20), l: p.l | 0, x: p.x, z: p.z, v: !!p.v, at: Date.now() });
    if (G.view === gid && KT.Game.state === 'groups') renderMembers();
  }
  function sendPos(force) {
    if (!live() || !KT.Game.data) return;
    const P = KT.Player;
    const o = P.mode === 'bus' && P.bus ? P.bus.obj.position : P.pos;
    const code = KT.L === KT.Highway ? 1 : KT.L === KT.Lighthouse ? 2 : 0;
    G.groups.slice(0, MAX_CHANNELS).forEach((g) => G.send(g.id, 'pos', { i: me().id, n: me().name, u: me().username, l: code, x: Math.round(o.x * 10) / 10, z: Math.round(o.z * 10) / 10, v: !!(KT.Voice && KT.Voice.gid === g.id) }));
  }
  // live members of a group (excluding me)
  G.onlineMembers = function (gid) {
    const pr = G.presence[gid];
    const out = [];
    if (pr) pr.forEach((p, id) => { if (Date.now() - p.at < PRESENCE_TTL) out.push(p); else pr.delete(id); });
    return out;
  };
  // markers for the maps: online members of the active group in this level
  G.mapMarkers = function () {
    if (!G.active) return [];
    const code = KT.L === KT.Highway ? 1 : KT.L === KT.Lighthouse ? 2 : 0;
    return G.onlineMembers(G.active).filter((p) => p.l === code);
  };

  // ------------------------------------------------------------- update
  G.update = function (dt) {
    if (!started) { if (online() && KT.Game.data) G.start(); return; }
    pollT -= dt; posT -= dt; msgPollT -= dt;
    if (pollT <= 0) { pollT = live() ? 60 : 25; G.refresh(); }
    if (posT <= 0) { posT = POS_EVERY; sendPos(); }
    // the Node server has no realtime channel: poll the open chat
    if (!live() && msgPollT <= 0) {
      msgPollT = 4;
      const gid = KT.Game.state === 'groups' && G.view ? G.view : G.active;
      if (gid) {
        const list = G.messages[gid] || [];
        loadMessages(gid, list.length ? list[list.length - 1].id : 0).then((fresh) => {
          if (!fresh.length) return;
          if (G.view === gid && KT.Game.state === 'groups') { renderChat(); markRead(gid); }
          updateBadges(); updateDock();
        }).catch(() => {});
      }
    }
  };

  // ------------------------------------------------------------- badges
  function updateBadges() {
    const unread = G.groups.filter((g) => G.unread(g) && !(G.view === g.id && KT.Game.state === 'groups')).length;
    const n = unread + G.invites.length;
    const b = $('groups-badge');
    b.textContent = n ? String(n) : '';
    b.classList.toggle('hidden', !n);
    const ic = $('invite-count');
    if (ic) { ic.textContent = G.invites.length || ''; ic.classList.toggle('hidden', !G.invites.length); }
  }

  // ---------------------------------------------------------- chat dock
  // A small chat box in the corner for the active group: Enter to talk.
  function updateDock() {
    const dock = $('chat-dock');
    const g = G.groups.find((x) => x.id === G.active);
    dock.classList.toggle('hidden', !g || !KT.Game.data);
    if (!g) return;
    $('dock-group').textContent = (g.visibility === 'private' ? '\u{1F512} ' : '\u{1F310} ') + g.name;
    const box = $('dock-messages');
    box.innerHTML = '';
    (G.messages[g.id] || []).slice(-5).forEach((m) => {
      const line = el('div', 'dock-line');
      line.appendChild(el('b', '', (m.userId === me().id ? 'You' : m.name) + ': '));
      line.appendChild(document.createTextNode(m.text));
      box.appendChild(line);
    });
    $('dock-voice').classList.toggle('on', !!(KT.Voice && KT.Voice.gid === g.id));
  }
  G.updateDock = updateDock;
  G.focusDock = function () {
    if (!G.active) { KT.UI.toast('Join or create a group first (press T).'); return false; }
    $('chat-dock').classList.add('typing');
    $('dock-input').focus();
    return true;
  };
  function dockSend() {
    const text = $('dock-input').value.trim();
    $('dock-input').value = '';
    $('dock-input').blur();
    $('chat-dock').classList.remove('typing');
    if (text && G.active) G.sendMessage(G.active, text);
  }

  G.sendMessage = async function (gid, text) {
    try {
      const r = await KT.Net.api('POST', '/api/groups/' + gid + '/messages', { text });
      G.send(gid, 'msg', r.message);
      onMessage(gid, r.message);
      markRead(gid);
      updateBadges();
    } catch (e) { KT.UI.toast(e.message || 'Message not sent.'); }
  };

  // ------------------------------------------------------- groups screen
  G.open = function (tab) {
    if (!online()) { KT.UI.toast('Sign in to create and join groups with other travellers.'); return; }
    G.start();
    if (tab) { G.tab = tab; G.view = null; }
    KT.Game.setState('groups');
    render();
    G.refresh();
  };
  G.close = function () { G.view = null; KT.Game.setState('playing'); updateBadges(); };

  function render() {
    document.querySelectorAll('[data-gtab]').forEach((b) => b.classList.toggle('sel', !G.view && b.dataset.gtab === G.tab));
    const body = $('groups-body');
    body.innerHTML = '';
    if (G.view) return renderGroup(body, G.view);
    if (G.tab === 'mine') renderMine(body);
    else if (G.tab === 'discover') renderDiscover(body);
    else if (G.tab === 'invites') renderInvites(body);
    else renderCreate(body);
    updateBadges();
  }

  function renderMine(body) {
    if (!G.groups.length) {
      body.appendChild(el('p', 'muted', 'You are not in any group yet. Create one, or discover public groups to join.'));
      body.appendChild(button('Create a group', 'primary', () => { G.tab = 'create'; render(); }));
      return;
    }
    G.groups.forEach((g) => {
      const row = el('div', 'group-row');
      const left = el('div', 'g-main');
      left.appendChild(el('b', '', (g.visibility === 'private' ? '\u{1F512} ' : '\u{1F310} ') + g.name));
      const playing = G.onlineMembers(g.id).length;
      left.appendChild(el('small', 'muted', ' ' + g.memberCount + ' member' + (g.memberCount === 1 ? '' : 's') + (playing ? ' • ' + playing + ' playing now' : '') + (g.role === 'owner' ? ' • owner' : '')));
      if (g.description) left.appendChild(el('div', 'muted small-print', g.description));
      row.appendChild(left);
      if (G.unread(g)) row.appendChild(el('span', 'badge', 'new'));
      if (G.active === g.id) row.appendChild(el('span', 'chip-active', 'In chat dock'));
      row.appendChild(button('Open', 'small primary', () => G.openGroup(g.id)));
      body.appendChild(row);
    });
  }

  function renderDiscover(body) {
    const bar = el('div', 'g-search');
    const q = el('input'); q.placeholder = 'Search public groups'; q.maxLength = 30;
    bar.appendChild(q);
    const list = el('div', 'g-list');
    body.appendChild(bar);
    body.appendChild(list);
    const run = async () => {
      list.innerHTML = '';
      list.appendChild(el('p', 'muted', 'Searching…'));
      try {
        const r = await KT.Net.api('GET', '/api/groups/public?q=' + encodeURIComponent(q.value.trim()));
        list.innerHTML = '';
        if (!r.groups.length) list.appendChild(el('p', 'muted', 'No public groups found. Why not create one?'));
        r.groups.forEach((g) => {
          const row = el('div', 'group-row');
          const left = el('div', 'g-main');
          left.appendChild(el('b', '', '\u{1F310} ' + g.name));
          left.appendChild(el('small', 'muted', ' ' + g.memberCount + ' member' + (g.memberCount === 1 ? '' : 's')));
          if (g.description) left.appendChild(el('div', 'muted small-print', g.description));
          row.appendChild(left);
          row.appendChild(g.joined ? button('Open', 'small', () => G.openGroup(g.id)) : button('Join', 'small primary', () => G.join(g.id)));
          list.appendChild(row);
        });
      } catch (e) { list.innerHTML = ''; list.appendChild(el('p', 'muted', e.message)); }
    };
    let t = null;
    q.oninput = () => { clearTimeout(t); t = setTimeout(run, 350); };
    run();
  }

  function renderInvites(body) {
    if (!G.invites.length) { body.appendChild(el('p', 'muted', 'No invitations right now. Friends can invite you with your username @' + me().username + '.')); return; }
    G.invites.forEach((i) => {
      const row = el('div', 'group-row');
      const left = el('div', 'g-main');
      left.appendChild(el('b', '', (i.group.visibility === 'private' ? '\u{1F512} ' : '\u{1F310} ') + i.group.name));
      left.appendChild(el('small', 'muted', ' from ' + (i.from ? i.from.name + ' (@' + i.from.username + ')' : 'a traveller')));
      row.appendChild(left);
      row.appendChild(button('Accept', 'small primary', async () => {
        try {
          const r = await KT.Net.api('POST', '/api/invites/' + i.id + '/accept');
          KT.UI.toast('You joined “' + r.group.name + '”!', 'info');
          await G.refresh();
          G.openGroup(r.group.id);
        } catch (e) { KT.UI.toast(e.message); }
      }));
      row.appendChild(button('Decline', 'small', async () => {
        try { await KT.Net.api('POST', '/api/invites/' + i.id + '/decline'); } catch (e) { /* ignore */ }
        G.invites = G.invites.filter((x) => x.id !== i.id);
        render();
      }));
      body.appendChild(row);
    });
  }

  function renderCreate(body) {
    const f = el('form', 'g-create');
    f.innerHTML = '<label>Group name<input name="name" maxlength="30" required placeholder="e.g. Backwater Explorers"></label>' +
      '<label>Description <small class="muted">(optional)</small><input name="description" maxlength="140" placeholder="What is your group about?"></label>' +
      '<div class="g-vis"><label class="check"><input type="radio" name="vis" value="public" checked> <b>Public</b> <small class="muted">anyone can find and join</small></label>' +
      '<label class="check"><input type="radio" name="vis" value="private"> <b>Private</b> <small class="muted">invitation only</small></label></div>' +
      '<p class="auth-error hidden"></p>';
    f.appendChild(button('Create group', 'primary', () => {}));
    f.onsubmit = async (e) => {
      e.preventDefault();
      const err = f.querySelector('.auth-error');
      try {
        const r = await KT.Net.api('POST', '/api/groups', { name: f.name.value.trim(), description: f.description.value.trim(), visibility: f.vis.value });
        KT.UI.toast('Group “' + r.group.name + '” created. Invite your friends!', 'info');
        await G.refresh();
        G.openGroup(r.group.id);
      } catch (e2) { err.textContent = e2.message; err.classList.remove('hidden'); }
    };
    body.appendChild(f);
  }

  G.join = async function (gid) {
    try {
      const r = await KT.Net.api('POST', '/api/groups/' + gid + '/join');
      KT.UI.toast('You joined “' + r.group.name + '”!', 'info');
      await G.refresh();
      G.openGroup(gid);
    } catch (e) { KT.UI.toast(e.message); }
  };

  // ------------------------------------------------------- one group view
  let viewMembers = [];
  G.openGroup = async function (gid) {
    G.view = gid;
    G.active = gid;
    store('active', gid);
    if (KT.Game.state !== 'groups') KT.Game.setState('groups');
    render();
    updateDock();
    try {
      const [d] = await Promise.all([KT.Net.api('GET', '/api/groups/' + gid), loadMessages(gid)]);
      viewMembers = d.members;
      if (G.view !== gid) return;
      // fill in the parts that were loading (keeps anything already typed)
      renderChat();
      renderMembers();
      renderVoice();
      markRead(gid);
      updateBadges();
      updateDock();
    } catch (e) { KT.UI.toast(e.message); G.view = null; render(); }
  };

  function renderGroup(body, gid) {
    const g = G.groups.find((x) => x.id === gid) || { id: gid, name: '…', visibility: 'public', memberCount: 0 };
    const head = el('div', 'g-head');
    head.appendChild(button('← Back', 'small', () => { G.view = null; render(); }));
    const t = el('div', 'g-title');
    t.appendChild(el('b', '', (g.visibility === 'private' ? '\u{1F512} ' : '\u{1F310} ') + g.name));
    t.appendChild(el('small', 'muted', ' ' + (g.visibility === 'private' ? 'Private group' : 'Public group') + (g.description ? ' • ' + g.description : '')));
    head.appendChild(t);
    body.appendChild(head);
    const cols = el('div', 'g-cols');
    // chat
    const chat = el('div', 'g-chat');
    chat.appendChild(el('div', 'g-messages'));
    const form = el('form', 'g-send');
    const input = el('input'); input.maxLength = 300; input.placeholder = 'Message ' + g.name;
    form.appendChild(input);
    form.appendChild(button('Send', 'primary small', () => {}));
    form.onsubmit = (e) => { e.preventDefault(); const v = input.value.trim(); input.value = ''; if (v) G.sendMessage(gid, v); };
    chat.appendChild(form);
    cols.appendChild(chat);
    // side: voice, members, invite, leave
    const side = el('div', 'g-side');
    const voice = el('div', 'g-voice');
    side.appendChild(voice);
    side.appendChild(el('h4', '', 'Members'));
    side.appendChild(el('div', 'g-members'));
    const inv = el('form', 'g-invite');
    const ui = el('input'); ui.placeholder = '@username'; ui.maxLength = 21; ui.autocapitalize = 'off'; ui.spellcheck = false;
    const sugg = el('div', 'g-sugg');
    inv.appendChild(el('h4', '', 'Invite a friend'));
    inv.appendChild(ui);
    inv.appendChild(button('Invite', 'small primary', () => {}));
    inv.appendChild(sugg);
    let st = null;
    ui.oninput = () => {
      clearTimeout(st);
      st = setTimeout(async () => {
        sugg.innerHTML = '';
        const q = KT.Account.cleanUsername(ui.value);
        if (q.length < 2) return;
        try {
          const r = await KT.Net.api('GET', '/api/players/search?q=' + encodeURIComponent(q));
          r.players.filter((p) => p.username).forEach((p) => {
            const s = el('button', 'linkish', '@' + p.username + ' • ' + p.name);
            s.type = 'button';
            s.onclick = () => { ui.value = '@' + p.username; sugg.innerHTML = ''; };
            sugg.appendChild(s);
          });
        } catch (e) { /* ignore */ }
      }, 300);
    };
    inv.onsubmit = async (e) => {
      e.preventDefault();
      const u = KT.Account.cleanUsername(ui.value);
      if (!KT.Account.validUsername(u)) { KT.UI.toast(KT.Account.USERNAME_RULES); return; }
      try {
        const r = await KT.Net.api('POST', '/api/groups/' + gid + '/invite', { username: u });
        ui.value = ''; sugg.innerHTML = '';
        KT.UI.toast('Invitation sent to @' + r.player.username + '.', 'info');
        if (live()) {
          // nudge them so the invitation shows up straight away
          const ch = KT.Net.realtime().channel('kt-usr-' + r.player.id);
          ch.subscribe((s) => { if (s === 'SUBSCRIBED') { ch.send({ type: 'broadcast', event: 'invite', payload: {} }); setTimeout(() => KT.Net.realtime().removeChannel(ch), 1500); } });
        }
      } catch (e2) { KT.UI.toast(e2.message); }
    };
    side.appendChild(inv);
    side.appendChild(button('Leave group', 'small danger', async () => {
      if (!window.confirm('Leave “' + g.name + '”?')) return;
      try {
        if (KT.Voice && KT.Voice.gid === gid) KT.Voice.leave();
        await KT.Net.api('POST', '/api/groups/' + gid + '/leave');
        if (G.active === gid) G.active = null;
        G.view = null;
        await G.refresh();
        render();
      } catch (e) { KT.UI.toast(e.message); }
    }));
    cols.appendChild(side);
    body.appendChild(cols);
    renderChat();
    renderMembers();
    renderVoice();
  }

  function renderChat() {
    const box = document.querySelector('#groups-body .g-messages');
    if (!box || !G.view) return;
    const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 30;
    box.innerHTML = '';
    const list = G.messages[G.view] || [];
    if (!list.length) box.appendChild(el('p', 'muted', 'No messages yet. Say namaskaram! \u{1F64F}'));
    list.forEach((m) => {
      const mine = m.userId === me().id;
      const line = el('div', 'g-msg' + (mine ? ' mine' : ''));
      const who = el('div', 'g-who');
      who.appendChild(el('b', '', mine ? 'You' : m.name));
      if (!mine && m.username) who.appendChild(el('small', 'muted', ' @' + m.username));
      who.appendChild(el('small', 'muted', ' ' + time(m.at)));
      line.appendChild(who);
      line.appendChild(el('div', 'g-text', m.text));
      box.appendChild(line);
    });
    if (atBottom || list.length < 12) box.scrollTop = box.scrollHeight;
  }

  function renderMembers() {
    const box = document.querySelector('#groups-body .g-members');
    if (!box || !G.view) return;
    const gid = G.view;
    const g = G.groups.find((x) => x.id === gid) || {};
    const playing = new Map(G.onlineMembers(gid).map((p) => [p.i, p]));
    box.innerHTML = '';
    viewMembers.forEach((m) => {
      const row = el('div', 'g-member');
      const isMe = m.id === me().id;
      const p = playing.get(m.id);
      row.appendChild(el('span', 'net-dot' + (isMe || p ? ' on' : '')));
      const info = el('div', 'g-minfo');
      info.appendChild(el('b', '', isMe ? 'You' : m.name));
      if (m.username) info.appendChild(el('small', 'muted', ' @' + m.username));
      if (m.role === 'owner') info.appendChild(el('small', 'g-owner', ' owner'));
      if (p) info.appendChild(el('div', 'muted small-print', (p.v ? '\u{1F3A4} ' : '') + where(p)));
      row.appendChild(info);
      if (p && !isMe) row.appendChild(button('Go to', 'small primary', () => KT.Game.goToFriend(p)));
      if (g.role === 'owner' && !isMe) row.appendChild(button('✕', 'small', async () => {
        if (!window.confirm('Remove ' + m.name + ' from the group?')) return;
        try { await KT.Net.api('POST', '/api/groups/' + gid + '/kick', { userId: m.id }); viewMembers = viewMembers.filter((x) => x.id !== m.id); renderMembers(); } catch (e) { KT.UI.toast(e.message); }
      }));
      box.appendChild(row);
    });
    if (!live()) box.appendChild(el('p', 'muted small-print', 'Live locations need the online service.'));
  }

  function renderVoice() {
    const box = document.querySelector('#groups-body .g-voice');
    if (!box || !G.view) return;
    box.innerHTML = '';
    if (!KT.Voice || !live()) { box.appendChild(el('p', 'muted small-print', 'Voice chat needs the online service.')); return; }
    KT.Voice.renderControls(box, G.view);
  }
  G.renderVoice = renderVoice;

  // ---------------------------------------------------------------- UI
  G.bindUI = function () {
    document.querySelectorAll('[data-gtab]').forEach((b) => { b.onclick = () => { G.tab = b.dataset.gtab; G.view = null; render(); }; });
    $('btn-groups').onclick = () => { if (KT.Game.state === 'playing') G.open(); };
    $('btn-groups-close').onclick = () => G.close();
    $('dock-open').onclick = () => {
      if (!G.active) return;
      G.open();
      G.openGroup(G.active);
    };
    $('dock-voice').onclick = () => { if (KT.Voice && G.active) KT.Voice.toggle(G.active); };
    $('dock-input').addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); dockSend(); }
      if (e.key === 'Escape') { $('dock-input').value = ''; $('dock-input').blur(); $('chat-dock').classList.remove('typing'); }
    });
    $('dock-input').addEventListener('blur', () => $('chat-dock').classList.remove('typing'));
    // Enter opens the chat box while playing
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || KT.Game.state !== 'playing') return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (G.active && G.focusDock()) { e.preventDefault(); KT.Input.pressed.confirm = false; }
    });
  };
})();
