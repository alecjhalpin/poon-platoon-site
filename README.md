# Poon Platoon Website

Static website ready for Cloudflare Pages.

## Files
- `index.html` — site markup/content
- `styles.css` — all styling/responsive design
- `script.js` — Discord URL + menu/animations
- `assets/poon-platoon-logo.png` — full cross-faction crest
- `assets/pp-medallion.png` — PP icon / favicon

## Before launch
Open `script.js` and replace:

```js
https://discord.gg/YOUR-INVITE
```

with the real guild Discord invite.

## Cloudflare Pages deployment
### Easiest: Direct Upload
1. Cloudflare Dashboard → Workers & Pages.
2. Create application → Pages → Upload assets / Direct Upload.
3. Name the project (for example `poon-platoon`).
4. Upload the contents of this folder or the supplied ZIP.
5. Deploy.
6. In the Pages project: Custom domains → Set up a custom domain.
7. Enter the domain already active in your Cloudflare account.

### GitHub option
Put these files in a GitHub repo and connect that repo in Cloudflare Pages. This is better if you plan to update the site often.

For this plain static site there is no build command and the output directory is the repository root.

## Optional next upgrades
- Discord server widget
- Raider.IO / Warcraft Logs links
- Guild roster page
- Recruitment form
- Raid schedule/events
- `/discord` redirect through Cloudflare Redirect Rules


## Production additions
- Discord invite wired to https://discord.gg/tNJgsmaM2f
- SEO/meta tags, canonical URL, robots directives, and structured data
- Open Graph/Twitter social preview metadata
- Custom 404 page
- robots.txt and sitemap.xml

## Live Blizzard roster

This build includes a Cloudflare Pages Function at `functions/api/roster.js` and a live roster section on the homepage.

The function uses Blizzard's official WoW Profile API. Add these two encrypted environment variables in the Cloudflare Pages project:

- `BNET_CLIENT_ID`
- `BNET_CLIENT_SECRET`

Create the credentials from a Battle.net Developer API client. Never put the client secret in `script.js` or any browser-visible file.

Rank mapping is intentionally based on Blizzard's zero-based API field versus the Armory's one-based UI labels:

- API rank 0 / Guild Master -> Poon Daddy
- API rank 1 / Armory Rank 2 -> VP of Poon
- API rank 2 / Armory Rank 3 -> Goddess of Poon
- API rank 3 / Armory Rank 4 -> Poon Connoisseur
- API rank 4 / Armory Rank 5 -> Poon Trooper
- API rank 5 / Armory Rank 6 -> Poon Searcher
