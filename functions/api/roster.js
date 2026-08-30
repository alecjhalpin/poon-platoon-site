const REGION = 'us';
const REALM = 'area-52';
const GUILD = 'poon-platoon';

const CLASS_NAMES = {
  1:'Warrior', 2:'Paladin', 3:'Hunter', 4:'Rogue', 5:'Priest', 6:'Death Knight', 7:'Shaman',
  8:'Mage', 9:'Warlock', 10:'Monk', 11:'Druid', 12:'Demon Hunter', 13:'Evoker'
};

const RACE_NAMES = {
  1:'Human', 2:'Orc', 3:'Dwarf', 4:'Night Elf', 5:'Undead', 6:'Tauren', 7:'Gnome', 8:'Troll',
  9:'Goblin', 10:'Blood Elf', 11:'Draenei', 22:'Worgen', 24:'Pandaren', 25:'Pandaren', 26:'Pandaren',
  27:'Nightborne', 28:'Highmountain Tauren', 29:'Void Elf', 30:'Lightforged Draenei', 31:'Zandalari Troll',
  32:'Kul Tiran', 34:'Dark Iron Dwarf', 35:'Vulpera', 36:"Mag'har Orc", 37:'Mechagnome',
  52:'Dracthyr', 70:'Dracthyr', 84:'Earthen', 85:'Earthen'
};

// Blizzard's API is zero-based even though the Armory UI displays the first non-GM rank as "Rank 2".
// API 0 = Guild Master, API 1 = Armory Rank 2, API 2 = Armory Rank 3, etc.
const GUILD_RANKS = {
  0:'Poon Daddy',
  1:'VP of Poon',
  2:'Goddess of Poon',
  3:'Poon Connoisseur',
  4:'Poon Trooper',
  5:'Poon Searcher'
};

async function getAccessToken(clientId, clientSecret) {
  const auth = btoa(`${clientId}:${clientSecret}`);
  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const response = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  if (!response.ok) throw new Error(`Battle.net OAuth failed (${response.status})`);
  const data = await response.json();
  if (!data.access_token) throw new Error('Battle.net did not return an access token');
  return data.access_token;
}

export async function onRequestGet(context) {
  // These names intentionally match the Cloudflare Production variables exactly.
  const env = context?.env || {};
  const BNET_CLIENT_ID = env.BNET_CLIENT_ID;
  const BNET_CLIENT_SECRET = env.BNET_CLIENT_SECRET;

  const successHeaders = {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'public, max-age=300, s-maxage=900'
  };
  const errorHeaders = {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0'
  };

  if (!BNET_CLIENT_ID || !BNET_CLIENT_SECRET) {
    return new Response(JSON.stringify({
      error:'Cloudflare Pages Function cannot see one or both Battle.net credentials.',
      expectedVariables:['BNET_CLIENT_ID','BNET_CLIENT_SECRET'],
      hasClientId:Boolean(BNET_CLIENT_ID),
      hasClientSecret:Boolean(BNET_CLIENT_SECRET),
      envKeys:Object.keys(env).sort(),
      functionVersion:'roster-fix-2026-08-30'
    }), { status:503, headers:errorHeaders });
  }

  try {
    const token = await getAccessToken(BNET_CLIENT_ID, BNET_CLIENT_SECRET);
    const url = `https://${REGION}.api.blizzard.com/data/wow/guild/${REALM}/${GUILD}/roster?namespace=profile-${REGION}&locale=en_US`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Blizzard roster request failed (${response.status})`);
    const data = await response.json();

    const members = (data.members || []).map(entry => {
      const c = entry.character || {};
      const apiRank = Number.isFinite(entry.rank) ? entry.rank : Number(entry.rank || 0);
      const name = c.name || 'Unknown';
      const realmSlug = c.realm?.slug || REALM;
      const className = CLASS_NAMES[c.playable_class?.id] || `Class ${c.playable_class?.id ?? '?'}`;
      const raceName = RACE_NAMES[c.playable_race?.id] || `Race ${c.playable_race?.id ?? '?'}`;
      return {
        name,
        level: c.level ?? '?',
        className,
        raceName,
        apiRank,
        armoryRank: apiRank === 0 ? 'Guild Master' : `Rank ${apiRank + 1}`,
        guildRank: GUILD_RANKS[apiRank] || `Rank ${apiRank + 1}`,
        armoryUrl: `https://worldofwarcraft.blizzard.com/en-us/character/us/${realmSlug}/${encodeURIComponent(name.toLowerCase())}`,
        raiderIoUrl: `https://raider.io/characters/us/${realmSlug}/${encodeURIComponent(name)}`
      };
    }).sort((a,b) => a.apiRank - b.apiRank || a.name.localeCompare(b.name));

    return new Response(JSON.stringify({
      guild:'Poon Platoon', region:'US', realm:'Area 52', updatedAt:new Date().toISOString(), members
    }), { status:200, headers:successHeaders });
  } catch (error) {
    return new Response(JSON.stringify({
      error:error.message || 'Unable to load roster.',
      stage:'blizzard-request',
      functionVersion:'roster-fix-2026-08-30'
    }), { status:502, headers:errorHeaders });
  }
}
