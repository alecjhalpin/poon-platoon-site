const characterLoading = document.getElementById('character-loading');
const characterError = document.getElementById('character-error');
const characterErrorText = document.getElementById('character-error-text');
const characterView = document.getElementById('character-view');

function cEscape(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function num(value, fallback = '—') {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : fallback;
}
function pct(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(n >= 100 ? 0 : 1)}%` : '—';
}
function showCharacterState(state, message = '') {
  if (characterLoading) characterLoading.hidden = state !== 'loading';
  if (characterError) characterError.hidden = state !== 'error';
  if (characterView) characterView.hidden = state !== 'ready';
  if (state === 'error' && characterErrorText) characterErrorText.textContent = message;
}
function characterSlugFromPath() {
  const parts = location.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || '').trim();
}
function gearCard(item, side = 'left') {
  if (!item) return '<div class="gear-slot gear-slot-empty"><span>Empty</span></div>';
  const icon = item.icon ? `<img src="${cEscape(item.icon)}" alt="" loading="lazy" />` : `<div class="gear-icon-fallback">PP</div>`;
  return `<div class="gear-slot gear-side-${side}" style="--quality:${cEscape(item.qualityColor || '#d8d8d8')}">
    ${icon}
    <div class="gear-slot-copy"><small>${cEscape(item.slot || '')}</small><strong>${cEscape(item.name || '')}</strong><span>${item.itemLevel ? `iLvl ${num(item.itemLevel)}` : ''}</span></div>
  </div>`;
}
function raidText(raid) {
  if (!raid) return '—';
  if (raid.summary) return raid.summary;
  if (raid.mythic) return `${raid.mythic}/${raid.totalBosses || '?'} Mythic`;
  if (raid.heroic) return `${raid.heroic}/${raid.totalBosses || '?'} Heroic`;
  if (raid.normal) return `${raid.normal}/${raid.totalBosses || '?'} Normal`;
  return '—';
}

async function loadSidebar(currentName) {
  const list = document.getElementById('character-roster-list');
  if (!list) return;
  try {
    const response = await fetch('/api/roster', { headers:{Accept:'application/json'} });
    if (!response.ok) return;
    const data = await response.json();
    list.innerHTML = (data.members || []).map(member => {
      const portrait = member.blizzard?.media?.avatar || member.blizzard?.media?.inset || member.raiderIo?.thumbnailUrl;
      return `<a class="mini-roster-member ${member.name.toLowerCase() === currentName.toLowerCase() ? 'active' : ''}" href="${cEscape(member.localArmoryUrl || `/armory/${encodeURIComponent(member.name.toLowerCase())}`)}">
        ${portrait ? `<img src="${cEscape(portrait)}" alt="" />` : `<span class="mini-avatar-fallback">PP</span>`}
        <span><strong>${cEscape(member.name)}</strong><small>${cEscape(member.level)} ${cEscape(member.className)}</small></span>
      </a>`;
    }).join('');
  } catch {}
}

function renderCharacter(data) {
  const c = data.character || {};
  const guild = data.guild || {};
  const rio = data.raiderIo || {};
  document.title = `${c.name || 'Character'} | Poon Armory`;

  document.getElementById('character-name').textContent = c.name || 'Unknown';
  document.getElementById('character-rank').textContent = guild.rank || '';
  document.getElementById('character-subtitle').innerHTML = `${c.level ? `${cEscape(c.level)} ` : ''}${cEscape(c.raceName || '')} <span>${cEscape(c.activeSpec || '')} ${cEscape(c.className || '')}</span><br><small>◆ Poon Platoon · Area 52</small>`;

  const current = document.getElementById('character-roster-current');
  if (current) current.innerHTML = `<strong>${cEscape(c.name || '')}</strong><span>${cEscape(guild.rank || '')}</span>`;

  const render = document.getElementById('character-render');
  const renderFallback = document.getElementById('character-render-fallback');
  const renderUrl = data.media?.mainRaw || data.media?.inset || null;
  if (renderUrl) {
    render.src = renderUrl;
    render.alt = `${c.name || 'Character'} character render`;
    render.hidden = false;
    renderFallback.hidden = true;
    render.onerror = () => { render.hidden = true; renderFallback.hidden = false; };
  } else {
    render.hidden = true;
    renderFallback.hidden = false;
  }

  const gear = Array.isArray(data.gear) ? data.gear : [];
  const left = gear.slice(0, Math.ceil(gear.length / 2));
  const right = gear.slice(Math.ceil(gear.length / 2));
  document.getElementById('gear-left').innerHTML = left.map(i => gearCard(i,'left')).join('');
  document.getElementById('gear-right').innerHTML = right.map(i => gearCard(i,'right')).join('');
  document.getElementById('gear-mobile').innerHTML = gear.length ? gear.map(i => gearCard(i,'mobile')).join('') : '<p class="empty-note">No equipment data returned by Blizzard yet.</p>';

  document.getElementById('summary-ilvl').textContent = num(c.equippedItemLevel);
  document.getElementById('summary-mplus').textContent = rio.available ? num(rio.mythicPlusScore) : '—';
  const raids = Array.isArray(rio.raid) ? rio.raid : [];
  document.getElementById('summary-raid').innerHTML = raids.length ? raids.slice(0,3).map(r => `<div><strong>${cEscape(r.slug.replaceAll('-',' '))}</strong><span>${cEscape(raidText(r))}</span></div>`).join('') : '<span class="rio-pending">Raider.IO pending</span>';

  const infoRows = [
    ['Class', c.className], ['Spec', c.activeSpec], ['Race', c.raceName], ['Level', c.level], ['Faction', c.faction], ['Guild Rank', guild.rank], ['Achievement Points', c.achievementPoints]
  ].filter(([,v]) => v !== null && v !== undefined && v !== '');
  document.getElementById('summary-info').innerHTML = infoRows.map(([k,v]) => `<div><dt>${cEscape(k)}</dt><dd>${typeof v === 'number' ? num(v) : cEscape(v)}</dd></div>`).join('');

  const stats = data.stats || {};
  const statsRows = [
    ['Health', stats.health, num], ['Power', stats.power, num], ['Strength', stats.strength, num], ['Agility', stats.agility, num], ['Intellect', stats.intellect, num], ['Stamina', stats.stamina, num], ['Crit', stats.crit, pct], ['Haste', stats.haste, pct], ['Mastery', stats.mastery, pct], ['Versatility', stats.versatility, num], ['Armor', stats.armor, num]
  ];
  document.getElementById('stats-grid').innerHTML = statsRows.map(([label,value,fmt]) => `<div class="detail-stat"><small>${label}</small><strong>${fmt(value)}</strong></div>`).join('');

  const progress = document.getElementById('progress-grid');
  progress.innerHTML = `<div class="progress-card"><small>MYTHIC+ SCORE</small><strong>${rio.available ? num(rio.mythicPlusScore) : '—'}</strong><span>${rio.available ? 'Current Raider.IO character score' : 'Raider.IO profile pending'}</span></div>${raids.map(r => `<div class="progress-card"><small>RAID</small><strong>${cEscape(raidText(r))}</strong><span>${cEscape(r.slug.replaceAll('-',' '))}</span></div>`).join('')}`;

  const ach = data.achievements || {};
  document.getElementById('achievement-grid').innerHTML = `<div class="achievement-card"><small>ACHIEVEMENT POINTS</small><strong>${num(ach.totalPoints ?? c.achievementPoints)}</strong></div><div class="achievement-card"><small>ACHIEVEMENTS COMPLETED</small><strong>${num(ach.totalQuantity)}</strong></div>`;

  document.getElementById('character-wow-link').href = c.armoryUrl || '#';
  document.getElementById('character-rio-link').href = c.raiderIoUrl || '#';
  showCharacterState('ready');
  loadSidebar(c.name || '');
}

async function loadCharacter() {
  const slug = characterSlugFromPath();
  if (!slug || slug === 'armory') {
    location.replace('/armory');
    return;
  }
  showCharacterState('loading');
  try {
    const response = await fetch(`/api/character/${encodeURIComponent(slug)}`, { headers:{Accept:'application/json'}, cache:'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Character request failed (${response.status})`);
    renderCharacter(data);
  } catch (error) {
    showCharacterState('error', error.message || 'Could not load this character.');
  }
}

document.querySelectorAll('.character-tab').forEach(button => {
  button.addEventListener('click', () => {
    const tab = button.dataset.tab;
    document.querySelectorAll('.character-tab').forEach(b => b.classList.toggle('active', b === button));
    document.querySelectorAll('.character-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
  });
});

loadCharacter();
