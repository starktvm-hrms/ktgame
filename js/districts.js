// The 14 districts of Kerala, south to north, with facts shown in game.
(function () {
  'use strict';
  KT.DISTRICTS = [
    { id: 'tvm', name: 'Thiruvananthapuram', ml: 'തിരുവനന്തപുരം', landmark: 'none',
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
    // Thiruvananthapuram: each sight stands on its own road (see the
    // branch roads in highway.js); place = { road, stop, along, lat }
    tvm: [
      { name: 'Sree Padmanabhaswamy Temple', kind: 'gopuramTemple', icon: '\u{1F6D5}', place: { road: 'MG Road', stop: 'East Fort', along: 5, lat: -64 }, facts: ['Lord Vishnu lies here as Padmanabha, reclining on the serpent Anantha.', 'Its seven-tiered gopuram rises above the Padmatheertham tank inside the old East Fort.', 'The temple blends Kerala and Dravidian styles, with long corridors of carved granite pillars.'] },
      { name: 'Kuthiramalika Palace', kind: 'palace', icon: '\u{1F3EF}', colors: [0xeadfc4, 0x5a3420, 0x8e3b24], place: { road: 'MG Road', stop: 'East Fort', along: -62, lat: -56 }, facts: ['Kuthiramalika means "mansion of horses": 122 wooden horses are carved under its roof.', 'It was built in the 1840s by Maharaja Swathi Thirunal, a king who was also a great composer of music.', 'Today it is a museum of royal treasures, and a music festival is held in its courtyard every year.'] },
      { name: 'East Fort', kind: 'fortGate', icon: '\u{1F3F0}', place: { road: 'MG Road', stop: 'East Fort', along: -55, lat: 30 }, facts: ['East Fort, Kizhakke Kotta, is the old walled area round the Padmanabhaswamy Temple.', 'Its walls and gateways were built by the kings of Travancore in the 18th century.', 'Today it is the busy heart of the city, full of shops, buses and pilgrims.'] },
      { name: 'Meshan Mani', kind: 'clockTower', icon: '\u{1F570}️', place: { road: 'MG Road', stop: 'East Fort', along: 5, lat: 28 }, facts: ['Meshan Mani is an old mechanical clock on a tower near the temple.', 'When it strikes the hour, two rams butt the cheeks of a bearded man, who opens and closes his mouth.', 'People still gather below to watch it strike.'] },
      { name: 'Secretariat', kind: 'secretariat', icon: '\u{1F3DB}️', place: { road: 'MG Road', stop: 'Statue Junction', along: 0, lat: 52 }, facts: ['The Secretariat is the seat of the Government of Kerala.', 'The grand building was completed in 1869, in the reign of Maharaja Ayilyam Thirunal.', 'Its white front, with rows of columns and a central dome, is in a Roman and Dutch style.'] },
      { name: 'Napier Museum', kind: 'museum', icon: '\u{1F3DB}️', colors: [0xb5452e, 0xf2e2c4, 0x4a4a52], place: { road: 'MG Road', stop: 'Museum Junction', along: -40, lat: 52 }, facts: ['Built in 1880, the Napier Museum is named after Lord Napier, a Governor of Madras.', 'Its striped walls and Kerala-style gabled roofs keep the halls cool without fans: natural air conditioning.', 'Inside are bronze idols, ancient ornaments, a temple chariot and ivory carvings.'] },
      { name: 'Thiruvananthapuram Zoo', kind: 'zoo', icon: '\u{1F992}', place: { road: 'MG Road', stop: 'Museum Junction', along: -55, lat: -60 }, facts: ['Opened in 1857, it is one of the oldest zoos in India.', 'It lies in the leafy Museum and Zoo compound, next to the Napier Museum.', 'The animals live in large open enclosures among trees and ponds.'] },
      { name: 'Kanakakkunnu Palace', kind: 'hillPalace', icon: '\u{1F3F0}', place: { road: 'MG Road', stop: 'Museum Junction', along: 40, lat: 58 }, facts: ['Kanakakkunnu Palace stands on a small hill near the museum.', 'It was built by the kings of Travancore and is now used for cultural programmes.', 'Its lawns host Nishagandhi, a festival of classical dance.'] },
      { name: 'Shankhumugham Beach', kind: 'mermaidBeach', icon: '\u{1F3D6}️', place: { road: 'MG Road', stop: 'Shankhumugham', along: 0, lat: 'sea' }, facts: ['Shankhumugham Beach lies close to the city and the airport.', 'On the shore lies the Jalakanyaka, a mermaid sculpture 35 m long by the sculptor Kanayi Kunhiraman.', 'At the Arattu festival, the procession from the Padmanabhaswamy Temple comes here for a holy bath in the sea.'] },
      { name: 'Akkulam Tourist Village', kind: 'lakeVillage', icon: '\u{1F6A3}', place: { road: 'MG Road', stop: 'Akkulam', along: 0, lat: 'land' }, facts: ['Akkulam lies on the backwaters at the edge of the city.', 'You can take a boat out on the lake, or play in the children’s park.', 'It is a favourite place for families to spend an evening.'] },
      { name: 'Koyikkal Palace', kind: 'palace', icon: '\u{1F3EF}', colors: [0xe4d3b0, 0x4a2c1a, 0x7a3322], place: { road: 'Ponmudi Road', stop: 'Nedumangad', along: 60, lat: 48 }, facts: ['Koyikkal Palace at Nedumangad was built in the 15th century for Umayamma Rani of Venad.', 'It is a nalukettu, a Kerala house built round a central courtyard.', 'It now houses a folklore museum and a museum of old coins.'] },
      { name: 'Aruvikkara Dam', kind: 'reservoir', icon: '\u{1F4A7}', place: { road: 'Aruvikkara Road', stop: 'end', along: 22, lat: 0 }, facts: ['Aruvikkara Dam on the Karamana river supplies drinking water to Thiruvananthapuram.', 'Beside the river stands an old Bhagavathy temple, where visitors feed the fish.', 'The reservoir and its gardens make a peaceful picnic spot.'] },
      { name: 'Kallar Meenmutty Waterfalls', kind: 'waterfall', icon: '\u{1F4A7}', place: { road: 'Ponmudi Road', stop: 'Kallar', along: 20, lat: 62 }, facts: ['Meenmutty falls lies near Kallar, on the way up to Ponmudi.', 'You reach it on a forest trek along the Kallar river.', 'Meenmutty means "where the fish are stopped": fish cannot swim up the falls.'] },
      { name: 'Ponmudi Hills', kind: 'hilltop', icon: '⛰️', place: { road: 'Ponmudi Road', stop: 'end', along: 26, lat: 0 }, facts: ['Ponmudi, the "golden peak", is a hill station about 1,100 m above sea level.', 'The road climbs through 22 hairpin bends, past forests, streams and tea gardens.', 'Mist often covers the top, where there is a deer park and a wide view of the ghats.'] },
      { name: 'Ponnumthuruthu Island', kind: 'islandTemple', icon: '\u{1F3DD}️', place: { road: 'Ponnumthuruthu Road', stop: 'end', along: 70, lat: 0 }, facts: ['Ponnumthuruthu, the "golden island", lies in the backwaters near Varkala.', 'On the island stands a Shiva-Parvathi temple about a hundred years old.', 'You reach it by boat across the calm lake.'] }
    ],
    klm: [
      { name: 'Thangassery Lighthouse', kind: 'main', icon: '\u{1F6A8}', facts: ['Built in 1902, the 41 m Thangassery lighthouse is one of the tallest in Kerala.', 'Thangassery was once a Portuguese and Dutch trading settlement.'] },
      { name: 'Jatayu Earth’s Center', kind: 'jatayu', icon: '\u{1F985}', facts: ['On Jatayupara hill at Chadayamangalam lies the world’s largest bird sculpture: Jatayu, 61 m long.', 'In the Ramayana, the great bird Jatayu fell here fighting Ravana to save Sita.'] },
      { name: 'Ashtamudi Lake', kind: 'lake', icon: '\u{1F6A3}', facts: ['Ashtamudi means "eight braids": the lake spreads into eight arms.', 'It is the gateway to the backwaters, with houseboat cruises to Alappuzha.'] },
      { name: "Palaruvi Waterfalls", kind: 'waterfall', icon: '\u{1F4A7}', facts: ["Palaruvi means \"stream of milk\": the water falls 91 m through the forest.", "It lies in the Western Ghats near Aryankavu."] },
      { name: "Thenmala Eco-tourism", kind: 'wildlife', icon: '\u{1F33F}', facts: ["Thenmala was India's first planned eco-tourism destination.", "Walk the canopy trail, see the deer rehabilitation centre and the musical fountain."] }
    ],
    pta: [
      { name: 'Sabarimala', kind: 'main', icon: '\u26F0\uFE0F', facts: ['The hill shrine of Lord Ayyappa at Sabarimala draws millions of pilgrims every season.', 'Pilgrims climb the 18 holy steps, the Pathinettam Padi.'] },
      { name: 'Aranmula Snake Boats', kind: 'snakeboat', icon: '\u{1F6F6}', facts: ['The Aranmula Uthrattathi boat race on the Pampa river is held by the Parthasarathy Temple.', 'Each chundan vallam (snake boat) is over 30 m long and rowed by more than 100 oarsmen singing vanchipattu.', 'Aranmula is also famous for its metal mirror, the Aranmula kannadi.'] },
      { name: "Gavi Forest", kind: 'wildlife', icon: '\u{1F98C}', facts: ["Gavi is a remote forest village famous for its wildlife, trekking and cardamom plantations.", "Elephants, gaur and the Nilgiri tahr live in the surrounding hills."] },
      { name: "Konni Elephant Camp", kind: 'elephantCamp', icon: '\u{1F418}', facts: ["Konni has one of Kerala's oldest elephant training centres, started over a century ago.", "Visitors can watch the elephants bathe and feed and see a museum about them."] },
      { name: "Perunthenaruvi Waterfalls", kind: 'waterfall', icon: '\u{1F4A7}', facts: ["Perunthenaruvi on the Pamba river tumbles over wide black rocks.", "The name means \"big honey stream\"."] }
    ],
    alp: [
      { name: 'Alappuzha Backwaters', kind: 'main', icon: '\u{1F6E5}\uFE0F', facts: ['Houseboats (kettuvallam) cruise the canals and lakes of Kuttanad.', 'Kuttanad farms rice below sea level, protected by dykes.'] },
      { name: 'Alappuzha Beach & Lighthouse', kind: 'beachLight', icon: '\u{1F3D6}\uFE0F', facts: ['Alappuzha beach has a 150-year-old pier reaching into the sea.', 'Its lighthouse, built in 1862, was the first on Kerala’s coast. You can climb it for the view.'] },
      { name: "Ambalappuzha Temple", kind: 'shrine', icon: '\u{1F6D5}', facts: ["The Ambalappuzha Sri Krishna Temple is famous for its sweet rice payasam, offered to the god every day.", "Legend says the king lost a game of chess to Krishna and must pay with rice forever."] },
      { name: "Pathiramanal Island", kind: 'lake', icon: '\u{1F3DD}\uFE0F', facts: ["Pathiramanal, \"sands of midnight\", is a small island in Vembanad lake.", "It is a haven for migratory birds and can be reached only by boat."] },
      { name: "Arthunkal Basilica", kind: 'church', icon: '\u26EA', facts: ["St. Andrew's Basilica at Arthunkal was founded by Portuguese missionaries in 1581.", "Its January feast draws pilgrims of every faith."] }
    ],
    ktm: [
      { name: 'Thirunakkara Church', kind: 'main', icon: '\u26EA', facts: ['Kottayam is a centre of Kerala’s ancient Syrian Christian churches.', 'Kottayam was the first town in India to achieve 100% literacy.'] },
      { name: 'Kumarakom Bird Sanctuary', kind: 'birds', icon: '\u{1F426}', facts: ['On the banks of Vembanad lake, Kumarakom bird sanctuary is home to egrets, herons, cormorants and kingfishers.', 'Migratory birds from Siberia visit in winter.'] },
      { name: "Vagamon Meadows", kind: 'hillview', icon: '\u26F0\uFE0F', facts: ["Vagamon's rolling green meadows, pine forests and tea gardens sit 1,100 m up.", "It is a favourite spot for paragliding."] },
      { name: "Ettumanoor Mahadeva Temple", kind: 'shrine', icon: '\u{1F6D5}', facts: ["The Ettumanoor temple is famous for its 16th-century murals.", "Its golden flagstaff and the Ezharaponnana festival of seven and a half golden elephants are famous."] }
    ],
    idk: [
      { name: 'Idukki Arch Dam', kind: 'main', icon: '\u{1F30A}', facts: ['Built in 1973 between the Kuravan and Kurathi hills, it is one of Asia’s highest arch dams.'] },
      { name: 'Munnar Tea Gardens', kind: 'tea', icon: '\u{1F375}', facts: ['Munnar’s rolling hills are carpeted with tea gardens at 1,600 m.', 'The rare Neelakurinji flowers turn the hills blue once every 12 years.', 'Eravikulam National Park nearby protects the Nilgiri tahr.'] },
      { name: "Thekkady Periyar Wildlife", kind: 'wildlife', icon: '\u{1F418}', facts: ["In Periyar Tiger Reserve, boats glide on the lake while elephants come down to drink.", "Bamboo rafting and jungle walks are run by local tribal guides."] },
      { name: "Spice Plantations", kind: 'spice', icon: '\u{1F336}\uFE0F', facts: ["Idukki grows cardamom, pepper, cinnamon, clove and nutmeg on its hills.", "Kerala's pepper, the \"black gold\", brought traders from across the world."] }
    ],
    ekm: [
      { name: 'Chinese Fishing Nets', kind: 'main', icon: '\u{1F3A3}', facts: ['The cantilevered Chinese nets of Fort Kochi may have come with traders from the court of Kublai Khan.', 'Try fishing here: cast the net at a Fishing Point!'] },
      { name: 'Mattancherry Palace', kind: 'museum', icon: '\u{1F3EF}', colors: [0xf0e6cf, 0xa0522d, 0x7a3b2e], facts: ['Built by the Portuguese in 1555 and gifted to the Raja of Kochi, it is known as the Dutch Palace.', 'Its walls hold some of the finest Hindu mural paintings in Kerala.', 'Jew Town and the 1568 Paradesi Synagogue are a short walk away.'] },
      { name: "Kathakali Centre", kind: 'kathakali', icon: '\u{1F3AD}', facts: ["Kathakali is Kerala's classical dance-drama, with green faces, huge skirts and tall crowns.", "Performers tell stories from the epics with eye movements and hand gestures (mudras)."] },
      { name: "St. Francis Church", kind: 'church', icon: '\u26EA', facts: ["Built in 1503, St. Francis Church in Fort Kochi is the oldest European church in India.", "Vasco da Gama was first buried here in 1524."] },
      { name: "Paradesi Synagogue", kind: 'museum', icon: '\u2721\uFE0F', colors: [0xf4f4f0, 0x2c5fa8, 0x8a3b24], facts: ["The Paradesi Synagogue in Jew Town was built in 1568.", "Its floor is laid with hand-painted Chinese tiles, no two alike."] },
      { name: "Cherai Beach", kind: 'beach', icon: '\u{1F3D6}\uFE0F', facts: ["Cherai beach on Vypin island lies between the sea and the backwaters.", "Dolphins are sometimes seen offshore."] }
    ],
    tsr: [
      { name: 'Vadakkunnathan Temple', kind: 'main', icon: '\u{1F418}', facts: ['Thrissur Pooram is held at the Vadakkunnathan temple grounds, with caparisoned elephants and fireworks.'] },
      { name: 'Athirappilly Waterfalls', kind: 'waterfall', icon: '\u{1F4A7}', facts: ['Athirappilly, 25 m high, is the largest waterfall in Kerala — the "Niagara of India".', 'It lies on the Chalakudy river at the edge of the Sholayar forests.'] },
      { name: 'Guruvayur Temple', kind: 'shrine', icon: '\u{1FA94}', facts: ['Guruvayur is one of the most important Krishna temples in India.', 'Its Punnathur Kotta is home to dozens of temple elephants.'] },
      { name: "Kerala Kalamandalam", kind: 'kathakali', icon: '\u{1F3AD}', facts: ["Kerala Kalamandalam, founded in 1930 by the poet Vallathol, teaches Kathakali, Mohiniyattam and Koodiyattam.", "Its traditional theatre, the Koothambalam, is built in Kerala temple style."] },
      { name: "Punnathur Kotta", kind: 'elephantCamp', icon: '\u{1F418}', facts: ["Punnathur Kotta near Guruvayur is home to dozens of temple elephants.", "They are cared for by the Guruvayur temple and lead its festivals."] }
    ],
    pkd: [
      { name: 'Palakkad Fort', kind: 'main', icon: '\u{1F3F0}', facts: ['Tipu Sultan’s granite fort was rebuilt by Hyder Ali in 1766.'] },
      { name: 'Malampuzha Dam & Gardens', kind: 'garden', icon: '\u{1F33A}', facts: ['Malampuzha has beautiful gardens below its dam, with fountains and a ropeway.', 'The famous Yakshi sculpture by Kanayi Kunhiraman stands here.'] },
      { name: "Silent Valley National Park", kind: 'wildlife', icon: '\u{1F412}', facts: ["Silent Valley is one of the last untouched tropical evergreen forests in India.", "It is home to the lion-tailed macaque."] },
      { name: "Nelliyampathy Hills", kind: 'tea', icon: '\u{1F375}', facts: ["Nelliyampathy's hairpin road climbs to tea and orange estates.", "From Seetharkundu viewpoint you can see across the Palakkad plains."] }
    ],
    mlp: [
      { name: 'Malappuram Mosque', kind: 'main', icon: '\u{1F54C}', facts: ['Malappuram has some of Kerala’s oldest mosques.'] },
      { name: 'Kottakkal Arya Vaidya Sala', kind: 'museum', icon: '\u{1F33F}', colors: [0xf4efe2, 0x2f7a3e, 0x8a3b24], facts: ['Founded in 1902 by Vaidyaratnam P.S. Varier, Kottakkal is world famous for Ayurveda.', 'Its herbal medicines are made from plants grown in its own gardens.'] },
      { name: 'Football Ground', kind: 'football', icon: '\u26BD', facts: ['Malappuram loves football! Sevens tournaments fill local grounds with thousands of fans.', 'Many of Kerala’s best footballers grew up playing here.'] },
      { name: "Nilambur Teak Museum", kind: 'museum', icon: '\u{1F333}', colors: [0xe9dcc0, 0x6b3f1e, 0x3a2a1a], facts: ["Nilambur has the world's oldest teak plantation, Conolly's Plot, planted in 1846.", "The Teak Museum tells the story of this precious wood."] },
      { name: "Padinharekara Beach", kind: 'beach', icon: '\u{1F3D6}\uFE0F', facts: ["At Padinharekara, the Bharathapuzha river meets the Arabian Sea.", "Migratory birds gather on the estuary."] }
    ],
    kkd: [
      { name: 'Kappad Beach', kind: 'main', icon: '\u{1F3D6}\uFE0F', facts: ['Vasco da Gama landed at Kappad on 20 May 1498. A small memorial marks the spot.'] },
      { name: 'Thusharagiri Waterfalls', kind: 'waterfall', icon: '\u{1F4A7}', facts: ['Thusharagiri means "mist-capped mountain". Three waterfalls tumble through the forest here.'] },
      { name: 'Kozhikode Beach', kind: 'beachLight', icon: '\u{1F305}', facts: ['Watch the sunset from Kozhikode beach with a plate of kallummakkaya (mussels) and a glass of sulaimani tea.', 'The old pier and lighthouse recall the city’s spice trade with the world.'] },
      { name: "Mananchira Square", kind: 'garden', icon: '\u{1F333}', facts: ["Mananchira Square is a park around an old royal tank in the heart of Kozhikode.", "It was built for the Zamorins, the rulers of Calicut."] },
      { name: "Tali Temple", kind: 'shrine', icon: '\u{1F6D5}', facts: ["The Tali Shiva temple was built by the Zamorins in the 14th century.", "It hosted the famous Revathi Pattathanam scholarly debates."] }
    ],
    wyd: [
      { name: 'Edakkal Caves', kind: 'main', icon: '\u{1FAA8}', facts: ['Carvings in the Edakkal caves are more than 6,000 years old.'] },
      { name: 'Banasura Sagar Dam', kind: 'dam', icon: '\u{1F30A}', facts: ['Banasura Sagar is India’s largest earth dam, with little islands in its lake.', 'Boats take visitors around the islands below the Banasura hills.'] },
      { name: "Chembra Peak", kind: 'hillview', icon: '\u26F0\uFE0F', facts: ["Chembra is Wayanad's highest peak at 2,100 m.", "On the way up lies a heart-shaped lake that never dries."] },
      { name: "Soochipara Falls", kind: 'waterfall', icon: '\u{1F4A7}', facts: ["Soochipara, the \"needle rock\" falls, drop in three tiers through the forest.", "You can swim in the pool at the bottom."] },
      { name: "Kuruva Island", kind: 'lake', icon: '\u{1F3DD}\uFE0F', facts: ["Kuruva is a cluster of forested river islands on the Kabini.", "Visitors cross on bamboo rafts."] },
      { name: "Muthanga Wildlife Sanctuary", kind: 'wildlife', icon: '\u{1F418}', facts: ["Muthanga is part of the Nilgiri Biosphere Reserve, where elephants, gaur and tigers roam.", "Jeep safaris run early in the morning."] }
    ],
    knr: [
      { name: 'St. Angelo Fort', kind: 'main', icon: '\u{1F3F0}', facts: ['The Portuguese built St. Angelo Fort facing the sea in 1505.'] },
      { name: 'Theyyam', kind: 'theyyam', icon: '\u{1F3AD}', facts: ['Theyyam is a ritual art of North Malabar where performers become gods for a night.', 'Huge headdresses, red face paint and the beat of the chenda light up temple courtyards from December to May.'] },
      { name: 'Muzhappilangad Drive-in Beach', kind: 'beach', icon: '\u{1F697}', facts: ['At 4 km, Muzhappilangad is India’s longest drive-in beach: you can drive along the firm sand.', 'Dharmadam island lies just offshore.'] },
      { name: "Arakkal Museum", kind: 'museum', icon: '\u{1F3DB}\uFE0F', colors: [0xf4efe2, 0x1f6b4a, 0x6b2a1a], facts: ["The Arakkal Museum is in the palace of Kerala's only Muslim royal family.", "It shows their swords, furniture and documents."] },
      { name: "Payyambalam Beach", kind: 'beachLight', icon: '\u{1F305}', facts: ["Payyambalam is a long beach lined with gardens and sculptures.", "It is a favourite place to watch the sunset in Kannur."] }
    ],
    ksd: [
      { name: 'Bekal Fort', kind: 'main', icon: '\u{1F3F0}', facts: ['Bekal Fort is Kerala’s largest fort, shaped like a giant keyhole by the sea.'] },
      { name: 'Ananthapura Lake Temple', kind: 'lakeTemple', icon: '\u{1F6D5}', facts: ['Ananthapura is the only lake temple in Kerala, standing in the middle of a lake.', 'It is said to be the original seat of Lord Padmanabha of Thiruvananthapuram.'] },
      { name: "Chandragiri Fort", kind: 'fort', icon: '\u{1F3F0}', facts: ["Chandragiri Fort, built in the 17th century, overlooks the Chandragiri river.", "Sunset views over the river and the sea are spectacular."] },
      { name: "Ranipuram Hills", kind: 'hillview', icon: '\u26F0\uFE0F', facts: ["Ranipuram, 750 m high, is called the \"Ooty of Kerala\".", "Trek through shola forests and grasslands to the top."] },
      { name: "Kappil Beach", kind: 'beach', icon: '\u{1F3D6}\uFE0F', facts: ["Kappil beach is quiet, with the Kodi cliff rising nearby.", "It is one of the least crowded beaches in Kerala."] }
    ]
  };
  KT.DISTRICTS.forEach((d) => { d.sights = SIGHTS[d.id] || []; });
})();
