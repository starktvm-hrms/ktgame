// Story Mode: "Kerala Saavari: Save Kerala's Legacy". The campaign data.
//
// The engine (js/story.js) plays each chapter's steps in order. A step can
// name the sight it happens at (`at`, a sight's name as in the game); the
// player is taken there. See js/story.js for the step types. Chapter
// texts follow the story script: opening dialogue, missions, chapter
// endings and rewards.
(function () {
  'use strict';

  const CAST = {
    appuppan: { name: 'Appuppan', role: 'The Guide', cfg: { gender: 'male', outfit: 'mundu', hair: 'short', hairColor: 0xdedbd2, beard: true, mustache: true, glasses: true, skin: 0x9a6440, colors: { top: 0xf2efe6 }, acc: {}, scale: 0.97, seed: 501 } },
    meera: { name: 'Meera', role: 'The Companion', cfg: { gender: 'female', outfit: 'hiking', hair: 'braid', skin: 0xc08660, colors: { top: 0x2f8f7a, inner: 0xf2efe6 }, acc: { camera: true, backpack: true }, seed: 502 } },
    collector: { name: 'The Collector', role: 'Leader of the Shadow Collective', cfg: { gender: 'male', outfit: 'coat', hair: 'short', skin: 0xd9a27c, colors: { top: 0x1c1c22, inner: 0x6a1a1a, bottom: 0x1c1c22, shoes: 0x111111 }, acc: { sunglasses: true }, seed: 503 } },
    agent: { name: 'Shadow agent', role: 'The Shadow Collective', cfg: { gender: 'male', outfit: 'formal', hair: 'short', skin: 0xc08660, colors: { top: 0x1c1c22, bottom: 0x1c1c22, shoes: 0x111111 }, acc: { sunglasses: true }, seed: 504 } },
    thief: { name: 'Masked thief', role: 'The Shadow Collective', cfg: { gender: 'male', outfit: 'tee', hair: 'short', skin: 0xa8704c, colors: { top: 0x1c1c22, bottom: 0x2a2a30, shoes: 0x111111 }, acc: { hat: true }, seed: 505 } },
    elder: { name: 'Village elder', role: 'Kannur', cfg: { gender: 'male', outfit: 'mundu', hair: 'short', hairColor: 0xcfcac0, beard: true, skin: 0x8d5a3b, colors: { top: 0xf2efe6 }, acc: {}, scale: 0.96, seed: 506 } },
    organiser: { name: 'Festival organiser', role: 'Thrissur Pooram', cfg: { gender: 'male', outfit: 'mundu', hair: 'short', skin: 0x9a6440, mustache: true, colors: { top: 0xd8a032 }, acc: {}, seed: 507 } },
    officer: { name: 'Wildlife officer', role: 'Periyar Tiger Reserve', cfg: { gender: 'female', outfit: 'casual', hair: 'bun', skin: 0xa8704c, colors: { top: 0x5b6b3a, bottom: 0x5b6b3a }, acc: { hat: true }, seed: 508 } },
    historian: { name: 'Local historian', role: 'The southern coast', cfg: { gender: 'male', outfit: 'formal', hair: 'short', hairColor: 0x9a9a96, glasses: true, skin: 0xa8704c, colors: { top: 0xf2efe6, bottom: 0x6a5a40 }, acc: {}, seed: 509 } },
    shopkeeper: { name: 'Spice merchant', role: 'Kozhikode market', cfg: { gender: 'male', outfit: 'mundu', hair: 'short', skin: 0x8d5a3b, mustache: true, colors: { top: 0x3b6ea8 }, acc: {}, seed: 510 } },
    boatman: { name: 'Kuttappan', role: 'Boatman', cfg: { gender: 'male', outfit: 'mundu', hair: 'short', skin: 0x8d5a3b, mustache: true, colors: { top: 0xe7c46a }, acc: {}, seed: 511 } },
    ranger: { name: 'Forest ranger', role: 'Kerala Forest Department', cfg: { gender: 'male', outfit: 'formal', hair: 'short', skin: 0x8d5a3b, mustache: true, colors: { top: 0x5b6b3a, bottom: 0x5b6b3a }, acc: { hat: true }, seed: 513 } },
    guard: { name: 'Palace curator', role: 'Mattancherry Palace', cfg: { gender: 'female', outfit: 'saree', hair: 'bun', skin: 0xc08660, colors: { bottom: 0x2c5fa8, border: 0xd4a434, top: 0x2c5fa8 }, acc: {}, seed: 519 } }
  };

  // the seven symbols of the Heart of Kerala
  const SYMBOLS = [
    { id: 'nature', name: 'Nature', icon: '\u{1F33F}', color: 0x3fae3a },
    { id: 'heritage', name: 'Heritage', icon: '\u{1F3DB}️', color: 0xc9a227 },
    { id: 'wildlife', name: 'Wildlife', icon: '\u{1F418}', color: 0x7a7a72 },
    { id: 'tradition', name: 'Tradition', icon: '\u{1FA94}', color: 0xf2a020 },
    { id: 'culture', name: 'Culture', icon: '\u{1F3AD}', color: 0xd8322a },
    { id: 'adventure', name: 'Adventure', icon: '\u{1F9ED}', color: 0x2c8fd8 },
    { id: 'unity', name: 'Unity', icon: '\u{1F91D}', color: 0x8a4ad8 }
  ];
  const ICONS = SYMBOLS.map((s) => s.icon);

  const PLOT = [
    'Kerala is known as God’s Own Country. Its beauty, culture, heritage and natural treasures have attracted travellers from around the world for generations.',
    'But something mysterious is happening. A secret organisation called the Shadow Collective is trying to destroy Kerala’s natural beauty and cultural heritage to build a commercial tourism empire.',
    'They are polluting the backwaters, destroying wildlife habitats, stealing historical artefacts, spreading misinformation about tourist destinations, disrupting traditional festivals and exploiting local communities and tourism businesses.',
    'Their ultimate objective is an ancient treasure known as the Heart of Kerala: seven ancient symbols representing the soul of the land. Nature. Heritage. Culture. Wildlife. Adventure. Tradition. Unity.',
    'Whoever controls all seven symbols can unlock the location of the legendary treasure.',
    'An old explorer’s journal reveals where the symbols lie. Travel from the north of Kerala to the southern coast, solve mysteries, help local communities and collect all seven symbols before the Shadow Collective does.',
    'The ultimate mission: save Kerala’s legacy.'
  ];

  const CHAPTERS = [
    // ---------------------------------------------------------------- 01
    { n: 1, place: 'Kasaragod – Bekal', title: 'The Mysterious Discovery', to: 'Bekal Fort', symbol: 'nature',
      reward: { badge: 'Explorer Badge', points: 100 },
      steps: [
        { type: 'travel', at: 'Bekal Fort' },
        { type: 'tutorial', title: 'Welcome to Kerala', desc: 'Learn to walk, run and jump.' },
        { type: 'talk', who: 'appuppan', title: 'Meet the old explorer', lines: [
          ['appuppan', 'Welcome to Kerala, young traveller! This land has thousands of stories. Some are written in books, some are hidden in the mountains, and some are buried beneath the waves.'],
          ['player', 'What are you searching for, Appuppa?'],
          ['appuppan', 'An old journal. It belonged to an explorer who travelled across Kerala many years ago. It contains the secret of something extraordinary.'],
          ['narrator', 'Suddenly, a group of masked strangers snatches a box from Appuppan’s bag and runs into the fort.'],
          ['appuppan', 'Stop! They have taken the journal!']] },
        { type: 'find', count: 3, item: 'a clue', title: 'Explore Bekal Fort', desc: 'Search the fort for clues: dropped papers, footprints, a torn strap.' },
        { type: 'chase', who: 'thief', title: 'The Chase', desc: 'Chase the thief through the fort and catch him!', time: 45, shout: 'There he goes!', caught: 'You caught the thief! He drops an old carved box.', fail: 'The thief got away.' },
        { type: 'puzzle', name: 'The Hidden Journal', title: 'Open the ancient box', icons: ['\u{1F33F}', '\u{1F30A}', '☀️', '\u{1F319}', '\u{1F418}', '\u{1F334}'], length: 4,
          hint: 'The box has a lock of carved symbols. Watch the order they glow, then press them the same way.' },
        { type: 'scene', lines: [
          ['appuppan', 'You opened it! Part of the journal is still inside.'],
          ['narrator', 'Inside the box, beside the journal pages, lies a carved emblem of leaves and water: a symbol of nature.']] },
        { type: 'symbol', symbol: 'nature', title: 'Take the symbol of Nature', desc: 'The emblem glows in the box. Press E to take it.' },
        { type: 'message', kicker: 'The journal reads', text: 'Seven symbols. Seven destinations. One forgotten legacy.', ms: 4800 },
        { type: 'scene', lines: [['appuppan', 'Those thieves will be back. The journal points south, to Kannur. Will you come with me?'], ['player', 'Let’s go.']] }
      ] },
    // ---------------------------------------------------------------- 02
    { n: 2, place: 'Kannur', title: 'The Secret of Theyyam', to: 'Theyyam', symbol: 'heritage',
      reward: { badge: 'Heritage Badge', points: 150 },
      steps: [
        { type: 'travel', at: 'Theyyam', title: 'Explore a traditional Kannur village' },
        { type: 'talk', who: 'meera', title: 'Meet Meera', lines: [
          ['meera', 'Hi! I’m Meera, a travel photographer. Appuppan told me you might come.'],
          ['meera', 'Look at the village. Everyone seems worried. Something has happened.']] },
        { type: 'talk', who: 'elder', with: 'meera', title: 'Speak with the villagers', lines: [
          ['elder', 'Our ceremonial crown has disappeared. Without it, tonight’s performance cannot take place.'],
          ['player', 'Can I help you find it?'],
          ['elder', 'Follow the clues. But remember, this is more than an object. It carries generations of tradition.']] },
        { type: 'find', count: 3, item: 'a clue', title: 'Find three clues', desc: 'Search around the village for clues to the missing crown.' },
        { type: 'quiz', name: 'Traditional craft', title: 'Help prepare the costumes', questions: [
          { q: 'The tall Theyyam headdress is called a...', a: ['Mudi', 'Chenda', 'Kindi'], c: 0, why: 'The mudi is the great crown, sometimes taller than the performer.' },
          { q: 'Theyyam face paint is made mainly from...', a: ['Natural colours: rice paste, turmeric and lime', 'Plastic paint', 'Coloured chalk'], c: 0, why: 'The colours are prepared by hand from natural materials.' },
          { q: 'Which drum leads a Theyyam performance?', a: ['Tabla', 'Chenda', 'Mridangam'], c: 1, why: 'The loud chenda drives the dance.' },
          { q: 'The skirt of tender coconut leaves is woven from...', a: ['Banana stems', 'Kuruthola (young palm leaves)', 'Jute'], c: 1, why: 'Fresh kuruthola is woven for each performance.' }
        ] },
        { type: 'find', count: 1, at: 'Arakkal Museum', item: 'the ceremonial crown', look: 'key', title: 'The abandoned warehouse', desc: 'The clues lead to an old warehouse by the Arakkal palace. Search it for the crown.' },
        { type: 'timed', at: 'Theyyam', who: 'elder', time: 50, distance: 60, title: 'Return the crown in time', desc: 'Run the crown back to the village elder before the performance begins!', made: 'The crown is back. The performance can begin!', fail: 'Too late for the opening.' },
        { type: 'scene', lines: [
          ['elder', 'You have returned more than a crown. You have returned our tradition.'],
          ['meera', 'Look, the journal! A second symbol is drawn on this page: Heritage.']] },
        { type: 'symbol', symbol: 'heritage', title: 'Receive the symbol of Heritage', desc: 'The elder places the Heritage emblem before the shrine. Press E to take it.' },
        { type: 'scene', lines: [
          ['narrator', 'A message arrives on your phone, from an unknown number:'],
          ['collector', '"You are getting closer. But you have no idea what you are dealing with."']] }
      ] },
    // ---------------------------------------------------------------- 03
    { n: 3, place: 'Wayanad', title: 'The Forest Mystery', to: 'Wayanad Wildlife Sanctuary', symbol: 'wildlife',
      reward: { badge: 'Wildlife Guardian Badge', points: 200 },
      steps: [
        { type: 'travel', at: 'Wayanad Wildlife Sanctuary', title: 'Explore the Wayanad forest' },
        { type: 'talk', who: 'ranger', with: 'meera', title: 'Meet the forest ranger', lines: [
          ['ranger', 'Something strange is happening here. Animals are moving away from their usual habitats. Someone has been disturbing the forest.'],
          ['meera', 'Could this be connected to the people who stole the journal?'],
          ['ranger', 'Several of our camera traps have been smashed and the monitoring equipment is gone. Can you find them?']] },
        { type: 'find', count: 3, item: 'a camera trap', title: 'Find the missing camera traps', desc: 'Search the forest for the three missing camera traps.' },
        { type: 'find', count: 4, item: 'footprints', title: 'Follow the footprints', desc: 'Follow the trail of boot prints deeper into the forest.', spread: 4 },
        { type: 'timed', time: 40, distance: 70, title: 'The forest obstacle course', desc: 'Jump the fallen logs and reach the marker before time runs out!', made: 'Through the forest!', fail: 'The trail went cold.' },
        { type: 'reach', at: 'Edakkal Caves', title: 'Explore Edakkal Caves', desc: 'The footprints lead to the old cave. Go inside and look at the ancient carvings.' },
        { type: 'photo', count: 1, at: 'Edakkal Caves', title: 'Photograph the carvings', desc: 'Photograph the 6,000-year-old carvings for the journal.', verb: '\u{1F4F7} Photograph the carvings' },
        { type: 'scene', lines: [['ranger', 'I found these footprints near the old cave. Someone is trapping animals by the dumping site below the hill.'], ['meera', 'We should go now, quietly.']] },
        { type: 'press', count: 3, at: 'Wayanad Wildlife Sanctuary', title: 'Boss: The Forest Trapper', desc: 'Sneak up and disable the trapper’s illegal equipment. No weapons: just switch it off.', verb: 'Disable the trap', done: 'Trap disabled.' },
        { type: 'press', count: 1, title: 'Rescue the trapped animal', desc: 'A young sambar deer is caught near the dumping site. Free it gently.', verb: 'Free the deer', done: 'The deer bounds back into the forest!' },
        { type: 'scene', lines: [['narrator', 'The trapper flees, leaving behind a crate of equipment. Inside, wrapped in cloth, is a third emblem.'], ['ranger', 'Thank you. The forest will remember this.']] },
        { type: 'symbol', symbol: 'wildlife', title: 'Take the symbol of Wildlife' },
        { type: 'scene', lines: [['meera', 'There is a note in the crate: "Kozhikode. The old spice route." That is our next stop.']] }
      ] },
    // ---------------------------------------------------------------- 04
    { n: 4, place: 'Kozhikode', title: 'The Lost Trading Route', to: 'Mananchira Square', symbol: 'tradition',
      reward: { badge: 'Spice Trader Badge', points: 200 },
      steps: [
        { type: 'travel', at: 'Mananchira Square', title: 'Explore Kozhikode’s old market' },
        { type: 'scene', lines: [
          ['appuppan', 'Centuries ago, traders travelled from distant lands to this coast. Pepper, spices and stories connected Kerala to the world.'],
          ['meera', 'Then the next clue must be somewhere connected to the old trade routes.']] },
        { type: 'talk', who: 'shopkeeper', title: 'Ask the shopkeepers', lines: [
          ['shopkeeper', 'An old merchant’s map? My grandfather spoke of it. The traders who landed at Kappad drew it.'],
          ['shopkeeper', 'Go to Kappad Beach, where the ships came in. And learn your spices: the map is written in them!']] },
        { type: 'reach', at: 'Kappad Beach', title: 'Visit Kappad Beach', desc: 'Walk to Kappad, where Vasco da Gama landed in 1498.' },
        { type: 'quiz', name: 'Spice identification', title: 'Read the spice map', questions: [
          { q: 'Which spice was called "black gold" by traders?', a: ['Black pepper', 'Cardamom', 'Clove'], c: 0, why: 'Malabar pepper was worth its weight in gold.' },
          { q: 'Small green pods with a sweet, strong scent are...', a: ['Nutmeg', 'Cardamom', 'Turmeric'], c: 1, why: 'Kerala’s hills grow some of the finest cardamom.' },
          { q: 'Curled brown bark that smells sweet is...', a: ['Cinnamon', 'Ginger', 'Cumin'], c: 0, why: 'Cinnamon comes from the inner bark of a tree.' },
          { q: 'A bright yellow root used in Kerala cooking is...', a: ['Saffron', 'Turmeric', 'Mustard'], c: 1, why: 'Turmeric gives curries their colour.' }
        ] },
        { type: 'travel', at: 'Beypore Port', title: 'Travel to Beypore' },
        { type: 'puzzle', name: 'Uru boat building', title: 'Build the Uru', icons: ['\u{1FAB5}', '\u{1FA9A}', '\u{1FAA2}', '⚓', '⛵', '\u{1F528}'], length: 5,
          hint: 'The master builder shows the order of the work: timber, saw, rope, anchor, sail... Watch, then repeat it.' },
        { type: 'find', count: 1, look: 'key', item: 'the merchant’s map', title: 'Recover the ancient merchant’s map', desc: 'The map is hidden in the boatyard. Find it.' },
        { type: 'scene', lines: [
          ['appuppan', 'The map shows the old route inland, and it is marked with festival symbols. Trade and festivals were always linked here.'],
          ['meera', 'And there, in the corner: the fourth symbol. Tradition.']] },
        { type: 'symbol', symbol: 'tradition', title: 'Take the symbol of Tradition' }
      ] },
    // ---------------------------------------------------------------- 05
    { n: 5, place: 'Thrissur', title: 'The Festival Mystery', to: 'Vadakkunnathan Temple', symbol: 'culture',
      reward: { badge: 'Cultural Ambassador Badge', points: 250 },
      steps: [
        { type: 'travel', at: 'Vadakkunnathan Temple', title: 'Explore Thrissur' },
        { type: 'talk', who: 'organiser', with: 'meera', title: 'Help the festival organisers', lines: [
          ['organiser', 'The preparations have taken months. Now everything is in chaos.'],
          ['meera', 'Someone is deliberately trying to stop the festival.'],
          ['player', 'We will find out who is responsible.'],
          ['organiser', 'Our chenda drums have been stolen, and loudspeakers are telling everyone the festival is cancelled!']] },
        { type: 'find', count: 3, item: 'a chenda drum', title: 'Find the missing chenda', desc: 'Find the three stolen chenda drums around the temple grounds.' },
        { type: 'rhythm', name: 'Chenda melam', title: 'Play the chenda', icon: '\u{1FA98}', beats: 16, bpm: 104, button: 'Beat the chenda!', hint: 'Keep the rhythm with the melam: press Space (or tap) as each beat reaches the drum.' },
        { type: 'press', count: 1, title: 'Find the false announcements', desc: 'Track the hidden loudspeaker that keeps announcing the festival is cancelled.', verb: 'Switch off the loudspeaker', done: 'The fake announcements stop.' },
        { type: 'chase', who: 'agent', title: 'Stop the saboteurs', desc: 'A saboteur is running for the gate. Catch him!', time: 45, shout: 'He is getting away!', caught: 'Caught! The saboteur hands over the stolen festival bells.', fail: 'The saboteur escaped.' },
        { type: 'scene', lines: [
          ['narrator', 'The drums thunder, the parasols rise, and the festival goes ahead.'],
          ['narrator', 'During the celebration, a carved emblem gleams among the festival ornaments: the fifth symbol.']] },
        { type: 'symbol', symbol: 'culture', title: 'Take the symbol of Culture' },
        { type: 'scene', lines: [
          ['narrator', 'Then the giant screen over the crowd flickers. A man in dark glasses appears.'],
          ['collector', 'Enjoy your celebrations. Soon, there will be nothing left to celebrate.'],
          ['meera', 'The Collector. So that is the face behind all this.']] }
      ] },
    // ---------------------------------------------------------------- 06
    { n: 6, place: 'Kochi', title: 'The Stolen Artefact', to: 'Mattancherry Palace', symbol: 'adventure',
      reward: { badge: 'Heritage Explorer Badge', points: 250 },
      steps: [
        { type: 'travel', at: 'Chinese Fishing Nets', title: 'Explore Fort Kochi' },
        { type: 'scene', lines: [
          ['meera', 'Fort Kochi has welcomed travellers from all over the world. Portuguese, Dutch, British, Arab and Chinese influences can still be seen here.'],
          ['appuppan', 'History is not just about monuments. It is about the people who built connections across the world.']] },
        { type: 'reach', at: 'Chinese Fishing Nets', title: 'Visit the Chinese fishing nets', desc: 'Walk down to the great cantilevered nets on the shore.' },
        { type: 'talk', who: 'guard', at: 'Mattancherry Palace', title: 'Investigate Mattancherry Palace', lines: [
          ['guard', 'An ancient ship’s astrolabe, from Kerala’s maritime history, was taken from our heritage collection last night.'],
          ['guard', 'The thief was seen running towards Jew Town.']] },
        { type: 'find', count: 3, at: 'Paradesi Synagogue', item: 'a clue', title: 'Search Jew Town for clues', desc: 'Search the lanes around the Paradesi Synagogue.' },
        { type: 'quiz', name: 'A historical puzzle', title: 'Solve the historical puzzle', questions: [
          { q: 'Who built the Mattancherry Palace in 1555?', a: ['The Portuguese', 'The British', 'The Mughals'], c: 0, why: 'It was gifted to the Raja of Kochi; the Dutch later renovated it, so it is called the Dutch Palace.' },
          { q: 'The Chinese fishing nets are said to have come with traders from...', a: ['Kublai Khan’s court', 'Portugal', 'Egypt'], c: 0, why: 'Legend credits Chinese traders in the 14th century.' },
          { q: 'The floor of the Paradesi Synagogue is famous for...', a: ['Hand-painted Chinese tiles', 'Marble mosaics', 'Teak planks'], c: 0, why: 'No two of its blue willow-pattern tiles are alike.' },
          { q: 'Vasco da Gama was first buried in Kochi at...', a: ['St. Francis Church', 'Santa Cruz Basilica', 'Mattancherry Palace'], c: 0, why: 'His remains were later taken back to Portugal.' }
        ] },
        { type: 'chase', who: 'agent', at: 'Paradesi Synagogue', title: 'Boss: The Collector’s Agent', desc: 'The agent is running through the narrow streets with the artefact. Catch him!', time: 55, speed: 6.3, shout: 'That’s the agent!', caught: 'You grab his bag, but he twists free and jumps into a waiting car!', fail: 'The agent slipped away into the lanes.' },
        { type: 'drive', vehicle: 'scooter', title: 'Boss: The getaway car', desc: 'Ride the scooter after the agent’s black car. Stay right behind it to force it to stop!', time: 120, speed: 15, caught: 'The car skids to a stop. You recovered the astrolabe!', fail: 'The car got away.' },
        { type: 'scene', lines: [
          ['narrator', 'In the agent’s bag, beside the astrolabe, is a folded blueprint: an operation in Kerala’s forests and mountains.'],
          ['appuppan', 'And look, a compass emblem is set into the astrolabe. The sixth symbol: Adventure.']] },
        { type: 'symbol', symbol: 'adventure', title: 'Take the symbol of Adventure' }
      ] },
    // ---------------------------------------------------------------- 07
    { n: 7, place: 'Athirappilly', title: 'The Waterfall Mission', to: 'Athirappilly Waterfalls',
      reward: { badge: 'Nature Protector Badge', points: 250 },
      steps: [
        { type: 'travel', at: 'Athirappilly Waterfalls', title: 'Explore Athirappilly Falls' },
        { type: 'talk', who: 'ranger', with: 'meera', title: 'The ranger’s call', lines: [
          ['ranger', 'These waters support entire ecosystems. If the pollution continues, the damage will spread far beyond this forest.'],
          ['meera', 'We need to locate the dumping site.']] },
        { type: 'timed', time: 45, distance: 75, title: 'Navigate the forest trail', desc: 'Follow the trail along the river to the marker before dark!', made: 'You found the dumping site.' },
        { type: 'photo', count: 2, title: 'Find the dumping vehicles', desc: 'Photograph the two trucks dumping waste near the river.', verb: '\u{1F4F7} Photograph the truck' },
        { type: 'drive', vehicle: 'car', target: 'lorry', title: 'Vehicle chase: the dumping truck', desc: 'A truck is fleeing with the evidence! Drive after it and force it to stop.', time: 120, speed: 13, caught: 'The truck pulls over. The driver hands over the dumping papers.', fail: 'The truck got away.' },
        { type: 'find', count: 3, item: 'evidence', title: 'Collect environmental evidence', desc: 'Collect water samples and waste labels.' },
        { type: 'press', count: 3, title: 'Clear the blocked drainage', desc: 'Pull the waste out of three blocked drainage channels.', verb: 'Clear the channel', done: 'The water flows again.' },
        { type: 'press', count: 1, title: 'Stop the pollution operation', desc: 'Shut the valve on the dumping pipe.', verb: 'Shut the valve', done: 'The dumping has stopped!' },
        { type: 'timed', who: 'ranger', time: 50, distance: 65, title: 'Deliver the evidence', desc: 'Run the evidence to the ranger before the trucks escape!', made: 'The ranger radios the police. The trucks are stopped.' },
        { type: 'scene', lines: [['narrator', 'Among the dumped barrels lies a note in the Collector’s hand:'], ['collector', '"The mountains hold what the rivers cannot hide."'], ['meera', 'The mountains... Munnar!']] }
      ] },
    // ---------------------------------------------------------------- 08
    { n: 8, place: 'Munnar', title: 'The Secret of the Mountains', to: 'Munnar Tea Gardens',
      reward: { badge: 'Mountain Explorer Badge', points: 300 },
      steps: [
        { type: 'travel', at: 'Munnar Tea Gardens', title: 'Explore the Munnar tea plantations' },
        { type: 'scene', lines: [
          ['appuppan', 'These mountains have witnessed generations of people working, living and protecting this land.'],
          ['meera', 'Look at those tracks. Someone has been here recently.'],
          ['appuppan', 'They are after an ancient stone. Legend calls it the seventh key to the Heart of Kerala.']] },
        { type: 'reach', at: 'Idukki Arch Dam', title: 'Visit the dam', desc: 'The tracks lead down to the dam. Look around.' },
        { type: 'find', count: 3, at: 'Munnar Tea Gardens', item: 'a clue', title: 'Search the abandoned mountain cabin', desc: 'Find clues in and around the old cabin.' },
        { type: 'find', count: 6, item: 'a bundle of tea leaves', title: 'The tea-leaf challenge', desc: 'Help the pickers: collect six bundles of fresh tea leaves.', spread: 6 },
        { type: 'timed', time: 45, distance: 80, title: 'Navigate the mountain trail', desc: 'Climb the misty trail to the marker before the fog closes in!' },
        { type: 'photo', count: 1, at: 'Eravikulam National Park', title: 'Photograph the Nilgiri Tahr', desc: 'Find the rare Nilgiri Tahr on the grassland and photograph them.', verb: '\u{1F4F7} Photograph the tahr' },
        { type: 'find', count: 1, look: 'key', item: 'the ancient stone marker', title: 'Locate the ancient stone marker', desc: 'The journal says the stone lies on the high grassland.' },
        { type: 'timed', time: 40, distance: 60, title: 'Boss: The Mountain Pursuer', desc: 'The Collector’s agent is after the stone! Run down the trail to the jeep!', made: 'You reach the jeep!', fail: 'The pursuer cut you off.' },
        { type: 'drive', mode: 'escape', vehicle: 'car', distance: 450, title: 'Escape down the mountain road', desc: 'Drive down the mountain road to the checkpoint before the pursuer catches you!', time: 90, speed: 15, made: 'You escaped with the stone!', fail: 'The pursuer caught you.' },
        { type: 'scene', lines: [['appuppan', 'It is not the key itself. It is a map fragment.'], ['meera', 'It points towards Thekkady.']] }
      ] },
    // ---------------------------------------------------------------- 09
    { n: 9, place: 'Thekkady – Periyar', title: 'The Wildlife Rescue', to: 'Thekkady Periyar Wildlife',
      reward: { badge: 'Wildlife Guardian Level 2', points: 300 },
      steps: [
        { type: 'travel', at: 'Thekkady Periyar Wildlife', title: 'Visit Periyar Lake' },
        { type: 'talk', who: 'officer', with: 'meera', title: 'Join the wildlife observation mission', lines: [
          ['officer', 'These animals depend on a delicate balance. Even small disturbances can affect their movement.'],
          ['meera', 'We need to understand what is happening before it gets worse.'],
          ['officer', 'An elephant herd has left its usual grounds. Watch them from a safe distance and photograph them for our records.']] },
        { type: 'photo', count: 2, title: 'Photograph the wildlife', desc: 'Photograph the elephants and other wildlife from the safe viewpoints.', verb: '\u{1F4F7} Take a photo from here' },
        { type: 'find', count: 3, item: 'signs of disturbance', title: 'Track unusual forest activity', desc: 'Follow the tyre tracks and broken branches.' },
        { type: 'press', count: 3, title: 'Disable the illegal equipment', desc: 'Loud generators and sirens are scaring the herd away. Switch them off.', verb: 'Switch it off', done: 'Silence returns to the forest.' },
        { type: 'press', count: 3, title: 'Help restore the area', desc: 'Plant saplings where the ground was cleared.', verb: 'Plant a sapling', done: 'A sapling planted.' },
        { type: 'scene', lines: [['narrator', 'In the abandoned camp you find a radio, still crackling. A message from the Collector:'], ['collector', '"Phase two. Move the operation to the backwaters of Alappuzha."']] }
      ] },
    // ---------------------------------------------------------------- 10
    { n: 10, place: 'Alappuzha – Kumarakom', title: 'The Great Backwater Challenge', to: 'Alappuzha Backwaters',
      reward: { badge: 'Backwater Champion Badge', points: 350 },
      steps: [
        { type: 'travel', at: 'Alappuzha Backwaters', title: 'Explore Alappuzha' },
        { type: 'talk', who: 'boatman', with: 'meera', title: 'Meet the boatmen', lines: [
          ['boatman', 'These waters are our life. Our homes, our work and our traditions are all connected to them.'],
          ['boatman', 'Someone sabotaged our snake boats before the race and dumped waste in the canal.'],
          ['player', 'We will make sure this journey does not end here.']] },
        { type: 'reach', at: 'Vembanad Lake', title: 'Take a houseboat journey', desc: 'Cruise out across Vembanad Lake to look for the polluters.' },
        { type: 'timed', at: 'Alappuzha Backwaters', time: 45, distance: 70, title: 'The canoe navigation challenge', desc: 'Race along the canal bank to the marker!' },
        { type: 'find', count: 3, item: 'fishing gear', title: 'Recover the missing fishing equipment', desc: 'Help a local family find their nets and traps.' },
        { type: 'rhythm', name: 'Snake boat race', title: 'Race the snake boat', icon: '\u{1F6F6}', beats: 18, bpm: 118, button: 'Paddle!', hint: 'The vanchipattu song sets the stroke: paddle (Space or tap) on every beat to win!' },
        { type: 'find', count: 5, item: 'waste', title: 'Clean up the waterway', desc: 'Fish five pieces of waste out of the polluted canal.', spread: 6 },
        { type: 'find', count: 1, look: 'key', item: 'a hidden message', title: 'The abandoned houseboat', desc: 'Search the abandoned houseboat for the hidden message.' },
        { type: 'scene', lines: [
          ['meera', 'It’s the last part of the map: Kovalam and Thiruvananthapuram!'],
          ['appuppan', 'But read the end... the Collector has already reached the destination.']] }
      ] },
    // ---------------------------------------------------------------- 11
    { n: 11, place: 'Varkala – Kovalam', title: 'The Coastal Mystery', to: 'Varkala Cliff',
      reward: { badge: 'Coastal Explorer Badge', points: 350 },
      steps: [
        { type: 'travel', at: 'Varkala Cliff', title: 'Explore Varkala Cliff' },
        { type: 'talk', who: 'historian', with: 'meera', title: 'Meet the local historian', lines: [
          ['historian', 'The sea has always been a gateway to Kerala. Many travellers came here, but some stories were never recorded.'],
          ['meera', 'The last clue must be hidden somewhere along this coastline.'],
          ['historian', 'The old map fragment is near the cliffs. But be quick: men in black boats were here at dawn.']] },
        { type: 'find', count: 1, look: 'key', at: 'Varkala Cliff', item: 'the ancient map fragment', title: 'Find the ancient map fragment', desc: 'Search the cliff top and the steps down to Papanasam beach.' },
        { type: 'reach', at: 'Jatayu Earth’s Center', title: 'Visit Jatayu Earth’s Center', desc: 'The fragment shows the great bird on the rock. Go there.' },
        { type: 'photo', count: 3, at: 'Varkala Cliff', title: 'The coastal photography challenge', desc: 'Take three photos of the cliffs from the marked viewpoints for the journal.', verb: '\u{1F4F7} Take the photo' },
        { type: 'travel', at: 'Kovalam Beach', title: 'Travel to Kovalam' },
        { type: 'reach', at: 'Kovalam Beach', title: 'Climb to the lighthouse', desc: 'Cross Lighthouse Beach and climb Kurumkal hill to the red-and-white lighthouse.' },
        { type: 'puzzle', name: 'The final map', title: 'Solve the final map puzzle', icons: ['\u{1F33F}', '\u{1F3DB}️', '\u{1F418}', '\u{1FA94}', '\u{1F3AD}', '\u{1F9ED}'], length: 6,
          hint: 'Place the six symbols you have found in the order the lighthouse beam shows them.' },
        { type: 'scene', lines: [
          ['narrator', 'The map pieces fit together. The Heart of Kerala lies beneath an ancient heritage site in Thiruvananthapuram.'],
          ['meera', 'Wait... where is Appuppan? He was right behind us!']] },
        { type: 'message', kicker: 'A message from the Collector', text: 'Come alone. The final chapter begins now.', sub: 'The Collector has captured Appuppan', ms: 5200 }
      ] },
    // ---------------------------------------------------------------- 12
    { n: 12, place: 'Thiruvananthapuram', title: 'The Heart of Kerala', to: 'Sree Padmanabhaswamy Temple', symbol: 'unity',
      reward: { badge: 'Guardian of God’s Own Country', points: 400 },
      finale: { points: 1000 },
      steps: [
        { type: 'travel', at: 'Sree Padmanabhaswamy Temple' },
        { type: 'scene', lines: [
          ['narrator', 'The Collector has assembled the seven symbols. He waits for you by the temple walls.'],
          ['collector', 'You have travelled across Kerala collecting these symbols. You think you understand this land?'],
          ['player', 'I have met its people. I have seen its beauty. I have learned its stories.'],
          ['collector', 'Stories don’t create empires. Money does.'],
          ['player', 'Perhaps. But a place without its people, culture and nature is not worth owning.']] },
        { type: 'timed', who: 'appuppan', time: 45, distance: 65, title: 'Rescue Appuppan', desc: 'Appuppan is held at the edge of the temple streets. Reach him before the guards return!', made: 'You free Appuppan!' },
        { type: 'talk', who: 'appuppan', with: 'meera', title: 'Talk to Appuppan', lines: [['appuppan', 'I knew you would come. The mechanism is beneath the old palace. Hurry!']] },
        { type: 'reach', at: 'Kuthiramalika Palace', title: 'Explore the final heritage location', desc: 'Go to the old palace by the temple tank.' },
        { type: 'puzzle', name: 'The seven symbols', title: 'Stage 1: The seven-symbol puzzle', icons: ICONS, length: 7, hint: 'The ancient lock shows the seven symbols in order. Repeat all seven.' },
        { type: 'press', count: 3, title: 'Stop the mechanism', desc: 'The Collector has started the ancient mechanism. Pull the three levers to stop it!', verb: 'Pull the lever', done: 'A lever pulled.' },
        { type: 'timed', time: 40, distance: 80, title: 'Stage 2: The obstacle course', desc: 'Get through the collapsing passages to the marker!' },
        { type: 'find', count: 6, look: 'key', item: 'a scattered symbol', title: 'Stage 3: Recover the symbols', desc: 'The symbols scattered as the mechanism shook. Gather them!', spread: 6 },
        { type: 'drive', vehicle: 'car', title: 'The final chase', desc: 'The Collector races off in his car with the last symbol. Chase him through the city!', time: 120, speed: 17, caught: 'His car spins out by the temple walls. He runs on foot!', fail: 'The Collector got away. After him!' },
        { type: 'chase', who: 'collector', title: 'Stage 4: The final confrontation', desc: 'The Collector is fleeing with the last symbol. Stop him!', time: 60, speed: 6.4, shout: 'The Collector is running!', caught: 'You stopped the Collector!', fail: 'The Collector got away. After him again!' },
        { type: 'scene', lines: [
          ['collector', 'How can you protect something so vast? Kerala has thousands of places, millions of people and endless stories.'],
          ['appuppan', 'That is exactly why it cannot belong to one person.'],
          ['meera', 'Every person who protects this land becomes part of its story.'],
          ['player', 'Kerala is not a treasure to be owned. It is a legacy to be shared.']] },
        { type: 'symbol', symbol: 'unity', title: 'Restore the seven symbols', desc: 'Return the symbols to their place. Press E at the light.' },
        { type: 'scene', lines: [
          ['narrator', 'The seven symbols begin to glow. The ancient mechanism opens, revealing a chamber, and inside it, the explorer’s original journal.'],
          ['narrator', 'Its final page reads: "The greatest treasure of Kerala is not hidden beneath the earth. It lives in its mountains, rivers, forests, beaches, traditions and people."'],
          ['narrator', 'Houseboats glide through the backwaters. Tea gardens stretch across the mountains. Drums sound in the villages. Children play along the beaches.']] }
      ] }
  ];
  CHAPTERS.forEach((c) => { c.minutes = c.minutes || 20; });

  KT.STORY = { CAST, SYMBOLS, PLOT, CHAPTERS };
})();
