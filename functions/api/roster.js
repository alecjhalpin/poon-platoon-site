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

const GUILD_RANKS = {
  0:'Poon Daddy',
  1:'VP of Poon',
  2:'Goddess of Poon',
  3:'Poon Connoisseur',
  4:'Poon Trooper',
  5:'Poon Searcher'
};

const JSON_HEADERS = {
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'public, max-age=120, s-maxage=600'
};
const ERROR_HEADERS = {
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0'
};

async function getAccessToken(clientId, clientSecret) {
  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://oauth.battle.net/token', {
    method:'POST',
    headers:{
      'Authorization':`Basic ${auth}`,
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body:new URLSearchParams({ grant_type:'client_credentials' })
  });
  if (!response.ok) throw new Error(`Battle.net OAuth failed (${response.status})`);
  const data = await response.json();
  if (!data.access_token) throw new Error('Battle.net did not return an access token');
  return data.access_token;
}

async function blizzardJson(url, token) {
  const response = await fetch(url, { headers:{ 'Authorization':`Bearer ${token}`, 'Accept':'application/json' } });
  if (!response.ok) throw new Error(`Blizzard request failed (${response.status})`);
  return response.json();
}

function mediaAssets(data) {
  const map = {};
  for (const asset of data?.assets || []) if (asset?.key && asset?.value) map[asset.key] = asset.value;
  return {
    avatar: map.avatar || null,
    inset: map.inset || null,
    mainRaw: map['main-raw'] || map.main || null
  };
}

function pickRaidProgress(raidProgression) {
  if (!raidProgression || typeof raidProgression !== 'object') return null;
  const entries = Object.entries(raidProgression);
  if (!entries.length) return null;
  const withProgress = entries.find(([, p]) => p && ((p.mythic_bosses_killed || 0) + (p.heroic_bosses_killed || 0) + (p.normal_bosses_killed || 0) > 0));
  const [slug, raid] = withProgress || entries[0];
  if (!raid) return null;
  return {
    slug,
    summary:raid.summary || null,
    totalBosses:raid.total_bosses ?? null,
    normal:raid.normal_bosses_killed ?? 0,
    heroic:raid.heroic_bosses_killed ?? 0,
    mythic:raid.mythic_bosses_killed ?? 0
  };
}

async function fetchRaiderIoProfile(member) {
  const url = new URL('https://raider.io/api/v1/characters/profile');
  url.searchParams.set('region', REGION);
  url.searchParams.set('realm', member.realmSlug || REALM);
  url.searchParams.set('name', member.name);
  url.searchParams.set('fields', 'gear,mythic_plus_scores_by_season:current,raid_progression');
  try {
    const response = await fetch(url.toString(), { headers:{ 'Accept':'application/json', 'User-Agent':'Poon-Platoon-Website/2.0' } });
    if (!response.ok) return { available:false, status:response.status };
    const data = await response.json();
    const season = Array.isArray(data.mythic_plus_scores_by_season) ? data.mythic_plus_scores_by_season[0] : null;
    return {
      available:true,
      profileUrl:data.profile_url || member.raiderIoUrl,
      thumbnailUrl:data.thumbnail_url || null,
      activeSpec:data.active_spec_name || null,
      activeRole:data.active_spec_role || null,
      itemLevel:data.gear?.item_level_equipped ?? null,
      achievementPoints:data.achievement_points ?? null,
      mythicPlusScore:season?.scores?.all ?? null,
      raid:pickRaidProgress(data.raid_progression)
    };
  } catch {
    return { available:false, status:0 };
  }
}

async function enrichBlizzard(member, token) {
  const slug = encodeURIComponent(member.name.toLowerCase());
  const base = `https://${REGION}.api.blizzard.com/profile/wow/character/${member.realmSlug}/${slug}`;
  const [profileResult, mediaResult] = await Promise.allSettled([
    blizzardJson(`${base}?namespace=profile-${REGION}&locale=en_US`, token),
    blizzardJson(`${base}/character-media?namespace=profile-${REGION}&locale=en_US`, token)
  ]);
  const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
  const media = mediaResult.status === 'fulfilled' ? mediaAssets(mediaResult.value) : { avatar:null, inset:null, mainRaw:null };
  return {
    activeSpec:profile?.active_spec?.name || null,
    equippedItemLevel:profile?.equipped_item_level ?? null,
    averageItemLevel:profile?.average_item_level ?? null,
    achievementPoints:profile?.achievement_points ?? null,
    faction:profile?.faction?.name || null,
    media
  };
}

export async function onRequestGet(context) {
  const env = context?.env || {};
  const clientId = env.BNET_CLIENT_ID;
  const clientSecret = env.BNET_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({
      error:'Cloudflare Pages Function cannot see one or both Battle.net credentials.',
      expectedVariables:['BNET_CLIENT_ID','BNET_CLIENT_SECRET'],
      hasClientId:Boolean(clientId),
      hasClientSecret:Boolean(clientSecret),
      envKeys:Object.keys(env).sort(),
      functionVersion:'armory-v2-2026-08-30'
    }), { status:503, headers:ERROR_HEADERS });
  }

  try {
    const token = await getAccessToken(clientId, clientSecret);
    const rosterUrl = `https://${REGION}.api.blizzard.com/data/wow/guild/${REALM}/${GUILD}/roster?namespace=profile-${REGION}&locale=en_US`;
    const data = await blizzardJson(rosterUrl, token);

    const baseMembers = (data.members || []).map(entry => {
      const c = entry.character || {};
      const apiRank = Number.isFinite(entry.rank) ? entry.rank : Number(entry.rank || 0);
      const name = c.name || 'Unknown';
      const realmSlug = c.realm?.slug || REALM;
      return {
        name,
        characterSlug:name.toLowerCase(),
        level:c.level ?? '?',
        className:CLASS_NAMES[c.playable_class?.id] || `Class ${c.playable_class?.id ?? '?'}`,
        raceName:RACE_NAMES[c.playable_race?.id] || `Race ${c.playable_race?.id ?? '?'}`,
        realmSlug,
        apiRank,
        armoryRank:apiRank === 0 ? 'Guild Master' : `Rank ${apiRank + 1}`,
        guildRank:GUILD_RANKS[apiRank] || `Rank ${apiRank + 1}`,
        armoryUrl:`https://worldofwarcraft.blizzard.com/en-us/character/us/${realmSlug}/${encodeURIComponent(name.toLowerCase())}`,
        raiderIoUrl:`https://raider.io/characters/us/${realmSlug}/${encodeURIComponent(name)}`,
        localArmoryUrl:`/armory/${encodeURIComponent(name.toLowerCase())}`
      };
    }).sort((a,b) => a.apiRank - b.apiRank || a.name.localeCompare(b.name));

    const enrichedMembers = await Promise.all(baseMembers.map(async member => {
      const [blizzard, raiderIo] = await Promise.all([
        enrichBlizzard(member, token),
        fetchRaiderIoProfile(member)
      ]);
      return { ...member, blizzard, raiderIo };
    }));

    const rioCount = enrichedMembers.filter(m => m.raiderIo?.available).length;
    return new Response(JSON.stringify({
      guild:'Poon Platoon', region:'US', realm:'Area 52', updatedAt:new Date().toISOString(),
      raiderIoProfilesFound:rioCount, members:enrichedMembers
    }), { status:200, headers:JSON_HEADERS });
  } catch (error) {
    return new Response(JSON.stringify({
      error:error.message || 'Unable to load Armory.',
      stage:'blizzard-request', functionVersion:'armory-v2-2026-08-30'
    }), { status:502, headers:ERROR_HEADERS });
  }
}
