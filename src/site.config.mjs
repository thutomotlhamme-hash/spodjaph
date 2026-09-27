// Everything a visitor reads lives here. Edit this file, then run `node build.mjs`.
//
// Contact fields left empty are simply not shown. The booking form works on
// Netlify Forms without any of them.

export const brand = {
  name: 'Spodjaph',
  descriptor: 'Photography',
  tagline: 'Moments, made permanent.',
  // Shown in the footer and on the contact page when filled in.
  email: '',
  phone: '',
  whatsapp: '', // international format, digits only, e.g. 27820000000
  instagram: '', // handle without @
  location: '',
};

// Photos: drop JPGs into /images/<slug>/ using the names below
// (hero.jpg, 1.jpg … 4.jpg). Missing photos render as black exhibition tiles.

export const pages = [
  {
    slug: 'weddings',
    title: 'Weddings',
    eyebrow: 'Weddings',
    headline: ['Your day,', 'unhurried.'],
    lede: 'Documentary coverage from the first look to the last dance. Quiet, precise, and entirely yours.',
    highlights: [
      { title: 'Nothing staged.', body: 'We move with the day, not against it, so the pictures look like how it felt.' },
      { title: 'Every family, seen.', body: 'The formal groups are fast and calm, and nobody important is missed.' },
      { title: 'Light, handled.', body: 'Harsh noon sun or a dim reception hall, the images stay clean and true to skin tone.' },
    ],
    chapters: [
      { name: 'Preparation', body: 'Dresses, suits, nerves, and the people who help you get ready.' },
      { name: 'Ceremony', body: 'Vows, rings, and the faces in the front row while they happen.' },
      { name: 'Portraits', body: 'Unhurried time with the two of you, away from the crowd.' },
      { name: 'Reception', body: 'Entrances, speeches, and the dance floor at its loudest.' },
    ],
  },
  {
    slug: 'portraits',
    title: 'Portraits',
    eyebrow: 'Portraits',
    headline: ['Presence,', 'in focus.'],
    lede: 'Portraits built on stillness and good light. For individuals, couples, and families.',
    highlights: [
      { title: 'Directed, gently.', body: 'Clear guidance on posture and angle, so you never wonder what to do with your hands.' },
      { title: 'Studio or outside.', body: 'Seamless backdrops or real places, chosen to suit you.' },
      { title: 'Finished properly.', body: 'Careful retouching that keeps you looking like yourself.' },
    ],
    chapters: [
      { name: 'Studio', body: 'Controlled light and a clean backdrop. Nothing competes with you.' },
      { name: 'Outdoor', body: 'Golden hour and real locations, for a warmer, looser feel.' },
      { name: 'Couples', body: 'Two people, one frame, and the ease between you.' },
      { name: 'Family', body: 'Every generation in one picture, with nobody blinking.' },
    ],
  },
  {
    slug: 'graduation',
    title: 'Graduation',
    eyebrow: 'Graduation',
    headline: ['The walk', 'you earned.'],
    lede: 'Gown, cap, and years of work, photographed like the milestone it is.',
    highlights: [
      { title: 'On campus.', body: 'The buildings and corners that shaped the degree.' },
      { title: 'With your people.', body: 'The family who carried you there, in the frame beside you.' },
      { title: 'Ready to frame.', body: 'Portraits sized and finished for the wall and the feed.' },
    ],
    chapters: [
      { name: 'Campus', body: 'Walkways, steps, and the landmarks you will remember.' },
      { name: 'Gown & cap', body: 'The classic portrait, done with care for the detail.' },
      { name: 'With family', body: 'Parents, siblings, and the people who made it possible.' },
      { name: 'Studio', body: 'A clean formal portrait for the years ahead.' },
    ],
  },
  {
    slug: 'brands',
    title: 'Brands',
    eyebrow: 'Brands',
    headline: ['Your brand,', 'sharpened.'],
    lede: 'Product, people, and campaign imagery that makes a business look as good as it is.',
    highlights: [
      { title: 'Consistent.', body: 'One look across your site, your socials, and your print.' },
      { title: 'Built to use.', body: 'Crops delivered for every format you publish in.' },
      { title: 'On brief.', body: 'Shot lists agreed in advance, so the day is efficient.' },
    ],
    chapters: [
      { name: 'Products', body: 'Clean, isolated product images that hold up at any size.' },
      { name: 'Headshots', body: 'A consistent look for the whole team.' },
      { name: 'Campaigns', body: 'Concept-led shoots for launches and seasons.' },
      { name: 'Social content', body: 'A steady supply of images made for the feed.' },
    ],
  },
  {
    slug: 'events',
    title: 'Events',
    eyebrow: 'Events',
    headline: ['Every gathering,', 'remembered.'],
    lede: 'Celebrations large and small, covered with the same attention as a wedding.',
    hub: ['events/baby-shower', 'events/birthday', 'events/lobola', 'events/matric-dance'],
    highlights: [
      { title: 'Unobtrusive.', body: 'Guests forget the camera is there, and that is when the pictures happen.' },
      { title: 'Details and people.', body: 'The décor you planned and the faces who came.' },
      { title: 'Delivered as a story.', body: 'A gallery that reads from arrival to farewell.' },
    ],
  },
  {
    slug: 'events/baby-shower',
    parent: 'events',
    title: 'Baby Shower',
    eyebrow: 'Baby Shower',
    headline: ['Waiting,', 'beautifully.'],
    lede: 'The anticipation, the gifts, and the people already in love with someone they have not met.',
    highlights: [
      { title: 'Soft and natural.', body: 'Gentle light that flatters and never feels posed.' },
      { title: 'The details.', body: 'Cake, décor, and the table you spent weeks on.' },
      { title: 'The circle.', body: 'Friends and family gathered around the mother-to-be.' },
    ],
    chapters: [
      { name: 'Décor', body: 'The setting, photographed before the guests arrive.' },
      { name: 'Guests', body: 'Arrivals, laughter, and the stories being told.' },
      { name: 'Moments', body: 'Games, gifts, and the reveal.' },
      { name: 'Portraits', body: 'A few calm frames of the parents-to-be.' },
    ],
  },
  {
    slug: 'events/birthday',
    parent: 'events',
    title: 'Birthday',
    eyebrow: 'Birthday',
    headline: ['Another year,', 'framed.'],
    lede: 'First birthdays to milestone parties, photographed while you enjoy them.',
    highlights: [
      { title: 'All ages.', body: 'Toddlers mid-cake and grandparents mid-speech.' },
      { title: 'The candles.', body: 'The one moment everyone wants, never missed.' },
      { title: 'The party.', body: 'Energy, music, and the people who made the night.' },
    ],
    chapters: [
      { name: 'Setting', body: 'Balloons, tables, and the room before it fills.' },
      { name: 'Guests', body: 'Everyone who came, looking their best.' },
      { name: 'The cake', body: 'Candles, singing, and the wish.' },
      { name: 'The night', body: 'The dance floor once it gets going.' },
    ],
  },
  {
    slug: 'events/lobola',
    parent: 'events',
    title: 'Lobola',
    eyebrow: 'Lobola',
    headline: ['Two families,', 'one story.'],
    lede: 'Tradition, attire, and the joining of families, photographed with care and respect for custom.',
    highlights: [
      { title: 'Respectful.', body: 'We follow the families’ lead on what is photographed and when.' },
      { title: 'Heritage in colour.', body: 'Traditional attire and beadwork rendered richly and accurately.' },
      { title: 'The celebration.', body: 'Singing, dancing, and the moment agreement becomes joy.' },
    ],
    chapters: [
      { name: 'Arrival', body: 'Delegations, greetings, and the gate.' },
      { name: 'Attire', body: 'Fabric, beadwork, and the detail of dress.' },
      { name: 'Families', body: 'Elders, parents, and both sides together.' },
      { name: 'Celebration', body: 'Song, dance, and the feast that follows.' },
    ],
  },
  {
    slug: 'events/matric-dance',
    parent: 'events',
    title: 'Matric Dance',
    eyebrow: 'Matric Dance',
    headline: ['The arrival,', 'perfected.'],
    lede: 'The outfit, the car, and the entrance, photographed like a red carpet.',
    highlights: [
      { title: 'Red-carpet ready.', body: 'Polished portraits that do the outfit justice.' },
      { title: 'The entrance.', body: 'The car, the walk, and the crowd watching.' },
      { title: 'With family.', body: 'Proud parents, before you leave for the night.' },
    ],
    chapters: [
      { name: 'Getting ready', body: 'Final touches at home, with the people who helped.' },
      { name: 'Portraits', body: 'Full-length and close, for the outfit and the face.' },
      { name: 'The partner', body: 'You and your date, together in the frame.' },
      { name: 'The arrival', body: 'The car, the entrance, and the send-off.' },
    ],
  },
];

export const process = [
  { step: '01', title: 'Enquire', body: 'Tell us the date, the occasion, and what matters most to you.' },
  { step: '02', title: 'Plan', body: 'We agree on timing, locations, and the shots that cannot be missed.' },
  { step: '03', title: 'Shoot', body: 'On the day, you get on with it. We quietly take care of the pictures.' },
  { step: '04', title: 'Deliver', body: 'A curated, edited gallery, ready to download, share, and print.' },
];

// Global navigation order.
export const nav = ['weddings', 'portraits', 'graduation', 'events', 'brands'];
