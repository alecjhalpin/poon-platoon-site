// === POON PLATOON SITE CONFIG ===
const SITE_CONFIG = {
  discordInvite: "https://discord.gg/tNJgsmaM2f"
};

document.querySelectorAll('.discord-link').forEach(link => {
  link.href = SITE_CONFIG.discordInvite;
});

document.getElementById('year').textContent = new Date().getFullYear();

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

// Tiny ambient particles. Purely decorative and intentionally lightweight.
const emberBox = document.getElementById('embers');
for (let i = 0; i < 22; i++) {
  const ember = document.createElement('span');
  ember.style.left = `${Math.random() * 100}%`;
  ember.style.animationDuration = `${12 + Math.random() * 16}s`;
  ember.style.animationDelay = `${-Math.random() * 20}s`;
  ember.style.opacity = `${0.12 + Math.random() * 0.28}`;
  emberBox.appendChild(ember);
}

// === LIVE POON PLATOON ROSTER ===
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

function renderRoster() {
  if (!rosterGrid) return;
  const query = (rosterSearch?.value || '').trim().toLowerCase();
  const rank = rosterRankFilter?.value || 'all';
  const shown = rosterMembers.filter(m => {
    const haystack = `${m.name} ${m.className} ${m.raceName} ${m.guildRank}`.toLowerCase();
    return (!query || haystack.includes(query)) && (rank === 'all' || m.guildRank === rank);
  });

  if (!shown.length) {
    rosterGrid.innerHTML = `<div class="roster-empty"><strong>No Poon located.</strong><span>Try a different search or rank filter.</span></div>`;
    return;
  }

  rosterGrid.innerHTML = shown.map((m, i) => {
    const classColor = CLASS_COLORS[m.className] || '#e6b955';
    return `<article class="roster-card" style="--class-color:${classColor};animation-delay:${Math.min(i * 35, 350)}ms">
      <div class="roster-card-top">
        <div class="roster-name-wrap">
          <h3 class="roster-name">${escapeHtml(m.name)}</h3>
          <div class="roster-character-meta"><span class="roster-class">${escapeHtml(m.className)}</span> · ${escapeHtml(m.raceName)}</div>
        </div>
        <span class="roster-rank-badge">${escapeHtml(m.guildRank)}</span>
      </div>
      <div class="roster-card-bottom">
        <div class="roster-level"><small>Level</small><strong>${escapeHtml(m.level)}</strong></div>
        <div class="roster-links">
          <a href="${escapeHtml(m.armoryUrl)}" target="_blank" rel="noopener">ARMORY ↗</a>
          <a href="${escapeHtml(m.raiderIoUrl)}" target="_blank" rel="noopener">RAIDER.IO ↗</a>
        </div>
      </div>
    </article>`;
  }).join('');
}

async function loadRoster() {
  if (!rosterGrid) return;
  try {
    const response = await fetch('/api/roster', { headers: { 'Accept': 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Roster request failed (${response.status})`);
    rosterMembers = Array.isArray(data.members) ? data.members : [];
    rosterLoading.hidden = true;
    rosterError.hidden = true;
    rosterStatusText.textContent = `${rosterMembers.length} ${rosterMembers.length === 1 ? 'member' : 'members'} on active duty · Area 52`;
    renderRoster();
  } catch (error) {
    rosterLoading.hidden = true;
    rosterError.hidden = false;
    rosterErrorText.textContent = error.message || 'Blizzard did Blizzard things. Try again in a minute.';
    rosterStatusText.textContent = 'Roster link offline';
  }
}

rosterSearch?.addEventListener('input', renderRoster);
rosterRankFilter?.addEventListener('change', renderRoster);
loadRoster();
