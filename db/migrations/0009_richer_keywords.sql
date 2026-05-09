-- Expand search keywords for interests that return too few results.
-- More keywords per interest = more unique places discovered per search.

-- Shopping
update public.interests set search_keywords = array[
  'antique store', 'antique mall', 'antique shop', 'vintage antiques', 'collectibles store'
] where slug = 'antique-shops';

update public.interests set search_keywords = array[
  'thrift store', 'thrift shop', 'goodwill', 'salvation army thrift',
  'habitat for humanity restore', 'consignment store', 'secondhand store', 'resale shop'
] where slug = 'thrift-vintage';

update public.interests set search_keywords = array[
  'flea market', 'swap meet', 'outdoor market', 'weekend market', 'bazaar'
] where slug = 'flea-markets';

update public.interests set search_keywords = array[
  'vintage clothing store', 'consignment shop', 'retro clothing', 'vintage boutique'
] where slug = 'vintage-clothing';

update public.interests set search_keywords = array[
  'independent bookstore', 'used bookstore', 'bookshop', 'book store'
] where slug = 'bookstores';

update public.interests set search_keywords = array[
  'record store', 'vinyl records', 'music shop used records'
] where slug = 'record-stores';

update public.interests set search_keywords = array[
  'art gallery', 'local art gallery', 'artist studio gallery'
] where slug = 'art-galleries';

update public.interests set search_keywords = array[
  'farmers market', 'farm stand', 'local produce market'
] where slug = 'farmers-markets';

update public.interests set search_keywords = array[
  'local grocery store', 'specialty grocery', 'international grocery', 'ethnic grocery store'
] where slug = 'local-grocery';

update public.interests set search_keywords = array[
  'plant nursery', 'plant shop', 'garden center local'
] where slug = 'plant-shops';

-- Food — expand keywords for broader discovery
update public.interests set search_keywords = array[
  'soul food restaurant', 'southern comfort food', 'soul food'
] where slug = 'soul-food';

update public.interests set search_keywords = array[
  'sushi restaurant', 'sushi bar', 'japanese sushi'
] where slug = 'sushi';

update public.interests set search_keywords = array[
  'bbq restaurant', 'barbecue', 'smokehouse bbq', 'bbq joint'
] where slug = 'bbq';

update public.interests set search_keywords = array[
  'seafood restaurant', 'fresh seafood', 'seafood shack', 'crab house'
] where slug = 'seafood';

update public.interests set search_keywords = array[
  'ramen restaurant', 'ramen shop', 'noodle bar ramen'
] where slug = 'ramen';

update public.interests set search_keywords = array[
  'tacos', 'taco stand', 'street food', 'taqueria', 'food truck'
] where slug = 'tacos-street-food';

update public.interests set search_keywords = array[
  'farm to table restaurant', 'farm to fork', 'locally sourced restaurant'
] where slug = 'farm-to-table';

update public.interests set search_keywords = array[
  'donut shop', 'doughnut shop', 'local donuts'
] where slug = 'donut-shops';

update public.interests set search_keywords = array[
  'bakery', 'local bakery', 'artisan bakery', 'pastry shop'
] where slug = 'bakery';

-- Drinks
update public.interests set search_keywords = array[
  'specialty coffee', 'independent coffee shop', 'third wave coffee', 'coffee roaster'
] where slug = 'specialty-coffee';

update public.interests set search_keywords = array[
  'craft brewery', 'microbrewery', 'brewpub', 'local brewery', 'taproom'
] where slug = 'craft-brewery';

update public.interests set search_keywords = array[
  'winery', 'wine tasting', 'vineyard', 'wine cellar'
] where slug = 'winery';

update public.interests set search_keywords = array[
  'cocktail bar', 'craft cocktails', 'speakeasy bar', 'mixology bar'
] where slug = 'cocktail-bar';

update public.interests set search_keywords = array[
  'juice bar', 'smoothie bar', 'fresh juice', 'cold pressed juice'
] where slug = 'juice-bars';

update public.interests set search_keywords = array[
  'tea house', 'tea room', 'tea shop', 'bubble tea'
] where slug = 'tea-houses';

-- Nightlife
update public.interests set search_keywords = array[
  'dive bar', 'neighborhood bar', 'local bar', 'hole in the wall bar'
] where slug = 'dive-bars';

update public.interests set search_keywords = array[
  'hole in the wall bar', 'neighborhood pub', 'local watering hole'
] where slug = 'hole-in-the-wall-bars';

update public.interests set search_keywords = array[
  'speakeasy', 'hidden bar', 'underground bar'
] where slug = 'speakeasies';

update public.interests set search_keywords = array[
  'jazz club', 'jazz bar', 'live jazz'
] where slug = 'jazz-clubs';

update public.interests set search_keywords = array[
  'comedy club', 'stand up comedy', 'comedy show', 'improv comedy'
] where slug = 'comedy-clubs';

update public.interests set search_keywords = array[
  'live music venue', 'live music bar', 'concert venue small', 'live band'
] where slug = 'live-music';

-- Outdoor
update public.interests set search_keywords = array[
  'hiking trail', 'hiking path', 'nature trail', 'walking trail scenic'
] where slug = 'hiking-trails';

update public.interests set search_keywords = array[
  'scenic overlook', 'scenic viewpoint', 'lookout point', 'scenic vista'
] where slug = 'scenic-overlooks';

update public.interests set search_keywords = array[
  'state park', 'state forest', 'state recreation area'
] where slug = 'state-parks';

update public.interests set search_keywords = array[
  'waterfall', 'waterfall trail', 'cascades falls'
] where slug = 'waterfalls';

update public.interests set search_keywords = array[
  'swimming hole', 'natural swimming', 'swimming creek', 'swimming quarry'
] where slug = 'swimming-holes';

update public.interests set search_keywords = array[
  'botanical garden', 'arboretum', 'public garden', 'flower garden'
] where slug = 'botanical-gardens';

-- Culture
update public.interests set search_keywords = array[
  'art museum', 'fine art museum', 'contemporary art museum', 'art center'
] where slug = 'art-museums';

update public.interests set search_keywords = array[
  'history museum', 'historical museum', 'heritage museum', 'local history museum'
] where slug = 'history-museums';

update public.interests set search_keywords = array[
  'historic landmark', 'historic site', 'historical monument', 'heritage site'
] where slug = 'historic-landmarks';

update public.interests set search_keywords = array[
  'sculpture garden', 'public art installation', 'outdoor sculpture', 'street sculpture'
] where slug = 'sculptures-public-art';

update public.interests set search_keywords = array[
  'experiential art', 'immersive art exhibit', 'interactive art installation', 'art experience'
] where slug = 'experiential-art';

update public.interests set search_keywords = array[
  'mural', 'street art mural', 'wall mural', 'painted mural', 'graffiti art'
] where slug = 'murals-street-art';

-- Quirky
update public.interests set search_keywords = array[
  'roadside attraction', 'roadside oddity', 'quirky roadside', 'worlds largest',
  'unusual attraction', 'weird roadside'
] where slug = 'roadside-attractions';

update public.interests set search_keywords = array[
  'corny roadside attraction', 'cheesy tourist attraction', 'kitschy roadside',
  'roadside curiosity', 'tourist trap fun'
] where slug = 'corny-roadside';

update public.interests set search_keywords = array[
  'quirky museum', 'unusual museum', 'weird museum', 'oddities museum', 'bizarre museum'
] where slug = 'quirky-museums';

update public.interests set search_keywords = array[
  'kitsch museum', 'kitschy attraction', 'retro museum', 'novelty museum'
] where slug = 'kitsch-museums';

-- Activities
update public.interests set search_keywords = array[
  'escape room', 'escape game', 'puzzle room'
] where slug = 'escape-rooms';

update public.interests set search_keywords = array[
  'bowling alley', 'bowling center', 'bowling lanes', 'duckpin bowling'
] where slug = 'bowling';

update public.interests set search_keywords = array[
  'arcade', 'retro arcade', 'barcade', 'game arcade', 'pinball arcade'
] where slug = 'arcades';

update public.interests set search_keywords = array[
  'go kart', 'go kart track', 'karting', 'indoor karting'
] where slug = 'go-karts';

-- Animals
update public.interests set search_keywords = array[
  'aquarium', 'public aquarium', 'sea life aquarium', 'marine aquarium'
] where slug = 'aquariums';

update public.interests set search_keywords = array[
  'zoo', 'zoological park', 'animal park', 'wildlife zoo'
] where slug = 'zoos';

update public.interests set search_keywords = array[
  'wildlife sanctuary', 'animal sanctuary', 'wildlife refuge', 'nature preserve wildlife'
] where slug = 'wildlife-sanctuaries';
