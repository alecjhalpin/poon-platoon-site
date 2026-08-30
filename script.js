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
