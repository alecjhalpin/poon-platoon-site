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
