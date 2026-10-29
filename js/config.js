// Where the game's online services live. By default the game uses the
// Supabase project (accounts API in the `api` Edge Function, multiplayer
// over Supabase Realtime). The publishable key is meant to be public.
// When the game is served by the Node server in server/, that server
// appends `KT.CONFIG.node = true` so the same origin is used instead.
KT.CONFIG = {
  supabaseUrl: 'https://dtfwqzrzwevzjpanxwxo.supabase.co',
  supabaseKey: 'sb_publishable_d9nlhb3AKcQQ4BX1hV2R3g_j-9nFgU7'
};
