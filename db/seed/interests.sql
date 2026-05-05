-- Idempotent seed for the v1 interest taxonomy.
-- Run anytime — uses upsert on slug. Edit search_keywords here when tuning matches.

insert into public.interests (slug, label, category, search_keywords) values
  -- food
  ('thai-food',        'Thai food',          'food',       array['thai food']),
  ('mexican-food',     'Mexican food',       'food',       array['mexican restaurant']),
  ('italian-food',     'Italian food',       'food',       array['italian restaurant']),
  ('sushi',            'Sushi',              'food',       array['sushi']),
  ('bbq',              'BBQ',                'food',       array['bbq']),
  ('burgers',          'Burgers',            'food',       array['burger restaurant']),
  ('pizza',            'Pizza',              'food',       array['pizza']),
  ('vietnamese-food',  'Vietnamese food',    'food',       array['vietnamese restaurant']),
  ('indian-food',      'Indian food',        'food',       array['indian restaurant']),
  ('vegan-veg',        'Vegan / vegetarian', 'food',       array['vegan restaurant']),
  ('brunch',           'Brunch',             'food',       array['brunch']),
  ('bakery',           'Bakery',             'food',       array['bakery']),
  ('diners',           'Diners',             'food',       array['diner']),
  ('ice-cream',        'Ice cream',          'food',       array['ice cream shop']),
  -- drinks
  ('specialty-coffee', 'Specialty coffee',   'drinks',     array['specialty coffee']),
  ('craft-brewery',    'Craft brewery',      'drinks',     array['brewery']),
  ('winery',           'Winery',             'drinks',     array['winery']),
  ('cocktail-bar',     'Cocktail bar',       'drinks',     array['cocktail bar']),
  -- shopping
  ('record-stores',    'Record stores',      'shopping',   array['record store']),
  ('antique-shops',    'Antique shops',      'shopping',   array['antique store']),
  ('bookstores',       'Bookstores',         'shopping',   array['independent bookstore']),
  ('thrift-vintage',   'Thrift / vintage',   'shopping',   array['thrift store']),
  ('farmers-markets',  'Farmers markets',    'shopping',   array['farmers market']),
  ('art-galleries',    'Art galleries',      'shopping',   array['art gallery']),
  -- outdoor
  ('hiking-trails',    'Hiking trails',      'outdoor',    array['hiking trail']),
  ('state-parks',      'State parks',        'outdoor',    array['state park']),
  ('beaches',          'Beaches',            'outdoor',    array['beach']),
  ('scenic-overlooks', 'Scenic overlooks',   'outdoor',    array['scenic overlook']),
  ('botanical-gardens','Botanical gardens',  'outdoor',    array['botanical garden']),
  ('swimming-holes',   'Swimming holes',     'outdoor',    array['swimming hole']),
  -- activities
  ('amusement-parks',  'Amusement parks',    'activities', array['amusement park']),
  ('mini-golf',        'Mini golf',          'activities', array['mini golf']),
  ('bowling',          'Bowling',            'activities', array['bowling alley']),
  ('live-music',       'Live music',         'activities', array['live music venue']),
  ('arcades',          'Arcades',            'activities', array['arcade']),
  ('hot-springs',      'Hot springs',        'activities', array['hot springs']),
  -- quirky
  ('roadside',         'Roadside attractions','quirky',    array['roadside attraction']),
  ('street-art',       'Murals / street art','quirky',     array['street art']),
  ('weird-museums',    'Quirky museums',     'quirky',     array['weird museum']),
  ('photo-spots',      'Photo spots',        'quirky',     array['scenic photo spot'])
on conflict (slug) do update set
  label = excluded.label,
  category = excluded.category,
  search_keywords = excluded.search_keywords;
