# Kerala Explorer — God's Own Country

A 3D third-person exploration game for the browser, built for Kerala Tourism.
Walk the Alleppey promenade, paddle a canoe across Vembanad Lake, watch a
Kathakali performance, greet the Pooram elephants, hike the Munnar tea hills,
photograph Periyar's wildlife and clean up Kovalam beach — then board a
KSRTC Super Fast bus and drive the Kerala highway through all 14 districts,
together with other travellers online.

![Kerala Explorer](assets/icons/logo.svg)

## How to play

**Online at https://starktvm-hrms.github.io/ktgame/** — the game is
published to GitHub Pages by `.github/workflows/pages.yml`, and its online
services (accounts, profiles, saved progress, multiplayer) run on Supabase
(see [supabase/README.md](supabase/README.md)). Opening `index.html`
directly also uses Supabase.

**Your own game server (optional)** — the Node.js server in `server/` offers
the same features and is built for very large player counts. It also serves
the game, and the game then uses it instead of Supabase:

```bash
cd server && npm install && npm start
```

then visit http://localhost:8080 in Chrome, Edge, Brave or Firefox, and
register with your name, a username, your mobile number and a password (tick *Remember me* to
stay signed in on that device). See [server/README.md](server/README.md)
for production deployment and scaling to lakhs of concurrent players.

**Offline** — choose *Play offline as a guest* on the sign-in screen.
Progress is then saved in the browser only.

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Walk | W A S D / arrows | Left joystick |
| Look / zoom | Move the mouse (the cursor is captured; Esc frees it) / wheel | Drag right side |
| Run · Jump | Shift + W · Space (run + jump = front flip) | Push the joystick all the way / Run button · Jump button |
| Talk, canoe, climb, board / leave the bus | E | E button |
| Drive the KSRTC bus | W/S throttle & brake, A/D steer, Space handbrake, H horn, V driver's view, R back on the road | Joystick |
| Profile · Players nearby · My vehicles | J · O · G | Portrait · online counter · 🚲 |
| Groups & chat · Mic on / mute | T (Enter to type in the chat bar) · B | 👥 · 🎤 in the chat bar |
| Fishing (Kochi) | E at a Fishing Point, E / Space to haul | E · Haul button |
| Camera mode (photos) | C, snap with C / Space | Eye button |
| Namaskaram · Wave | N · Q | 🙏 button |
| Map (wheel / pinch to zoom, drag to move) · First/third person | M · V | Minimap · 🎥 |
| Pause & settings | Esc | ⚙ |

## Missions

1. Welcome to God's Own Country — meet the tourism guide
2. Clean the Backwaters — collect floating plastic
3. Cheena Vala — visit the Chinese fishing nets
4. Row the Backwaters — paddle to Pathiramanal Island
5. Kathakali Evening — watch the performance
6. Pooram Festival — greet the temple elephants with a Namaskaram
7. Tea Trails of Munnar — climb the viewpoint tower
8. Wildlife of Periyar — photograph a peacock, a deer and an elephant
9. Sunset at Kovalam — reach the lighthouse
10. Eco Hero — clean the beach
11. Grand Kerala Tour — drive the KSRTC bus through the gates of all 14 districts

Also: landmarks to discover (stars), coins along every path, XP and levels,
a photo album with downloadable postcards and an exploration certificate.

## The Kerala highway

The KSRTC bus stand in the village takes you to the highway, a road from
Thiruvananthapuram in the south to Kasaragod in the north. All 14 district
centres sit 60 km apart on the map scale (1:20, so 3 km of road in the
game). Each centre has welcome gates, a bus stand, an information board,
local people to talk to, shops and a landmark, such as a temple gopuram, a
lighthouse, Chinese fishing nets, the Idukki arch dam, a hill shrine or
Bekal fort. Milestones count the kilometres, green signs point to the next
districts, and rivers are crossed on bridges. The route bar, speedometer
and minimap show where you are. Get off the bus anywhere (stop first) and
call it back at any bus stand. The Alappuzha centre has a path back to the
backwaters.

The roads are busy: cars, Kerala autorickshaws, scooters, lorries and other
KSRTC buses keep to the left, follow each other, stop for people and at red
lights, honk when blocked and overtake parked vehicles. Every district centre
has a signalled zebra crossing (jumping a red light costs a fine) and rows
of roadside shops: tea stalls, fruit stalls, bakeries, stores, textile and
medical shops, hotels and mobile shops. More shops line the highway between
towns, and the village has its own traffic through a four-way signal.

Every district centre is a **town**: about 300 m of the main road is lined
with up to three rows of two- to four-storey buildings (hotels, jewellers,
banks, textile shops, clinics, book stalls, the post office), and three side
streets lead off it, with street lamps and autos waiting at the corners.
People walk the pavements and side streets, stop to chat, wait at the
kerb and cross at the zebra crossing when the lights turn red for the
traffic. Fewer of them are out late at night, and they put up umbrellas when
it rains.
Autos, scooters and cars drive up and down the side streets (keeping left
and stopping for anyone in front of them), vehicles are parked along the
roads, and tourists stroll round every attraction.

Each district also shows its **major tourist attractions** around the
town, each with an information board (press E to read about it):

| District | Attractions |
| --- | --- |
| Thiruvananthapuram | Sree Padmanabhaswamy Temple, Napier Museum, Varkala Cliff, Kovalam Beach, Ponmudi Hills |
| Kollam | Thangassery Lighthouse, Jatayu Earth's Center, Ashtamudi Lake, Palaruvi Waterfalls, Thenmala Eco-tourism |
| Pathanamthitta | Sabarimala, Aranmula Snake Boats, Gavi Forest, Konni Elephant Camp, Perunthenaruvi Waterfalls |
| Alappuzha | Backwaters and houseboats, Alappuzha Beach & Lighthouse, Ambalappuzha Temple, Pathiramanal Island, Arthunkal Basilica |
| Kottayam | Thirunakkara Church, Kumarakom Bird Sanctuary, Vagamon Meadows, Ettumanoor Mahadeva Temple |
| Idukki | Idukki Arch Dam, Munnar Tea Gardens, Thekkady Periyar Wildlife, Spice Plantations |
| Ernakulam | Chinese Fishing Nets, Mattancherry Palace, Kathakali Centre, St. Francis Church, Paradesi Synagogue, Cherai Beach |
| Thrissur | Vadakkunnathan Temple and elephants, Athirappilly Waterfalls, Guruvayur Temple, Kerala Kalamandalam, Punnathur Kotta |
| Palakkad | Palakkad Fort, Malampuzha Dam & Gardens, Silent Valley National Park, Nelliyampathy Hills |
| Malappuram | Malappuram Mosque, Kottakkal Arya Vaidya Sala, a football ground, Nilambur Teak Museum, Padinharekara Beach |
| Kozhikode | Kappad Beach, Thusharagiri Waterfalls, Kozhikode Beach, Mananchira Square, Tali Temple |
| Wayanad | Edakkal Caves, Banasura Sagar Dam, Chembra Peak, Soochipara Falls, Kuruva Island, Muthanga Wildlife Sanctuary |
| Kannur | St. Angelo Fort, Theyyam, Muzhappilangad Drive-in Beach, Arakkal Museum, Payyambalam Beach |
| Kasaragod | Bekal Fort, Ananthapura Lake Temple, Chandragiri Fort, Ranipuram Hills, Kappil Beach |

Reaching an attraction for the first time discovers it (+10 coins). They
appear on the minimap, and on the big map when you zoom in.

If a vehicle gets stuck (off the road, against a wall), press **R** (or the
E button on touch screens) to put it back on the road.

## Fishing at Kochi and your own vehicles

At the Ernakulam centre, the lagoon by the Chinese fishing nets has four
Fishing Points. Cast your net, wait for the fish, and haul it in when the
marker is in the green zone. You might catch mathi (sardine), ayala
(mackerel), chemmeen (prawns), koonthal (squid), karimeen (pearl spot) or a
prized neymeen (seer fish), and every fish is worth coins.

Coins unlock vehicles in order. When your wallet reaches a vehicle's price
it unlocks and the price is paid from your coins:

| Coins | Vehicle | Top speed |
| --- | --- | --- |
| 250 | Bicycle | 45 km/h |
| 350 | Auto rickshaw (tuk tuk) | 70 km/h |
| 500 | Scooter | 90 km/h |
| 1000 | Car | 130 km/h |

Press G (or the 🚲 button) to open My Vehicles and ride one, on the
backwaters map or along the highway between districts. Other players see
you riding it.

## Groups, chat and voice

Every player picks a **username** (like `@anjali_nair`) when they register;
others use it to find and invite them. Players who signed up before
usernames existed are asked to choose one the next time they sign in.

Press **T** (or 👥) to open Groups:

- **Create** a group. A **public** group can be found and joined by anyone
  from the *Discover* tab. A **private** group is invitation only.
- **Invite** friends by username. They see the invitation under *Invites*
  (with a badge on 👥) and can accept or decline.
- **Chat**: the group screen has the full chat. While you play, the chat bar
  at the bottom shows your active group's latest messages; press Enter to
  type.
- **Play together**: the member list shows where each online member is
  (backwaters, highway district or the lighthouse). Press *Go to* to join
  them. Group friends appear as purple markers on the minimap and the map.
- **Voice**: press *Join voice* in the group (or B, or 🎤 in the chat bar)
  and allow the microphone to talk with group members who are in voice too.
  B mutes and unmutes. Audio goes directly between players (WebRTC,
  peer-to-peer) with echo cancellation. A few strict networks block direct
  connections; add a TURN server to `KT.CONFIG.turn` in `js/config.js` for
  those.

On Supabase, chat, member positions and voice signalling use Realtime
broadcast channels. With the Node server, chat is checked every few seconds
and voice is not available.

## Kovalam lighthouse

The red and white Vizhinjam lighthouse stands on the headland above Kovalam
beach. Press E at its door to go inside: read the exhibits about its
history and the great Fresnel lens, ring the ship's bell, and talk to Abdul
the keeper. Then take the spiral stairs up to the gallery at the top for the
view over the Arabian Sea.

## Live time and weather

The sky follows the clock on your device: sunrise, golden hour, sunset, a
starry night with the moon, the lighthouse beam sweeping in the dark,
glowing lamps and crickets after dark. The weather is the real current
weather where you are in the game: Alappuzha on the backwaters map, the
nearest district on the highway. It comes from [Open-Meteo](https://open-meteo.com)
(free, no key) and is refreshed every 15 minutes, so you'll see clouds, rain,
mist and monsoon thunderstorms with lightning when they really happen. If the
weather can't be fetched, a believable stand-in is used (wetter in the
monsoon months). The chip at the top right shows the time and weather; click
it for details. Pause → Settings → *Time & weather* can switch to clear skies
or to an always sunny day.

## Project layout

```
index.html            entry point
css/style.css         HUD and menus
lib/three.min.js      three.js r149 (MIT, vendored — no CDN needed)
js/                   game code (terrain, world, highway, vehicle, entities, player,
                      missions, UI, audio, net = multiplayer client, account = sign-in & profiles,
                      groups = groups & chat, voice = WebRTC voice chat,
                      lighthouse = Kovalam lighthouse interior, sky = time of day & weather,
                      townfolk = people, tourists and street traffic in the district towns)
server/               Node.js game server (accounts, progress, profiles, real-time play)
supabase/             Supabase backend: database migration and the `api` Edge Function
lib/supabase.min.js   supabase-js 2.117.3 (MIT, vendored) for Supabase Realtime
assets/models/        procedural 3D model library: characters, animals, boats,
                      buildings (Kerala houses, temple, church, lighthouse...),
                      trees & plants, props
assets/textures/      generated textures (.jpg/.png) + textures.js bundle
assets/icons/         logo and favicon
tools/generate_textures.py   regenerates every texture
```

All art is original and generated by code: textures are painted by
`tools/generate_textures.py` (Python 3 + Pillow + NumPy) and bundled into
`assets/textures/textures.js` as data URIs, so the game also runs from
`file://`. 3D models are built procedurally in `assets/models/`. Music and
sound effects are synthesised live with the Web Audio API.

```bash
python3 tools/generate_textures.py
```

## Graphics settings

Pause → Settings → Graphics quality (Low / Medium / High) controls shadows,
resolution and terrain detail. Lower it on older laptops or phones.

On Medium and High, the live sky is turned into an environment map that
lights and reflects off every surface (it follows the time of day and the
weather). Everywhere: the ground blends grass with patches of bare earth and
red laterite on slopes, with close-up detail; the highway has worn asphalt
with tyre tracks and cracks, black-and-white kerbs and reflectors that glow
at night; town footpaths are paver blocks; dense grass, flowers and ferns
grow around you, with areca palms, jackfruit trees and forest on the ghats;
people up close are drawn in full detail, many men wear a moustache, women
jasmine in their hair, and people carry shopping bags, handbags and phones.
