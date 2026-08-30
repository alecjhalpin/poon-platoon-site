# Poon Platoon Website — Poon Armory V2

Production site: https://poonplatoon.com/
Guild: Poon Platoon — Area 52 (US)
Motto: No Poon Left Behind.

This ZIP is a complete Cloudflare Pages / GitHub repository replacement. Upload its contents directly to the repository root.

## Cloudflare Pages

- Framework preset: None
- Build command: blank
- Build output directory: `/`
- Root directory: `/`
- Production branch: `main`
- Build system: Version 3

### Required Production variables

The Pages Functions use these exact names:

- `BNET_CLIENT_ID` — Text
- `BNET_CLIENT_SECRET` — Secret

Do not rename these unless the Functions are also changed.

## Armory architecture

### `/armory`
Live guild member grid.

Blizzard is authoritative for:
- guild membership
- character names
- class / race / level
- active spec
- equipped item level
- character portraits / media
- guild rank mapping

Raider.IO is an optional enrichment source for:
- current Mythic+ score
- raid progression
- Raider.IO profile link

A character does not need the Poon Platoon guild itself to be indexed by Raider.IO for individual Raider.IO lookup to work.

### `/armory/<character>`
Example: `/armory/poonslurper`

The pretty URL is served by `functions/armory/[name].js`, which loads the shared `character.html` shell. `character.js` then requests `/api/character/<name>`.

The individual character page includes:
- original Poon Platoon war-room background
- Blizzard character render (`main-raw`) with inset fallback
- Blizzard avatar portraits
- full character name, race, class, spec, faction, level and guild rank
- equipped / average item level
- Blizzard equipment list and item icons when returned by the API
- combat-stat summary
- Blizzard achievement summary
- Raider.IO Mythic+ score and raid progress when available
- official WoW Armory and Raider.IO links
- clickable mini guild roster for switching characters

## Guild rank mapping

Blizzard API rank 0 = Guild Master in Blizzard's UI.

- API 0 → Poon Daddy
- API 1 / Armory Rank 2 → VP of Poon
- API 2 / Armory Rank 3 → Goddess of Poon
- API 3 / Armory Rank 4 → Poon Connoisseur
- API 4 / Armory Rank 5 → Poon Trooper
- API 5 / Armory Rank 6 → Poon Searcher

## Key files

- `index.html` — homepage
- `armory.html` — guild Armory grid
- `character.html` — individual character Armory shell
- `script.js` — shared site + guild Armory behavior
- `character.js` — individual character Armory renderer
- `styles.css` — all site + Armory styling
- `functions/api/roster.js` — live Blizzard guild roster + Blizzard media + Raider.IO enrichment
- `functions/api/character/[name].js` — detailed Blizzard character API + Raider.IO data
- `functions/armory/[name].js` — pretty character route
- `assets/pp-armory-warroom.jpg` — custom Poon Platoon character-page background
- `_redirects` — legacy roster and `.html` redirects

## Notes

Blizzard and Raider.IO can independently lag behind in-game changes. The site is designed so Raider.IO being unavailable does not break Blizzard-backed character pages.

## Armory V3
- Corrected Armory war-room branding to use the real PP + peach medallion.
- Enlarged/positioned Blizzard character render.
- Corrected Blizzard Character Statistics mappings (`effective`, rated-stat `value`, versatility bonus).
- Added WoW-style gear hover tooltips using Blizzard equipment fields.
- Made the whole character card clickable while preserving external buttons.
- Added Blizzard raid encounter progression by difficulty.
- Added searchable Blizzard Mounts + Pets collections.

## V4 polish
- Armory stage now overlays the site's real `assets/pp-medallion.png` (PP + peach) over a dark center mask, so the generated paw emblem is no longer the visible guild mark.
- Equipment tooltips are rendered in a viewport-aware floating layer and flip/reposition automatically instead of clipping at the bottom or sides of the Armory stage.
- Mount and pet collection cards request Blizzard Game Data media and display the returned artwork, falling back to the PP mark only when Blizzard returns no usable media.
