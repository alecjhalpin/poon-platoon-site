// === POON PLATOON SITE CONFIG ===
const SITE_CONFIG = {
  discordInvite: "https://discord.gg/tNJgsmaM2f"
};

document.querySelectorAll('.discord-link').forEach(link => {
  link.href = SITE_CONFIG.discordInvite;
});

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
navToggle?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const emberBox = document.getElementById('embers');
if (emberBox) {
  for (let i = 0; i < 22; i++) {
    const ember = document.createElement('span');
    ember.style.left = `${Math.random() * 100}%`;
    ember.style.animationDuration = `${12 + Math.random() * 16}s`;
    ember.style.animationDelay = `${-Math.random() * 20}s`;
    ember.style.opacity = `${0.12 + Math.random() * 0.28}`;
    emberBox.appendChild(ember);
  }
}

// === LIVE POON PLATOON ARMORY ===
const rosterGrid = document.getElementById('roster-grid');
const rosterLoading = document.getElementById('roster-loading');
const rosterError = document.getElementById('roster-error');
const rosterErrorText = document.getElementById('roster-error-text');
const rosterStatusText = document.getElementById('roster-status-text');
const rosterSearch = document.getElementById('roster-search');
const rosterRankFilter = document.getElementById('roster-rank-filter');
let rosterMembers = [];

const CLASS_COLORS = {
  Warrior:'#C79C6E', Paladin:'#F58CBA', Hunter:'#ABD473', Rogue:'#FFF569', Priest:'#FFFFFF',
  'Death Knight':'#C41F3B', Shaman:'#0070DE', Mage:'#69CCF0', Warlock:'#9482C9', Monk:'#00FF96',
  Druid:'#FF7D0A', 'Demon Hunter':'#A330C9', Evoker:'#33937F'
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function setArmoryState(state, message = '') {
  if (rosterLoading) {
    rosterLoading.hidden = state !== 'loading';
    rosterLoading.style.display = state === 'loading' ? 'flex' : 'none';
  }
  if (rosterError) {
    rosterError.hidden = state !== 'error';
    rosterError.style.display = state === 'error' ? 'flex' : 'none';
  }
  if (state === 'error' && rosterErrorText) rosterErrorText.textContent = message;
}

function formatScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return Math.round(n).toLocaleString();
}

function formatIlvl(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n).toString() : '—';
}

function raidLabel(raid) {
  if (!raid) return '—';
  if (raid.summary) return raid.summary;
  if (raid.mythic > 0) return `${raid.mythic}/${raid.totalBosses || '?'} M`;
  if (raid.heroic > 0) return `${raid.heroic}/${raid.totalBosses || '?'} H`;
  if (raid.normal > 0) return `${raid.normal}/${raid.totalBosses || '?'} N`;
  return '—';
}

function renderRoster() {
  if (!rosterGrid) return;
  const query = (rosterSearch?.value || '').trim().toLowerCase();
  const rank = rosterRankFilter?.value || 'all';
  const shown = rosterMembers.filter(m => {
    const rio = m.raiderIo || {};
    const haystack = `${m.name} ${m.className} ${m.raceName} ${m.guildRank} ${rio.activeSpec || ''}`.toLowerCase();
    return (!query || haystack.includes(query)) && (rank === 'all' || m.guildRank === rank);
  });

  if (!shown.length) {
    rosterGrid.innerHTML = `<div class="roster-empty"><strong>No Poon located.</strong><span>Try a different search or rank filter.</span></div>`;
    return;
  }

  rosterGrid.innerHTML = shown.map((m, i) => {
    const rio = m.raiderIo || {};
    const classColor = CLASS_COLORS[m.className] || '#e6b955';
    const portrait = rio.thumbnailUrl
      ? `<img class="armory-portrait" src="${escapeHtml(rio.thumbnailUrl)}" alt="${escapeHtml(m.name)} portrait" loading="lazy" />`
      : `<div class="armory-portrait armory-portrait-fallback">PP</div>`;
    const specText = rio.available && rio.activeSpec ? ` · ${escapeHtml(rio.activeSpec)}` : '';
    const rioState = rio.available ? '' : `<span class="rio-pending">Raider.IO pending</span>`;

    return `<article class="roster-card armory-card" style="--class-color:${classColor};animation-delay:${Math.min(i * 35, 350)}ms">
      <div class="armory-card-header">
        ${portrait}
        <div class="roster-name-wrap">
          <h3 class="roster-name">${escapeHtml(m.name)}</h3>
          <div class="roster-character-meta"><span class="roster-class">${escapeHtml(m.className)}</span>${specText} · ${escapeHtml(m.raceName)}</div>
        </div>
        <span class="roster-rank-badge">${escapeHtml(m.guildRank)}</span>
      </div>

      <div class="armory-stats">
        <div class="armory-stat"><small>LEVEL</small><strong>${escapeHtml(m.level)}</strong></div>
        <div class="armory-stat"><small>ITEM LEVEL</small><strong>${formatIlvl(rio.itemLevel)}</strong></div>
        <div class="armory-stat"><small>MYTHIC+ SCORE</small><strong>${formatScore(rio.mythicPlusScore)}</strong></div>
        <div class="armory-stat"><small>RAID</small><strong>${escapeHtml(raidLabel(rio.raid))}</strong></div>
      </div>

      <div class="armory-card-footer">
        ${rioState}
        <div class="roster-links">
          <a href="${escapeHtml(m.armoryUrl)}" target="_blank" rel="noopener">WOW ARMORY ↗</a>
          <a href="${escapeHtml(rio.profileUrl || m.raiderIoUrl)}" target="_blank" rel="noopener">RAIDER.IO ↗</a>
        </div>
      </div>
    </article>`;
  }).join('');
}

async function loadRoster() {
  if (!rosterGrid) return;
  setArmoryState('loading');
  try {
    const response = await fetch(`/api/roster?v=${Date.now()}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Armory request failed (${response.status})`);

    rosterMembers = Array.isArray(data.members) ? data.members : [];
    setArmoryState('success');

    const rioCount = Number(data.raiderIoProfilesFound || 0);
    if (rosterStatusText) {
      rosterStatusText.textContent = `${rosterMembers.length} ${rosterMembers.length === 1 ? 'member' : 'members'} · ${rioCount} Raider.IO profiles linked · Area 52`;
    }
    renderRoster();
  } catch (error) {
    // Never cover a roster that already rendered successfully with a later transient error.
    if (rosterMembers.length) {
      setArmoryState('success');
      if (rosterStatusText) rosterStatusText.textContent = `${rosterMembers.length} members · cached view`;
      return;
    }
    setArmoryState('error', error.message || 'Blizzard did Blizzard things. Try again in a minute.');
    if (rosterStatusText) rosterStatusText.textContent = 'Armory link offline';
  }
}

rosterSearch?.addEventListener('input', renderRoster);
rosterRankFilter?.addEventListener('change', renderRoster);
loadRoster();
