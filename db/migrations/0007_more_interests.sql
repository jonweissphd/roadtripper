-- Expand the interest catalog with many more options.
-- New categories: "culture", "fitness", "nightlife", "animals"
-- Plus additions to existing categories.

INSERT INTO interests (id, slug, label, category, search_keywords) VALUES

-- ═══════════════════════════════════════════════
-- CULTURE (new category)
-- ═══════════════════════════════════════════════
(gen_random_uuid(), 'art-museums',           'Art museums',                'culture',    '{"art museum"}'),
(gen_random_uuid(), 'history-museums',       'History museums',            'culture',    '{"history museum"}'),
(gen_random_uuid(), 'science-museums',       'Science museums',            'culture',    '{"science museum"}'),
(gen_random_uuid(), 'sculptures',            'Sculptures & public art',    'culture',    '{"outdoor sculpture, public art installation"}'),
(gen_random_uuid(), 'experiential-art',      'Experiential art',           'culture',    '{"immersive art exhibit, experiential art, interactive art installation"}'),
(gen_random_uuid(), 'theaters',              'Theaters',                   'culture',    '{"theater, performing arts center"}'),
(gen_random_uuid(), 'historic-sites',        'Historic landmarks',         'culture',    '{"historic site, historic landmark"}'),

-- ═══════════════════════════════════════════════
-- ANIMALS (new category)
-- ═══════════════════════════════════════════════
(gen_random_uuid(), 'aquariums',             'Aquariums',                  'animals',    '{"aquarium"}'),
(gen_random_uuid(), 'zoos',                  'Zoos',                       'animals',    '{"zoo"}'),
(gen_random_uuid(), 'wildlife-sanctuaries',  'Wildlife sanctuaries',       'animals',    '{"wildlife sanctuary, animal sanctuary"}'),

-- ═══════════════════════════════════════════════
-- FITNESS (new category)
-- ═══════════════════════════════════════════════
(gen_random_uuid(), 'local-gyms',            'Local gyms',                 'fitness',    '{"gym, fitness center"}'),
(gen_random_uuid(), 'yoga-studios',          'Yoga studios',               'fitness',    '{"yoga studio"}'),
(gen_random_uuid(), 'pilates-studios',       'Pilates studios',            'fitness',    '{"pilates studio"}'),
(gen_random_uuid(), 'climbing-gyms',         'Climbing gyms',              'fitness',    '{"rock climbing gym, bouldering gym"}'),
(gen_random_uuid(), 'boxing-gyms',           'Boxing gyms',                'fitness',    '{"boxing gym"}'),
(gen_random_uuid(), 'crossfit',              'CrossFit boxes',             'fitness',    '{"crossfit gym, crossfit box"}'),

-- ═══════════════════════════════════════════════
-- NIGHTLIFE (new category)
-- ═══════════════════════════════════════════════
(gen_random_uuid(), 'dive-bars',             'Dive bars',                  'nightlife',  '{"dive bar"}'),
(gen_random_uuid(), 'hole-in-the-wall',      'Hole-in-the-wall bars',      'nightlife',  '{"hole in the wall bar, neighborhood bar"}'),
(gen_random_uuid(), 'speakeasies',           'Speakeasies',                'nightlife',  '{"speakeasy, hidden bar"}'),
(gen_random_uuid(), 'comedy-clubs',          'Comedy clubs',               'nightlife',  '{"comedy club, comedy show"}'),
(gen_random_uuid(), 'karaoke',               'Karaoke',                    'nightlife',  '{"karaoke bar"}'),
(gen_random_uuid(), 'jazz-clubs',            'Jazz clubs',                 'nightlife',  '{"jazz club, jazz bar"}'),
(gen_random_uuid(), 'dance-clubs',           'Dance clubs',                'nightlife',  '{"nightclub, dance club"}'),

-- ═══════════════════════════════════════════════
-- OUTDOOR (additions)
-- ═══════════════════════════════════════════════
(gen_random_uuid(), 'waterfalls',            'Waterfalls',                 'outdoor',    '{"waterfall"}'),
(gen_random_uuid(), 'kayaking',              'Kayaking & canoeing',        'outdoor',    '{"kayak rental, canoe rental, kayaking"}'),
(gen_random_uuid(), 'bike-trails',           'Bike trails',                'outdoor',    '{"bike trail, cycling path"}'),
(gen_random_uuid(), 'nature-centers',        'Nature centers',             'outdoor',    '{"nature center, nature preserve"}'),
(gen_random_uuid(), 'campgrounds',           'Campgrounds',                'outdoor',    '{"campground, camping"}'),

-- ═══════════════════════════════════════════════
-- ACTIVITIES (additions)
-- ═══════════════════════════════════════════════
(gen_random_uuid(), 'escape-rooms',          'Escape rooms',               'activities', '{"escape room"}'),
(gen_random_uuid(), 'go-karts',              'Go-karts',                   'activities', '{"go kart, go karting"}'),
(gen_random_uuid(), 'laser-tag',             'Laser tag',                  'activities', '{"laser tag"}'),
(gen_random_uuid(), 'axe-throwing',          'Axe throwing',               'activities', '{"axe throwing"}'),
(gen_random_uuid(), 'trampoline-parks',      'Trampoline parks',           'activities', '{"trampoline park"}'),
(gen_random_uuid(), 'water-parks',           'Water parks',                'activities', '{"water park"}'),
(gen_random_uuid(), 'roller-skating',        'Roller skating',             'activities', '{"roller skating rink, roller rink"}'),
(gen_random_uuid(), 'paintball',             'Paintball',                  'activities', '{"paintball"}'),

-- ═══════════════════════════════════════════════
-- SHOPPING (additions)
-- ═══════════════════════════════════════════════
(gen_random_uuid(), 'local-groceries',       'Local grocery stores',       'shopping',   '{"local grocery store, specialty grocery, international grocery"}'),
(gen_random_uuid(), 'flea-markets',          'Flea markets',               'shopping',   '{"flea market, swap meet"}'),
(gen_random_uuid(), 'plant-shops',           'Plant shops',                'shopping',   '{"plant nursery, plant shop"}'),
(gen_random_uuid(), 'vintage-clothing',      'Vintage clothing',           'shopping',   '{"vintage clothing store, consignment shop"}'),

-- ═══════════════════════════════════════════════
-- QUIRKY (additions)
-- ═══════════════════════════════════════════════
(gen_random_uuid(), 'corny-roadside',        'Corny roadside attractions', 'quirky',     '{"roadside attraction, worlds largest, giant statue, quirky landmark"}'),
(gen_random_uuid(), 'haunted-places',        'Haunted places',             'quirky',     '{"haunted house, ghost tour, haunted attraction"}'),
(gen_random_uuid(), 'kitsch-museums',        'Kitsch museums',             'quirky',     '{"oddity museum, novelty museum, wax museum, ripley believe it or not"}'),
(gen_random_uuid(), 'street-performers',     'Street performers & buskers','quirky',     '{"street performer, busker, street entertainment"}'),

-- ═══════════════════════════════════════════════
-- FOOD (additions)
-- ═══════════════════════════════════════════════
(gen_random_uuid(), 'seafood',               'Seafood',                    'food',       '{"seafood restaurant"}'),
(gen_random_uuid(), 'ramen',                 'Ramen',                      'food',       '{"ramen restaurant"}'),
(gen_random_uuid(), 'korean-food',           'Korean food',                'food',       '{"korean restaurant"}'),
(gen_random_uuid(), 'dim-sum',               'Dim sum',                    'food',       '{"dim sum restaurant"}'),
(gen_random_uuid(), 'tacos',                 'Tacos & street food',        'food',       '{"taco stand, street food, food truck"}'),
(gen_random_uuid(), 'soul-food',             'Soul food',                  'food',       '{"soul food restaurant"}'),
(gen_random_uuid(), 'donuts',                'Donut shops',                'food',       '{"donut shop"}'),
(gen_random_uuid(), 'farm-to-table',         'Farm-to-table',              'food',       '{"farm to table restaurant"}'),

-- ═══════════════════════════════════════════════
-- DRINKS (additions)
-- ═══════════════════════════════════════════════
(gen_random_uuid(), 'tea-houses',            'Tea houses',                 'drinks',     '{"tea house, tea room, bubble tea"}'),
(gen_random_uuid(), 'juice-bars',            'Juice bars',                 'drinks',     '{"juice bar, smoothie bar"}'),
(gen_random_uuid(), 'distilleries',          'Distilleries',               'drinks',     '{"distillery, whiskey distillery"}'),
(gen_random_uuid(), 'cider-houses',          'Cider houses',               'drinks',     '{"cider house, cidery"}')

ON CONFLICT (slug) DO NOTHING;
