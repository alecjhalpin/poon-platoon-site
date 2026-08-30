const REGION = 'us';
const REALM = 'area-52';
const GUILD = 'poon-platoon';

const GUILD_RANKS = {
  0:'Poon Daddy', 1:'VP of Poon', 2:'Goddess of Poon', 3:'Poon Connoisseur', 4:'Poon Trooper', 5:'Poon Searcher'
};
const JSON_HEADERS = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'public, max-age=180, s-maxage=600' };
const ERROR_HEADERS = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0' };

async function getAccessToken(clientId, clientSecret) {
  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://oauth.battle.net/token', {
    method:'POST', headers:{ 'Authorization':`Basic ${auth}`, 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({ grant_type:'client_credentials' })
  });
  if (!response.ok) throw new Error(`Battle.net OAuth failed (${response.status})`);
  const data = await response.json();
  if (!data.access_token) throw new Error('Battle.net did not return an access token');
  return data.access_token;
}

async function fetchJson(url, token, required = true) {
  try {
    const response = await fetch(url, { headers:{ 'Authorization':`Bearer ${token}`, 'Accept':'application/json' } });
    if (!response.ok) {
      if (required) throw new Error(`Blizzard request failed (${response.status})`);
      return null;
    }
    return response.json();
  } catch (error) {
    if (required) throw error;
    return null;
  }
}

function mediaMap(data) {
  const map = {};
  for (const asset of data?.assets || []) if (asset?.key && asset?.value) map[asset.key] = asset.value;
  return map;
}

function raidProgress(raidProgression) {
  if (!raidProgression || typeof raidProgression !== 'object') return [];
  return Object.entries(raidProgression).map(([slug, r]) => ({
    slug,
    summary:r?.summary || null,
    totalBosses:r?.total_bosses ?? null,
    normal:r?.normal_bosses_killed ?? 0,
    heroic:r?.heroic_bosses_killed ?? 0,
    mythic:r?.mythic_bosses_killed ?? 0
  })).filter(r => r.summary || r.normal || r.heroic || r.mythic).slice(0,4);
}

async function fetchRaiderIo(name, realmSlug) {
  const url = new URL('https://raider.io/api/v1/characters/profile');
  url.searchParams.set('region', REGION);
  url.searchParams.set('realm', realmSlug);
  url.searchParams.set('name', name);
  url.searchParams.set('fields', 'gear,mythic_plus_scores_by_season:current,raid_progression');
  try {
    const response = await fetch(url.toString(), { headers:{ 'Accept':'application/json', 'User-Agent':'Poon-Platoon-Website/2.0' } });
    if (!response.ok) return { available:false, status:response.status };
    const data = await response.json();
    const season = Array.isArray(data.mythic_plus_scores_by_season) ? data.mythic_plus_scores_by_season[0] : null;
    return {
      available:true,
      profileUrl:data.profile_url || null,
      thumbnailUrl:data.thumbnail_url || null,
      activeSpec:data.active_spec_name || null,
      activeRole:data.active_spec_role || null,
      itemLevel:data.gear?.item_level_equipped ?? null,
      mythicPlusScore:season?.scores?.all ?? null,
      raid:raidProgress(data.raid_progression)
    };
  } catch {
    return { available:false, status:0 };
  }
}

function normalizeStat(value) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') return value.value ?? value.rating ?? value.rating_bonus ?? value.value_percent ?? null;
  return null;
}

function qualityColor(type) {
  const colors = {
    POOR:'#9d9d9d', COMMON:'#ffffff', UNCOMMON:'#1eff00', RARE:'#0070dd', EPIC:'#a335ee',
    LEGENDARY:'#ff8000', ARTIFACT:'#e6cc80', HEIRLOOM:'#00ccff'
  };
  return colors[type] || '#d8d8d8';
}

async function getItemIcon(itemId, token) {
  if (!itemId) return null;
  const data = await fetchJson(`https://${REGION}.api.blizzard.com/data/wow/media/item/${itemId}?namespace=static-${REGION}&locale=en_US`, token, false);
  return mediaMap(data).icon || null;
}

export async function onRequestGet(context) {
  const env = context?.env || {};
  if (!env.BNET_CLIENT_ID || !env.BNET_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error:'Battle.net credentials are unavailable to the character Armory function.' }), { status:503, headers:ERROR_HEADERS });
  }

  const requested = decodeURIComponent(String(context.params?.name || '')).trim();
  if (!requested || !/^[A-Za-zÀ-ÖØ-öø-ÿ'’-]{2,24}$/.test(requested)) {
    return new Response(JSON.stringify({ error:'Invalid character name.' }), { status:400, headers:ERROR_HEADERS });
  }

  try {
    const token = await getAccessToken(env.BNET_CLIENT_ID, env.BNET_CLIENT_SECRET);
    const rosterUrl = `https://${REGION}.api.blizzard.com/data/wow/guild/${REALM}/${GUILD}/roster?namespace=profile-${REGION}&locale=en_US`;
    const roster = await fetchJson(rosterUrl, token, true);
    const entry = (roster.members || []).find(m => String(m?.character?.name || '').toLowerCase() === requested.toLowerCase());
    if (!entry) return new Response(JSON.stringify({ error:'That character is not currently in Poon Platoon.' }), { status:404, headers:ERROR_HEADERS });

    const name = entry.character.name;
    const realmSlug = entry.character.realm?.slug || REALM;
    const slug = encodeURIComponent(name.toLowerCase());
    const base = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${slug}`;

    const [profile, mediaData, equipmentData, statsData, achievementsData, rio] = await Promise.all([
      fetchJson(`${base}?namespace=profile-${REGION}&locale=en_US`, token, true),
      fetchJson(`${base}/character-media?namespace=profile-${REGION}&locale=en_US`, token, false),
      fetchJson(`${base}/equipment?namespace=profile-${REGION}&locale=en_US`, token, false),
      fetchJson(`${base}/statistics?namespace=profile-${REGION}&locale=en_US`, token, false),
      fetchJson(`${base}/achievements?namespace=profile-${REGION}&locale=en_US`, token, false),
      fetchRaiderIo(name, realmSlug)
    ]);

    const media = mediaMap(mediaData);
    const equipped = Array.isArray(equipmentData?.equipped_items) ? equipmentData.equipped_items : [];
    const gear = await Promise.all(equipped.map(async item => ({
      slot:item.slot?.name || item.slot?.type || 'Gear',
      slotType:item.slot?.type || '',
      name:item.name || `Item ${item.item?.id || ''}`,
      itemId:item.item?.id || null,
      itemLevel:item.level?.value ?? null,
      quality:item.quality?.name || item.quality?.type || null,
      qualityType:item.quality?.type || null,
      qualityColor:qualityColor(item.quality?.type),
      icon:await getItemIcon(item.item?.id, token),
      enchantments:(item.enchantments || []).map(e => e.display_string).filter(Boolean)
    })));

    const apiRank = Number.isFinite(entry.rank) ? entry.rank : Number(entry.rank || 0);
    const stats = statsData ? {
      health:normalizeStat(statsData.health), power:normalizeStat(statsData.power),
      strength:normalizeStat(statsData.strength), agility:normalizeStat(statsData.agility), intellect:normalizeStat(statsData.intellect), stamina:normalizeStat(statsData.stamina),
      crit:normalizeStat(statsData.melee_crit) ?? normalizeStat(statsData.spell_crit),
      haste:normalizeStat(statsData.melee_haste) ?? normalizeStat(statsData.spell_haste),
      mastery:normalizeStat(statsData.mastery), versatility:normalizeStat(statsData.versatility), armor:normalizeStat(statsData.armor)
    } : null;

    return new Response(JSON.stringify({
      guild:{ name:'Poon Platoon', realm:'Area 52', rank:GUILD_RANKS[apiRank] || `Rank ${apiRank + 1}`, apiRank },
      character:{
        name:profile.name || name,
        level:profile.level ?? entry.character.level ?? null,
        className:profile.character_class?.name || null,
        raceName:profile.race?.name || null,
        activeSpec:profile.active_spec?.name || rio.activeSpec || null,
        faction:profile.faction?.name || null,
        gender:profile.gender?.name || null,
        title:profile.active_title?.display_string?.replace('{name}', profile.name || name) || null,
        achievementPoints:profile.achievement_points ?? achievementsData?.total_points ?? null,
        equippedItemLevel:profile.equipped_item_level ?? rio.itemLevel ?? null,
        averageItemLevel:profile.average_item_level ?? null,
        armoryUrl:`https://worldofwarcraft.blizzard.com/en-us/character/us/${realmSlug}/${slug}`,
        raiderIoUrl:rio.profileUrl || `https://raider.io/characters/us/${realmSlug}/${encodeURIComponent(name)}`,
        realmSlug
      },
      media:{ avatar:media.avatar || null, inset:media.inset || null, mainRaw:media['main-raw'] || media.main || null },
      gear,
      stats,
      achievements:{ totalPoints:achievementsData?.total_points ?? profile.achievement_points ?? null, totalQuantity:achievementsData?.total_quantity ?? null },
      raiderIo:rio,
      updatedAt:new Date().toISOString()
    }), { status:200, headers:JSON_HEADERS });
  } catch (error) {
    return new Response(JSON.stringify({ error:error.message || 'Unable to load this character.' }), { status:502, headers:ERROR_HEADERS });
  }
}
