const characterLoading = document.getElementById('character-loading');
const characterError = document.getElementById('character-error');
const characterErrorText = document.getElementById('character-error-text');
const characterView = document.getElementById('character-view');

function cEscape(value = '') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function num(value, fallback = '—') { const n = Number(value); return Number.isFinite(n) ? Math.round(n).toLocaleString() : fallback; }
function pct(value) { const n = Number(value); return Number.isFinite(n) ? `${n.toFixed(n >= 100 ? 0 : 1)}%` : '—'; }
function showCharacterState(state, message = '') {
  if (characterLoading) characterLoading.hidden = state !== 'loading';
  if (characterError) characterError.hidden = state !== 'error';
  if (characterView) characterView.hidden = state !== 'ready';
  if (state === 'error' && characterErrorText) characterErrorText.textContent = message;
}
function characterSlugFromPath() { const parts = location.pathname.split('/').filter(Boolean); return decodeURIComponent(parts[parts.length - 1] || '').trim(); }
function raidText(raid) {
  if (!raid) return '—';
  if (raid.summary) return raid.summary;
  if (raid.mythic) return `${raid.mythic}/${raid.totalBosses || '?'} Mythic`;
  if (raid.heroic) return `${raid.heroic}/${raid.totalBosses || '?'} Heroic`;
  if (raid.normal) return `${raid.normal}/${raid.totalBosses || '?'} Normal`;
  return '—';
}
function tooltipRows(item) {
  const rows = [];
  if (item.binding) rows.push(`<div class="tt-muted">${cEscape(item.binding)}</div>`);
  if (item.itemLevel) rows.push(`<div class="tt-ilvl">Item Level ${num(item.itemLevel)}</div>`);
  if (item.inventoryType || item.itemSubclass) rows.push(`<div class="tt-flex"><span>${cEscape(item.inventoryType || item.slot || '')}</span><span>${cEscape(item.itemSubclass || '')}</span></div>`);
  if (item.armor) rows.push(`<div>${num(item.armor)} Armor</div>`);
  for (const stat of item.stats || []) {
    if (stat.isNegated) continue;
    const text = stat.display || `${stat.value ?? ''} ${stat.type}`;
    if (text) rows.push(`<div class="tt-stat">${cEscape(text)}</div>`);
  }
  for (const ench of item.enchantments || []) rows.push(`<div class="tt-enchant">${cEscape(ench)}</div>`);
  for (const sock of item.sockets || []) rows.push(`<div class="tt-socket">${cEscape(sock.display || sock.itemName || sock.socketType || 'Socket')}</div>`);
  if (item.transmog) rows.push(`<div class="tt-transmog">${cEscape(item.transmog)}</div>`);
  for (const spell of item.spells || []) rows.push(`<div class="tt-spell">${cEscape(spell)}</div>`);
  if (item.durability) rows.push(`<div>${cEscape(item.durability)}</div>`);
  if (item.requirements) rows.push(`<div>${cEscape(item.requirements)}</div>`);
  if (item.sellPrice) rows.push(`<div class="tt-muted">Sell Price: ${item.sellPrice.gold}g ${item.sellPrice.silver}s ${item.sellPrice.copper}c</div>`);
  return rows.join('');
}
function gearCard(item, side = 'left') {
  if (!item) return '<div class="gear-slot gear-slot-empty"><span>Empty</span></div>';
  const icon = item.icon ? `<img src="${cEscape(item.icon)}" alt="" loading="lazy" />` : `<div class="gear-icon-fallback">PP</div>`;
  return `<div class="gear-slot gear-side-${side}" tabindex="0" style="--quality:${cEscape(item.qualityColor || '#d8d8d8')}">
    ${icon}
    <div class="gear-slot-copy"><small>${cEscape(item.slot || '')}</small><strong>${cEscape(item.name || '')}</strong><span>${item.itemLevel ? `iLvl ${num(item.itemLevel)}` : ''}</span></div>
    <div class="item-tooltip" role="tooltip"><strong style="color:${cEscape(item.qualityColor || '#fff')}">${cEscape(item.name || '')}</strong>${tooltipRows(item)}</div>
  </div>`;
}

let floatingTooltip = null;
function ensureFloatingTooltip() {
  if (floatingTooltip) return floatingTooltip;
  floatingTooltip = document.createElement('div');
  floatingTooltip.className = 'floating-item-tooltip';
  floatingTooltip.setAttribute('role','tooltip');
  document.body.appendChild(floatingTooltip);
  return floatingTooltip;
}
function positionFloatingTooltip(slot) {
  const tip = ensureFloatingTooltip();
  if (!tip.classList.contains('visible')) return;
  const rect = slot.getBoundingClientRect();
  const gap = 10;
  const vw = window.innerWidth, vh = window.innerHeight;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = rect.right + gap;
  if (left + tw > vw - 10) left = rect.left - tw - gap;
  left = Math.max(10, Math.min(left, vw - tw - 10));
  let top = rect.top;
  if (top + th > vh - 10) top = vh - th - 10;
  top = Math.max(10, top);
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}
function wireGearTooltips() {
  const tip = ensureFloatingTooltip();
  const hide = () => tip.classList.remove('visible');
  document.querySelectorAll('.gear-slot').forEach(slot => {
    const source = slot.querySelector('.item-tooltip');
    if (!source) return;
    const show = () => {
      tip.innerHTML = source.innerHTML;
      tip.classList.add('visible');
      requestAnimationFrame(() => positionFloatingTooltip(slot));
    };
    slot.addEventListener('mouseenter', show);
    slot.addEventListener('focusin', show);
    slot.addEventListener('mouseleave', hide);
    slot.addEventListener('focusout', hide);
  });
  window.addEventListener('scroll', hide, {passive:true});
  window.addEventListener('resize', hide, {passive:true});
}
async function loadSidebar(currentName) {
  const list = document.getElementById('character-roster-list');
  if (!list) return;
  try {
    const response = await fetch('/api/roster', { headers:{Accept:'application/json'} }); if (!response.ok) return;
    const data = await response.json();
    list.innerHTML = (data.members || []).map(member => {
      const portrait = member.blizzard?.media?.avatar || member.blizzard?.media?.inset || member.raiderIo?.thumbnailUrl;
      return `<a class="mini-roster-member ${member.name.toLowerCase() === currentName.toLowerCase() ? 'active' : ''}" href="${cEscape(member.localArmoryUrl || `/armory/${encodeURIComponent(member.name.toLowerCase())}`)}">${portrait ? `<img src="${cEscape(portrait)}" alt="" />` : `<span class="mini-avatar-fallback">PP</span>`}<span><strong>${cEscape(member.name)}</strong><small>${cEscape(member.level)} ${cEscape(member.className)}</small></span></a>`;
    }).join('');
  } catch {}
}
function renderBlizzardRaids(raids) {
  if (!raids?.length) return '<p class="empty-note">No Blizzard raid encounter data returned yet.</p>';
  return raids.map(exp => `<section class="raid-expansion"><h3>${cEscape(exp.name)}</h3>${exp.instances.map(inst => `<div class="raid-instance"><div class="raid-instance-title">${cEscape(inst.name)}</div><div class="raid-mode-grid">${inst.modes.map(mode => `<div class="raid-mode"><small>${cEscape(mode.difficulty)}</small><strong>${num(mode.completed)}/${num(mode.total)}</strong><span>${mode.completed >= mode.total && mode.total > 0 ? 'Cleared' : 'Bosses defeated'}</span></div>`).join('')}</div></div>`).join('')}</section>`).join('');
}
function collectionImage(url, label) {
  return url ? `<img src="${cEscape(url)}" alt="${cEscape(label)}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=&quot;collection-icon-fallback&quot;>PP</span>'" />` : '<span class="collection-icon-fallback">PP</span>';
}
function renderCollections(collections) {
  const mounts = collections?.mounts || []; const pets = collections?.pets || [];
  return `<div class="collection-toolbar"><button class="collection-subtab active" data-collection="mounts" type="button">Mounts <span>${mounts.length}</span></button><button class="collection-subtab" data-collection="pets" type="button">Pets <span>${pets.length}</span></button><input id="collection-search" type="search" placeholder="Search collections..." /></div>
  <div class="collection-panel active" data-collection-panel="mounts"><div class="collection-grid">${mounts.length ? mounts.map(m => `<article class="collection-card"><div class="collection-icon">${collectionImage(m.image,m.name)}</div><div><strong>${cEscape(m.name)}</strong><span>${m.favorite ? '★ Favorite · ' : ''}${m.usable ? 'Usable' : 'Not usable by this character'}</span></div></article>`).join('') : '<p class="empty-note">No mount collection data returned.</p>'}</div></div>
  <div class="collection-panel" data-collection-panel="pets"><div class="collection-grid">${pets.length ? pets.map(p => `<article class="collection-card"><div class="collection-icon">${collectionImage(p.image,p.name)}</div><div><strong>${cEscape(p.name)}</strong><span>${p.quality ? `${cEscape(p.quality)} · ` : ''}${p.level ? `Level ${cEscape(p.level)}` : 'Collected'}${p.favorite ? ' · ★ Favorite' : ''}</span></div></article>`).join('') : '<p class="empty-note">No pet collection data returned.</p>'}</div></div>`;
}
function wireCollections() {
  const root = document.getElementById('collections-content'); if (!root) return;
  const tabs = root.querySelectorAll('.collection-subtab'); const panels = root.querySelectorAll('.collection-panel'); const search = root.querySelector('#collection-search');
  tabs.forEach(tab => tab.addEventListener('click', () => { tabs.forEach(t=>t.classList.toggle('active',t===tab)); panels.forEach(p=>p.classList.toggle('active',p.dataset.collectionPanel===tab.dataset.collection)); }));
  search?.addEventListener('input', () => { const q=search.value.trim().toLowerCase(); root.querySelectorAll('.collection-card').forEach(card=>{ card.hidden=q && !card.textContent.toLowerCase().includes(q); }); });
}
function renderCharacter(data) {
  const c = data.character || {}, guild = data.guild || {}, rio = data.raiderIo || {};
  document.title = `${c.name || 'Character'} | Poon Armory`;
  document.getElementById('character-name').textContent = c.name || 'Unknown';
  document.getElementById('character-rank').textContent = guild.rank || '';
  document.getElementById('character-subtitle').innerHTML = `${c.level ? `${cEscape(c.level)} ` : ''}${cEscape(c.raceName || '')} <span>${cEscape(c.activeSpec || '')} ${cEscape(c.className || '')}</span><br><small>◆ Poon Platoon · Area 52</small>`;
  const current = document.getElementById('character-roster-current'); if (current) current.innerHTML = `<strong>${cEscape(c.name || '')}</strong><span>${cEscape(guild.rank || '')}</span>`;

  const render = document.getElementById('character-render'), renderFallback = document.getElementById('character-render-fallback');
  const renderUrl = data.media?.mainRaw || data.media?.inset || null;
  if (renderUrl) { render.src=renderUrl; render.alt=`${c.name || 'Character'} character render`; render.hidden=false; renderFallback.hidden=true; render.onerror=()=>{render.hidden=true;renderFallback.hidden=false;}; }
  else { render.hidden=true; renderFallback.hidden=false; }

  const gear = Array.isArray(data.gear) ? data.gear : []; const left = gear.slice(0,Math.ceil(gear.length/2)), right=gear.slice(Math.ceil(gear.length/2));
  document.getElementById('gear-left').innerHTML = left.map(i=>gearCard(i,'left')).join('');
  document.getElementById('gear-right').innerHTML = right.map(i=>gearCard(i,'right')).join('');
  document.getElementById('gear-mobile').innerHTML = gear.length ? gear.map(i=>gearCard(i,'mobile')).join('') : '<p class="empty-note">No equipment data returned by Blizzard yet.</p>';
  wireGearTooltips();

  document.getElementById('summary-ilvl').textContent=num(c.equippedItemLevel); document.getElementById('summary-mplus').textContent=rio.available?num(rio.mythicPlusScore):'—';
  const rioRaids=Array.isArray(rio.raid)?rio.raid:[]; const blizzRaids=Array.isArray(data.raids)?data.raids:[];
  const currentRaid = blizzRaids.flatMap(e=>e.instances).slice(0,3);
  document.getElementById('summary-raid').innerHTML = currentRaid.length ? currentRaid.map(r=>{ const best=[...r.modes].sort((a,b)=>b.completed-a.completed)[0]; return `<div><strong>${cEscape(r.name)}</strong><span>${best?`${best.completed}/${best.total} ${cEscape(best.difficulty)}`:'—'}</span></div>`; }).join('') : (rioRaids.length?rioRaids.slice(0,3).map(r=>`<div><strong>${cEscape(r.slug.replaceAll('-',' '))}</strong><span>${cEscape(raidText(r))}</span></div>`).join(''):'<span class="rio-pending">No raid data yet</span>');

  const infoRows=[['Class',c.className],['Spec',c.activeSpec],['Race',c.raceName],['Level',c.level],['Faction',c.faction],['Guild Rank',guild.rank],['Achievement Points',c.achievementPoints]].filter(([,v])=>v!==null&&v!==undefined&&v!=='');
  document.getElementById('summary-info').innerHTML=infoRows.map(([k,v])=>`<div><dt>${cEscape(k)}</dt><dd>${typeof v==='number'?num(v):cEscape(v)}</dd></div>`).join('');

  const s=data.stats||{}; const statsRows=[['Health',s.health,num], [s.powerType||'Power',s.power,num], ['Strength',s.strength,num], ['Agility',s.agility,num], ['Intellect',s.intellect,num], ['Stamina',s.stamina,num], ['Critical Strike',s.crit,pct], ['Haste',s.haste,pct], ['Mastery',s.mastery,pct], ['Versatility',s.versatility,pct], ['Armor',s.armor,num]];
  document.getElementById('stats-grid').innerHTML=statsRows.filter(([,v])=>v!==null&&v!==undefined).map(([label,value,fmt])=>`<div class="detail-stat"><small>${cEscape(label)}</small><strong>${fmt(value)}</strong></div>`).join('');

  const progress=document.getElementById('progress-grid'); progress.innerHTML=`<div class="progress-card"><small>MYTHIC+ SCORE</small><strong>${rio.available?num(rio.mythicPlusScore):'—'}</strong><span>${rio.available?'Current Raider.IO character score':'Raider.IO profile pending'}</span></div>`;
  document.getElementById('raid-progression-content').innerHTML=renderBlizzardRaids(blizzRaids);
  const ach=data.achievements||{}; document.getElementById('achievement-grid').innerHTML=`<div class="achievement-card"><small>ACHIEVEMENT POINTS</small><strong>${num(ach.totalPoints??c.achievementPoints)}</strong></div><div class="achievement-card"><small>ACHIEVEMENTS COMPLETED</small><strong>${num(ach.totalQuantity)}</strong></div>`;
  document.getElementById('collections-content').innerHTML=renderCollections(data.collections||{}); wireCollections();
  document.getElementById('character-wow-link').href=c.armoryUrl||'#'; document.getElementById('character-rio-link').href=c.raiderIoUrl||'#';
  showCharacterState('ready'); loadSidebar(c.name||'');
}
async function loadCharacter() {
  const slug=characterSlugFromPath(); if (!slug||slug==='armory'){location.replace('/armory');return;} showCharacterState('loading');
  try { const response=await fetch(`/api/character/${encodeURIComponent(slug)}`,{headers:{Accept:'application/json'},cache:'no-store'}); const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error||`Character request failed (${response.status})`); renderCharacter(data); }
  catch(error){showCharacterState('error',error.message||'Could not load this character.');}
}
document.querySelectorAll('.character-tab').forEach(button=>button.addEventListener('click',()=>{const tab=button.dataset.tab;document.querySelectorAll('.character-tab').forEach(b=>b.classList.toggle('active',b===button));document.querySelectorAll('.character-pane').forEach(p=>p.classList.toggle('active',p.dataset.pane===tab));}));
loadCharacter();
