-- Local demo data for Triage Desk. Loaded by `supabase db reset`.
--
-- Test users (local stack only, never use these on a hosted project):
--   agent@triage.test   Miau Atelier agent
--   nordic@triage.test  Nordic Paws agent (demonstrates brand isolation)
--   admin@triage.test   admin of both brands
--   password for all: triage-local-only-2026
--
-- Miau Atelier policies and products mirror the live store (miauatelier.com).
-- Nordic Paws is a fictional second brand. All customers and orders are fictional.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'agent@triage.test', extensions.crypt('triage-local-only-2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', jsonb_build_object('sub', 'aaaaaaaa-0000-4000-8000-000000000001', 'email', 'agent@triage.test'), 'email', now(), now(), now());

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'admin@triage.test', extensions.crypt('triage-local-only-2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', jsonb_build_object('sub', 'aaaaaaaa-0000-4000-8000-000000000002', 'email', 'admin@triage.test'), 'email', now(), now(), now());

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'nordic@triage.test', extensions.crypt('triage-local-only-2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), 'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000003', jsonb_build_object('sub', 'aaaaaaaa-0000-4000-8000-000000000003', 'email', 'nordic@triage.test'), 'email', now(), now(), now());

insert into public.brands (id, slug, name, support_email, voice, signature) values
  ('11111111-1111-4111-8111-111111111111', 'miau-atelier', 'Miau Atelier', 'hello@miauatelier.com',
   'Warm, calm and precise, like a contemporary interior design studio, never like a pet shop. Short paragraphs, no exclamation marks, no emojis, no em dashes. Use the customer first name when known. Offer one clear next step. Never promise anything the policies do not state.',
   'Warm regards,
The Miau Atelier team'),
  ('22222222-2222-4222-8222-222222222222', 'nordic-paws', 'Nordic Paws', 'care@nordicpaws.test',
   'Friendly and practical Scandinavian tone. Plain language, short sentences, no emojis.',
   'Best,
Nordic Paws Care');

insert into public.brand_members (brand_id, user_id, role) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'agent'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000002', 'admin'),
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000002', 'admin'),
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000003', 'agent');

insert into public.policies (brand_id, slug, title, body) values
  ('11111111-1111-4111-8111-111111111111', 'contact', 'Contact', 'Trade name: Miau Atelier
 Email: hello@miauatelier.com
 Contact form: our contact page
 We reply to every message within 2 business days, Monday to Friday. Please include your order number when writing about an order.'),
  ('11111111-1111-4111-8111-111111111111', 'returns-refunds', 'Refund policy', 'We want every piece to feel right in your home. If it doesn''t, we''re here to help.
Returns
You can request a return within 30 days of delivery. To be eligible, the item must be unused, in the same condition you received it, and in its original packaging.
To start a return, write to us through our contact page with your order number. We''ll reply with return instructions and the return address. Please don''t send items back before we confirm. Our pieces ship from partner warehouses, and returns sent to the wrong address can''t be processed.
Unless the item arrived damaged, defective or incorrect, return shipping costs are the customer''s responsibility.
Damaged, defective or incorrect items
Please inspect your order on arrival and contact us within 7 days of delivery if an item is damaged, defective or not what you ordered. Include your order number and photos of the item and packaging, and we''ll arrange a replacement or a full refund at no cost to you.
Cancellations
You can cancel your order for a full refund any time before it ships. Once an order has shipped, the return process above applies.
Refunds
Once your return is received and inspected, we''ll let you know whether it''s approved. Approved refunds are issued to your original payment method within 10 business days. Your bank or card issuer may take additional time to post the refund.
If more than 15 business days have passed since your refund was approved and you haven''t received it, please contact us.
Exchanges
The fastest way to get a different item is to return the one you have and place a new order.
Questions
For anything related to returns or refunds, reach us through our contact page.'),
  ('11111111-1111-4111-8111-111111111111', 'shipping', 'Shipping', 'We currently ship to addresses within the United States.
Shipping cost
Standard shipping is free on every order.
Processing time
Orders are usually processed within 1 to 3 business days. You''ll receive a confirmation email when your order is placed and a shipping confirmation with tracking details once it''s on its way.
Delivery time
Most orders arrive within 3 to 8 business days after dispatch. Some larger pieces, and pieces shipped from partner warehouses outside the United States, can take up to 15 business days. Delivery times are estimates and may vary during busy periods or due to carrier delays.
Multiple packages
Our pieces ship from partner warehouses, so orders with more than one item may arrive in separate packages, each with its own tracking number.
Duties and taxes
Orders delivered within the United States are not subject to import duties.
Lost or damaged shipments
If your tracking shows no movement for more than 7 business days, or your order arrives damaged, please contact us through our contact page with your order number and we''ll make it right.
Address accuracy
Please double-check your shipping address at checkout. We can update an address only before the order ships.'),
  ('22222222-2222-4222-8222-222222222222', 'shipping', 'Shipping', 'We ship within the EU in 2 to 4 business days. Standard shipping is 4.90 EUR and free over 60 EUR.'),
  ('22222222-2222-4222-8222-222222222222', 'returns', 'Returns', 'Returns are accepted within 14 days of delivery for unused items. The customer pays return shipping unless the item is faulty.');

insert into public.products (brand_id, handle, title, size_fit, details, price_usd) values
  ('11111111-1111-4111-8111-111111111111', 'wooden-scratcher-tower', 'Curved Sisal Scratcher Lounge', '15.4" L × 12.6" W (39 × 32 cm) curved sisal lounge', 'A curved lounge of natural sisal on a light wood frame. Your cat can scratch, stretch and nap in the same spot, and the low, open shape sits on the floor like a small piece of furniture instead of a post.
Sisal takes daily claws far better than carpet or cardboard, which keeps the sofa out of the routine.
Details
Materials: natural sisal on a solid wood frame
Color: natural wood and sisal
Size: 15.4" L × 12.6" W (39 × 32 cm)
Assembly: quick, manual included
Care: brush off loose fibers; wipe the frame with a dry cloth', 129.99),
  ('11111111-1111-4111-8111-111111111111', 'warm-plush-cat-nest-bed-for-winter-comfort', 'Plush Nest Bed', '19.7" L × 15.7" W × 13.4" H (50 × 40 × 34 cm), room for one cat to curl up', 'A soft, enclosed nest for cats who like to disappear for a nap. A long, fluffy plush arch frames the entrance, and the body in a muted blush tone keeps it calm in a living room or bedroom.
The moisture resistant base keeps the inside dry, and the light build and top handle make it easy to move it to the warmest spot in the house.
Details
Materials: long pile plush, polypropylene cotton filling
Color: blush and cream
Size: 19.7" L × 15.7" W × 13.4" H (50 × 40 × 34 cm)
Assembly: none required
Care: spot clean with a damp cloth', 109.99),
  ('11111111-1111-4111-8111-111111111111', 'fafa-elevated-ceramic-pet-bowl', 'Elevated Ceramic Bowl', '3.9" tall with a 5.9" opening · holds 150 g of food or 280 ml of water', 'A small ceramic piece shaped like an opening trumpet flower. The bowl sits on a raised foot and tilts gently forward, so your cat eats in a natural posture instead of bending down to the floor.
 The wide, shallow opening is kind to whiskers and flat faces, and the curved interior brings food back to the center. A higher back rim keeps kibble in the bowl and off the floor.
 Details
Material: ceramic fired at 1260°C, food safe glaze
Colors: blue or cream
Height: 10 cm (3.9") with a 12.5° tilt
Opening: 15 cm (5.9") wide
Capacity: 150 g of food or 280 ml of water
Care: smooth glaze that rinses clean; open base so water does not collect underneath', 73.99),
  ('11111111-1111-4111-8111-111111111111', 'cat-water-fountain-stainless-steel-tray-automatic-water-bowl-dispenser-for-pets', 'Stainless Steel Water Fountain', '3 L reservoir, about a week of water for two cats', 'Cats are drawn to moving water. This fountain keeps a gentle, steady flow across a stainless steel tray, enough to invite your cat to drink without startling them.
 At about 22 dB it runs quietly enough for a bedroom, and a 3 liter reservoir means refilling is a weekly task rather than a daily one. Every part comes apart for cleaning.
 Details
Capacity: 3 L, about a week of water for two cats
Tray: 304 stainless steel, BPA free materials
Noise: about 22 dB while running
Water level: MAX and MIN marks on the bowl
Care: assembles in under a minute and comes apart fully for washing', 34.99),
  ('11111111-1111-4111-8111-111111111111', 'woven-cattail-cat-tree', 'Woven Cattail Cat Tree', '22.5" L × 14.5" W × 39.5" H · for cats up to 10 lb', 'A compact cat tree that reads more like a woven side piece than pet furniture. Natural cattail wraps a cube to hide in and a round basket set up high for naps, joined by a small ladder and a soft, light base.
Two removable cushions, one in the cube and one in the basket, keep both spots soft. Sized to fit beside a sofa or under a window without taking over the room.
Details
Materials: cattail weave, particleboard, plush
Color: natural and white
Overall size: 22.5" L × 14.5" W × 39.5" H
Cube: 12.25" × 12.25" × 11.5" H
Basket bed: 15.75" Ø × 5" H, about three feet from the floor
Recommended for: cats up to 10 lb
Assembly: required, manual included', 159.99),
  ('11111111-1111-4111-8111-111111111111', 'ottoman-with-cat-hideaway', 'Walnut Finish Ottoman with Cat Hideaway', '19.7" × 19.7" × 20" H · cat cave opening 6.5" tall · top holds up to 128 lb', 'A footrest for you, a hideaway for them. This tufted ottoman sits on a solid rubberwood frame in a warm walnut finish, with a rounded opening that leads to a cushioned cat cave underneath.
The top works as a footrest or extra seat; inside, the enclosed space gives your cat a calm, den-like place to nap without adding another object to the room. Both cushions are removable for easy cleaning.
Details
Materials: solid rubberwood frame, upholstery fabric, polypropylene filling
Finish: walnut
Size: 19.7" L × 19.7" W × 20" H
Weight: 28.7 lb
Care: wipe the frame clean; spot clean the top cushion with a damp cloth
Made in: Malaysia', 469.99),
  ('11111111-1111-4111-8111-111111111111', 'woven-wall-nest', 'Woven Wall Nest', '17.7" wide with a 9.1" opening · for cats up to 11 lb', 'A round nest woven from natural cattail, mounted on the wall so your cat can rest up high while the floor stays clear. It reads as a woven object on the wall as much as a place to curl up.
A soft cushion lines the inside and lifts out for washing. Mounting hardware is included.
Details
Materials: cattail, polyester plush, PP cotton, metal wire
Color: beige and cream
Size: 17.7" W × 9.8" D × 17.7" H (45 × 25 × 45 cm)
Opening: 9.1" (23 cm) diameter
Recommended for: cats up to 11 lb (5 kg); maximum load 13.2 lb (6 kg)
Installation: wall-mounted, no assembly; 8 mounting accessories and manual included', 159.99),
  ('11111111-1111-4111-8111-111111111111', 'modern-cat-tower-natural', 'Natural Modern Cat Tower', '15.5" L × 18.7" W × 48.8" H · four levels to climb', 'Clean lines and a light natural finish give this tower the look of contemporary furniture. It climbs from a sisal-wrapped base to a cube condo, a clear hammock and a round perch at the top, a lookout for curious cats.
The sisal posts give claws somewhere better than the sofa, while the open, pale structure keeps it visually light in the room.
Details
Materials: MDF with natural finish, sisal-covered posts, acrylic hammock
Color: natural and white
Size: 15.5" L × 18.7" W × 48.8" H
Weight: 18 lb
Assembly: required', 129.99),
  ('11111111-1111-4111-8111-111111111111', 'wooden-wall-climbing-set', 'Wooden Wall Climbing Set', 'Four wall pieces · each level holds up to 22 lb', 'Four wall-mounted pieces in natural plywood that turn an empty wall into a quiet climbing route: a single platform, a two-tier perch with a sisal post, three sisal steps and a curved hammock.
Arrange them to suit your wall and the way your cat moves. Non-slip mats on the platforms keep landings steady.
Details
Materials: plywood, sisal rope, carpet fabric, faux linen
Hammock: 19" × 13.5" × 6.5"
3-step stairs: 16.5" × 8.5" × 3"
Single platform: 13.5" × 11.5" × 9.5"
2-tier perch: 25" × 22" × 10"
Weight capacity: 22 lb per level
Installation: for concrete, brick or dense stone walls; drywall needs dedicated drywall anchors (not included). Requires a drill and a hammer.', 119.99),
  ('11111111-1111-4111-8111-111111111111', 'window-perch', 'Window Perch', '23.6" L × 11.8" W · holds up to 22 lb', 'A slim shelf that turns the window into your cat''s favorite seat. A black board carries a soft gray velvet cushion, held steady by two support legs, so your cat can rest in the sun and watch the street without claiming the sill.
 The cushion lifts off for cleaning, and the perch folds flat when you want to store it.
 Details
Materials: MDF board in a black finish, velvet cushion with sponge filling
Color: black and gray
Size: 23.6" L × 11.8" W (without support legs)
Cushion: 1.18" thick, removable
Load capacity: 22 lb
Installation: attaches to a window sill or wall with two support legs; accessories and manual included, about 15 minutes to assemble', 79.99),
  ('11111111-1111-4111-8111-111111111111', 'double-layer-scratcher-house', 'Double Layer Scratcher House', 'About 22" L × 11.8" W × 11.8" H · holds up to 44 lb combined', 'Two places in one quiet piece. The top is a curved lounge in dense corrugated cardboard, made for scratching and napping with a gentle backrest. Below, an enclosed cave gives a shy cat somewhere private to disappear to.
 A warm wood grain finish lets it sit in the living room like a small side piece. The two levels separate, so you can use them together or apart, and a pair of hanging balls inside keeps curious paws busy.
 Details
Materials: high density corrugated cardboard with a wood grain finish
Styles: Cat Window or Retro Screen
Size: about 22" L × 11.8" W × 11.8" H (56 × 30 × 30 cm) for Cat Window; about 20" L (51 cm) for Retro Screen
Recommended for: cats up to 44 lb (20 kg) combined
Assembly: simple, no tools; the levels come apart for cleaning and storage', 59.99),
  ('11111111-1111-4111-8111-111111111111', 'gravity-feeder-and-water-station', 'Gravity Feeder and Water Station', '9.8" L × 8.7" W × 9.1" H · 1600 ml of food and 800 ml of water', 'Food and fresh water in one calm, compact station. Gravity refills each side as your cat eats and drinks, so the bowls stay ready through the day and a short trip away is one less thing to plan around.
 Every part comes apart to rinse, and a non slip base keeps the station steady and the floor tidy.
 Details
Function: gravity food hopper and water reservoir in one base
Capacity: 1600 ml of dry food and 800 ml of water
Size: 9.8" L × 8.7" W × 9.1" H (25 × 22 × 23 cm)
Materials: food safe plastic, odorless
Color: mist blue and white
Care: fully detachable for washing
Base: non slip, designed to resist tipping', 44.99),
  ('11111111-1111-4111-8111-111111111111', 'smart-feeder', 'Smart Feeder', '3 L of dry food, around 10 days · up to 10 meals a day', 'Mealtimes, kept on schedule. Set feeding times and portions from your phone, and this clean white feeder serves them on time, whether you are home or not.
 An airtight lid with a desiccant pack keeps kibble fresh, and dual power means a meal is not missed if the outlet goes out.
 Details
Control: app scheduling over 2.4 GHz Wi-Fi
Meals: up to 10 meals a day with adjustable portions
Capacity: 3 L (about 10 cups) of dry food, enough for around 10 days
Freshness: airtight lid with desiccant
Power: dual power supply
Color: white', 99.99),
  ('11111111-1111-4111-8111-111111111111', 'woven-basket-perch', 'Woven Basket Perch', '19" × 19" × 28.25" H · for cats up to 10 lb', 'Two woven baskets on a single sisal post. The lower basket is a deep round nest; the upper one sits higher for watching the room. Natural cattail and cream cushions keep it close to a woven side table in feeling, not a carpeted cat tree.
 The sisal post doubles as a scratcher, and a small hanging ball adds something to bat at. Compact enough for a corner beside the sofa.
 Details
Materials: cattail weave, sisal, particleboard, plush fabric, polypropylene cotton
Color: natural and cream
Overall size: 19" L × 19" W × 28.25" H
Lower basket: 17.75" Ø × 7.75" H; upper basket: 14.25" Ø × 6" H
Cushions: 1/2" thick, one in each basket
Recommended for: cats up to 10 lb
Assembly: required, manual included', 109.99),
  ('11111111-1111-4111-8111-111111111111', 'floor-to-ceiling-cat-tree', 'Floor to Ceiling Cat Tree', 'Fits ceilings from 102" to 118" (2.6 to 3 m) · five perches', 'A single slender post that runs from floor to ceiling, with five round perches set along its height. It reads like a column in the room, giving your cat a vertical path to climb and a high place to settle without taking up floor space.
 A sturdy hemp wrapped section near the base handles daily scratching, and the height adjusts to fit most ceilings.
 Details
Height: adjustable from 102" to 118" (2.6 to 3 m)
Levels: 5 perches
Includes: round perches with turned wooden rails, a woven basket seat and a slatted round hideaway
Scratching: hemp wrapped post
Finish: light natural tone
Installation: stands between floor and ceiling; assembly required', 179.99),
  ('22222222-2222-4222-8222-222222222222', 'fjord-rope-leash', 'Fjord Rope Leash', '1.2 m, for dogs up to 40 kg', 'Braided cotton rope with a brass clip.', 34.00),
  ('22222222-2222-4222-8222-222222222222', 'birch-dog-bed', 'Birch Dog Bed', '90 x 65 cm, for medium dogs', 'Birch frame with a washable wool cushion.', 149.00);

insert into public.orders (brand_id, order_number, customer_email, status, items, total_usd, placed_at, shipped_at, delivered_at, tracking_url) values
  ('11111111-1111-4111-8111-111111111111', 'MA-1042', 'emma.carter@example.com', 'in_transit', '[{"title": "Woven Cattail Cat Tree", "qty": 1}]', 159.99, now() - interval '6 days', now() - interval '4 days', null, 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000042'),
  ('11111111-1111-4111-8111-111111111111', 'MA-1038', 'liam.nguyen@example.com', 'delivered', '[{"title": "Walnut Finish Ottoman with Cat Hideaway", "qty": 1}]', 219.99, now() - interval '19 days', now() - interval '16 days', now() - interval '9 days', null),
  ('11111111-1111-4111-8111-111111111111', 'MA-1045', 'sofia.rossi@example.com', 'unfulfilled', '[{"title": "Natural Modern Cat Tower", "qty": 1}]', 129.99, now() - interval '1 day', null, null, null),
  ('22222222-2222-4222-8222-222222222222', 'NP-2201', 'ingrid.holm@example.com', 'delivered', '[{"title": "Birch Dog Bed", "qty": 1}]', 149.00, now() - interval '12 days', now() - interval '10 days', now() - interval '7 days', null);

insert into public.tickets (brand_id, channel, external_ref, customer_email, customer_name, subject, body) values
  ('11111111-1111-4111-8111-111111111111', 'email', 'demo-1', 'emma.carter@example.com', 'Emma Carter', 'Where is my cat tree?', 'Hi, I ordered the woven cat tree last week (order MA-1042) and the tracking has not moved in two days. Is it lost? It is a birthday present for my sister on Saturday.'),
  ('11111111-1111-4111-8111-111111111111', 'email', 'demo-2', 'liam.nguyen@example.com', 'Liam Nguyen', 'Ottoman arrived with a cracked leg', 'Hello. The walnut ottoman from order MA-1038 arrived with one leg cracked near the base. I have photos. I would like a replacement, not a refund if possible.'),
  ('11111111-1111-4111-8111-111111111111', 'email', 'demo-3', 'harper.lee@example.com', 'Harper Lee', 'Will the wall nest hold my cat?', 'My Maine Coon is about 14 lb. Is the woven wall nest strong enough for him, or should I look at something else?'),
  ('11111111-1111-4111-8111-111111111111', 'email', 'demo-4', 'sofia.rossi@example.com', 'Sofia Rossi', 'Change my address', 'I just placed order MA-1045 and realized I used my old address. Can you ship it to 22 Elm Street, Portland, OR 97205 instead?'),
  ('11111111-1111-4111-8111-111111111111', 'email', 'demo-5', 'noah.b@example.com', 'Noah B', 'Returning the scratcher', 'I bought the curved sisal lounge 3 weeks ago, my cat ignores it. Can I return it? I already threw away the box.'),
  ('11111111-1111-4111-8111-111111111111', 'email', 'demo-6', 'promo@seo-agency.example', 'Growth Team', 'Boost your store traffic 10x', 'Dear store owner, we can rank your Shopify store first on Google in 7 days. Reply now for a free audit.'),
  ('22222222-2222-4222-8222-222222222222', 'email', 'demo-7', 'ingrid.holm@example.com', 'Ingrid Holm', 'Bed cover washing', 'Can the wool cushion of the birch bed go in the washing machine?');

insert into public.ticket_events (ticket_id, brand_id, actor, type)
select id, brand_id, 'seed', 'received' from public.tickets;

-- Shopify shop domain used by the order sync workflow (Miau Atelier's real myshopify domain is not needed locally).
update public.brands set shop_domain = 'miau-atelier-demo.myshopify.com' where slug = 'miau-atelier';

-- Local automation wiring: n8n runs in Docker (see docker-compose.yml) and is reachable from the database container.
insert into private.settings (key, value) values
  ('n8n_approved_webhook_url', 'http://host.docker.internal:5678/webhook/support/approved'),
  ('n8n_webhook_secret', 'local-webhook-secret');
