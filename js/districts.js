// The 14 districts of Kerala, south to north, with facts shown in game.
(function () {
  'use strict';
  KT.DISTRICTS = [
    { id: 'tvm', name: 'Thiruvananthapuram', ml: 'തിരുവനന്തപുരം', landmark: 'gopuram',
      facts: ['Thiruvananthapuram is Kerala’s capital. Its name means "City of Lord Ananta".', 'The Sree Padmanabhaswamy Temple has a towering seven-tier gopuram.', 'Kovalam and Varkala beaches are just a short ride away.'] },
    { id: 'klm', name: 'Kollam', ml: 'കൊല്ലം', landmark: 'lighthouse',
      facts: ['Kollam was a great port of the spice trade, visited by Chinese, Arab and Roman merchants.', 'The Thangassery lighthouse has guided ships since 1902.', 'Ashtamudi lake here has eight arms — "ashta" means eight.'] },
    { id: 'pta', name: 'Pathanamthitta', ml: 'പത്തനംതിട്ട', landmark: 'shrine',
      facts: ['Pathanamthitta is home to Sabarimala, visited by millions of pilgrims every year.', 'The Aranmula snake boat race and the famous Aranmula metal mirror come from here.'] },
    { id: 'alp', name: 'Alappuzha', ml: 'ആലപ്പുഴ', landmark: 'backwaters', home: true,
      facts: ['Alappuzha is the "Venice of the East", laced with canals and backwaters.', 'The Nehru Trophy snake boat race is held on Punnamada lake every August.', 'Walk through the backwaters arch to return to the Alleppey promenade.'] },
    { id: 'ktm', name: 'Kottayam', ml: 'കോട്ടയം', landmark: 'church',
      facts: ['Kottayam is the "Land of Letters, Lakes and Latex" — books, backwaters and rubber.', 'It was the first town in India to achieve 100% literacy, in 1989.'] },
    { id: 'idk', name: 'Idukki', ml: 'ഇടുക്കി', landmark: 'dam',
      facts: ['The Idukki arch dam, 168 metres tall, stands between two granite hills.', 'Spice plantations of cardamom and pepper cover these misty hills.'] },
    { id: 'ekm', name: 'Ernakulam', ml: 'എറണാകുളം', landmark: 'nets',
      facts: ['Ernakulam holds Kochi, the "Queen of the Arabian Sea".', 'Fort Kochi’s Chinese fishing nets and Jew Town’s spice markets are world famous.', 'Kochi Metro and Water Metro connect the city and its islands.'] },
    { id: 'tsr', name: 'Thrissur', ml: 'തൃശ്ശൂർ', landmark: 'temple',
      facts: ['Thrissur is the cultural capital of Kerala.', 'Thrissur Pooram brings together decorated elephants, percussion and fireworks.', 'Guruvayur and the Athirappilly waterfalls are nearby.'] },
    { id: 'pkd', name: 'Palakkad', ml: 'പാലക്കാട്', landmark: 'fort',
      facts: ['Palakkad is the "Granary of Kerala", with endless paddy fields.', 'Tipu Sultan’s fort, built in 1766, still stands in the town.', 'The Palakkad Gap is a 40 km break in the Western Ghats.'] },
    { id: 'mlp', name: 'Malappuram', ml: 'മലപ്പുറം', landmark: 'mosque',
      facts: ['Malappuram is known for its love of football — sevens tournaments draw huge crowds.', 'Kottakkal here is world famous for Ayurveda.'] },
    { id: 'kkd', name: 'Kozhikode', ml: 'കോഴിക്കോട്', landmark: 'beach',
      facts: ['Vasco da Gama landed at Kappad beach near Kozhikode in 1498.', 'Try Kozhikodan halwa and the famous Malabar biryani!'] },
    { id: 'wyd', name: 'Wayanad', ml: 'വയനാട്', landmark: 'rocks',
      facts: ['Wayanad’s Edakkal caves hold carvings more than 6,000 years old.', 'Coffee, tea and spice estates cover these cool green hills.'] },
    { id: 'knr', name: 'Kannur', ml: 'കണ്ണൂർ', landmark: 'fort',
      facts: ['Kannur is the land of Theyyam, a spectacular ritual dance.', 'St. Angelo Fort was built by the Portuguese in 1505.', 'Muzhappilangad is the longest drive-in beach in India.'] },
    { id: 'ksd', name: 'Kasaragod', ml: 'കാസർഗോഡ്', landmark: 'bekal',
      facts: ['Kasaragod is Kerala’s northernmost district, where seven languages are spoken.', 'Bekal Fort, a keyhole-shaped fort by the sea, is the largest in Kerala.'] }
  ];

  // Major tourist attractions of each district. `main` is the landmark
  // built beside the district centre; the others stand in the district's
  // town. kind picks the model, icon is used on the maps.
  const SIGHTS = {
    tvm: [
      { name: 'Sree Padmanabhaswamy Temple', kind: 'main', icon: '\u{1F6D5}', facts: ['The temple of Lord Padmanabha, reclining on the serpent Ananta, is one of the richest temples in the world.', 'Its seven-tier gopuram rises over the Padmatheertham tank in the old fort area.'] },
      { name: 'Napier Museum', kind: 'museum', icon: '\u{1F3DB}\uFE0F', colors: [0xb5452e, 0xf2e2c4, 0x4a4a52], facts: ['Built in 1880, the Napier Museum is famous for its striped Indo-Saracenic building with Kerala-style roofs.', 'Inside are bronze idols, ancient ornaments, a temple chariot and ivory carvings.'] },
      { name: 'Varkala Cliff', kind: 'cliff', icon: '\u{1F3D6}\uFE0F', facts: ['At Varkala, red laterite cliffs rise straight above the Arabian Sea.', 'Cafés line the cliff top and Papanasam beach lies below, with a natural spring.'] }
    ],
    klm: [
      { name: 'Thangassery Lighthouse', kind: 'main', icon: '\u{1F6A8}', facts: ['Built in 1902, the 41 m Thangassery lighthouse is one of the tallest in Kerala.', 'Thangassery was once a Portuguese and Dutch trading settlement.'] },
      { name: 'Jatayu Earth’s Center', kind: 'jatayu', icon: '\u{1F985}', facts: ['On Jatayupara hill at Chadayamangalam lies the world’s largest bird sculpture: Jatayu, 61 m long.', 'In the Ramayana, the great bird Jatayu fell here fighting Ravana to save Sita.'] },
      { name: 'Ashtamudi Lake', kind: 'lake', icon: '\u{1F6A3}', facts: ['Ashtamudi means "eight braids": the lake spreads into eight arms.', 'It is the gateway to the backwaters, with houseboat cruises to Alappuzha.'] }
    ],
    pta: [
      { name: 'Sabarimala', kind: 'main', icon: '\u26F0\uFE0F', facts: ['The hill shrine of Lord Ayyappa at Sabarimala draws millions of pilgrims every season.', 'Pilgrims climb the 18 holy steps, the Pathinettam Padi.'] },
      { name: 'Aranmula Snake Boats', kind: 'snakeboat', icon: '\u{1F6F6}', facts: ['The Aranmula Uthrattathi boat race on the Pampa river is held by the Parthasarathy Temple.', 'Each chundan vallam (snake boat) is over 30 m long and rowed by more than 100 oarsmen singing vanchipattu.', 'Aranmula is also famous for its metal mirror, the Aranmula kannadi.'] }
    ],
    alp: [
      { name: 'Alappuzha Backwaters', kind: 'main', icon: '\u{1F6E5}\uFE0F', facts: ['Houseboats (kettuvallam) cruise the canals and lakes of Kuttanad.', 'Kuttanad farms rice below sea level, protected by dykes.'] },
      { name: 'Alappuzha Beach & Lighthouse', kind: 'beachLight', icon: '\u{1F3D6}\uFE0F', facts: ['Alappuzha beach has a 150-year-old pier reaching into the sea.', 'Its lighthouse, built in 1862, was the first on Kerala’s coast. You can climb it for the view.'] }
    ],
    ktm: [
      { name: 'Thirunakkara Church', kind: 'main', icon: '\u26EA', facts: ['Kottayam is a centre of Kerala’s ancient Syrian Christian churches.', 'Kottayam was the first town in India to achieve 100% literacy.'] },
      { name: 'Kumarakom Bird Sanctuary', kind: 'birds', icon: '\u{1F426}', facts: ['On the banks of Vembanad lake, Kumarakom bird sanctuary is home to egrets, herons, cormorants and kingfishers.', 'Migratory birds from Siberia visit in winter.'] }
    ],
    idk: [
      { name: 'Idukki Arch Dam', kind: 'main', icon: '\u{1F30A}', facts: ['Built in 1973 between the Kuravan and Kurathi hills, it is one of Asia’s highest arch dams.'] },
      { name: 'Munnar Tea Gardens', kind: 'tea', icon: '\u{1F375}', facts: ['Munnar’s rolling hills are carpeted with tea gardens at 1,600 m.', 'The rare Neelakurinji flowers turn the hills blue once every 12 years.', 'Eravikulam National Park nearby protects the Nilgiri tahr.'] }
    ],
    ekm: [
      { name: 'Chinese Fishing Nets', kind: 'main', icon: '\u{1F3A3}', facts: ['The cantilevered Chinese nets of Fort Kochi may have come with traders from the court of Kublai Khan.', 'Try fishing here: cast the net at a Fishing Point!'] },
      { name: 'Mattancherry Palace', kind: 'museum', icon: '\u{1F3EF}', colors: [0xf0e6cf, 0xa0522d, 0x7a3b2e], facts: ['Built by the Portuguese in 1555 and gifted to the Raja of Kochi, it is known as the Dutch Palace.', 'Its walls hold some of the finest Hindu mural paintings in Kerala.', 'Jew Town and the 1568 Paradesi Synagogue are a short walk away.'] }
    ],
    tsr: [
      { name: 'Vadakkunnathan Temple', kind: 'main', icon: '\u{1F418}', facts: ['Thrissur Pooram is held at the Vadakkunnathan temple grounds, with caparisoned elephants and fireworks.'] },
      { name: 'Athirappilly Waterfalls', kind: 'waterfall', icon: '\u{1F4A7}', facts: ['Athirappilly, 25 m high, is the largest waterfall in Kerala — the "Niagara of India".', 'It lies on the Chalakudy river at the edge of the Sholayar forests.'] },
      { name: 'Guruvayur Temple', kind: 'shrine', icon: '\u{1FA94}', facts: ['Guruvayur is one of the most important Krishna temples in India.', 'Its Punnathur Kotta is home to dozens of temple elephants.'] }
    ],
    pkd: [
      { name: 'Palakkad Fort', kind: 'main', icon: '\u{1F3F0}', facts: ['Tipu Sultan’s granite fort was rebuilt by Hyder Ali in 1766.'] },
      { name: 'Malampuzha Dam & Gardens', kind: 'garden', icon: '\u{1F33A}', facts: ['Malampuzha has beautiful gardens below its dam, with fountains and a ropeway.', 'The famous Yakshi sculpture by Kanayi Kunhiraman stands here.'] }
    ],
    mlp: [
      { name: 'Malappuram Mosque', kind: 'main', icon: '\u{1F54C}', facts: ['Malappuram has some of Kerala’s oldest mosques.'] },
      { name: 'Kottakkal Arya Vaidya Sala', kind: 'museum', icon: '\u{1F33F}', colors: [0xf4efe2, 0x2f7a3e, 0x8a3b24], facts: ['Founded in 1902 by Vaidyaratnam P.S. Varier, Kottakkal is world famous for Ayurveda.', 'Its herbal medicines are made from plants grown in its own gardens.'] },
      { name: 'Football Ground', kind: 'football', icon: '\u26BD', facts: ['Malappuram loves football! Sevens tournaments fill local grounds with thousands of fans.', 'Many of Kerala’s best footballers grew up playing here.'] }
    ],
    kkd: [
      { name: 'Kappad Beach', kind: 'main', icon: '\u{1F3D6}\uFE0F', facts: ['Vasco da Gama landed at Kappad on 20 May 1498. A small memorial marks the spot.'] },
      { name: 'Thusharagiri Waterfalls', kind: 'waterfall', icon: '\u{1F4A7}', facts: ['Thusharagiri means "mist-capped mountain". Three waterfalls tumble through the forest here.'] },
      { name: 'Kozhikode Beach', kind: 'beachLight', icon: '\u{1F305}', facts: ['Watch the sunset from Kozhikode beach with a plate of kallummakkaya (mussels) and a glass of sulaimani tea.', 'The old pier and lighthouse recall the city’s spice trade with the world.'] }
    ],
    wyd: [
      { name: 'Edakkal Caves', kind: 'main', icon: '\u{1FAA8}', facts: ['Carvings in the Edakkal caves are more than 6,000 years old.'] },
      { name: 'Banasura Sagar Dam', kind: 'dam', icon: '\u{1F30A}', facts: ['Banasura Sagar is India’s largest earth dam, with little islands in its lake.', 'Boats take visitors around the islands below the Banasura hills.'] }
    ],
    knr: [
      { name: 'St. Angelo Fort', kind: 'main', icon: '\u{1F3F0}', facts: ['The Portuguese built St. Angelo Fort facing the sea in 1505.'] },
      { name: 'Theyyam', kind: 'theyyam', icon: '\u{1F3AD}', facts: ['Theyyam is a ritual art of North Malabar where performers become gods for a night.', 'Huge headdresses, red face paint and the beat of the chenda light up temple courtyards from December to May.'] },
      { name: 'Muzhappilangad Drive-in Beach', kind: 'beach', icon: '\u{1F697}', facts: ['At 4 km, Muzhappilangad is India’s longest drive-in beach: you can drive along the firm sand.', 'Dharmadam island lies just offshore.'] }
    ],
    ksd: [
      { name: 'Bekal Fort', kind: 'main', icon: '\u{1F3F0}', facts: ['Bekal Fort is Kerala’s largest fort, shaped like a giant keyhole by the sea.'] },
      { name: 'Ananthapura Lake Temple', kind: 'lakeTemple', icon: '\u{1F6D5}', facts: ['Ananthapura is the only lake temple in Kerala, standing in the middle of a lake.', 'It is said to be the original seat of Lord Padmanabha of Thiruvananthapuram.'] }
    ]
  };
  KT.DISTRICTS.forEach((d) => { d.sights = SIGHTS[d.id] || []; });
})();
