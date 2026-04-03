// ============================================================
//  L & A Wedding Gallery — gallery.js
// ============================================================

const CONFIG = {
  dataFile:   'data/photos.json',
  peopleFile: 'data/people.json',
  videoEmbed: '', // e.g. 'https://www.youtube.com/embed/VIDEO_ID'
};

let allPhotos  = [];
let allPeople  = [];
let activeCategory = 'all';
let activePeople   = new Set();
let lightboxIndex  = 0;
let filteredPhotos = [];

// ── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadPeople(), loadPhotos()]);
  buildPeopleDropdown();
  applyFilters();
  setupVideo();
  setupCategoryFilters();
  setupPeopleSearch();
  setupLightbox();
});

async function loadPhotos() {
  try {
    const res = await fetch(CONFIG.dataFile);
    allPhotos = await res.json();
  } catch(e) {
    allPhotos = [];
    document.getElementById('gallery-meta').textContent =
      'Could not load photos — check data/photos.json';
  }
}

async function loadPeople() {
  try {
    const res = await fetch(CONFIG.peopleFile);
    allPeople = await res.json();
  } catch(e) {
    allPeople = [];
  }
}

// ── VIDEO ────────────────────────────────────────────────────
function setupVideo() {
  if (!CONFIG.videoEmbed) return;
  const sec  = document.getElementById('video-section');
  const wrap = document.getElementById('video-wrap');
  sec.style.display = 'block';
  wrap.innerHTML = `<iframe src="${CONFIG.videoEmbed}" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
}

// ── CATEGORY FILTERS ─────────────────────────────────────────
function setupCategoryFilters() {
  document.querySelectorAll('[data-filter-type="category"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-type="category"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.filterValue;
      applyFilters();
    });
  });
}

// ── PEOPLE SEARCH ────────────────────────────────────────────
function buildPeopleDropdown() {
  const dd = document.getElementById('people-dropdown');
  dd.innerHTML = '';
  allPeople.forEach(person => {
    const opt = document.createElement('div');
    opt.className = 'people-option';
    opt.textContent = person.name;
    opt.dataset.id = person.id;
    if (activePeople.has(person.id)) opt.classList.add('selected');
    opt.addEventListener('click', () => togglePerson(person));
    dd.appendChild(opt);
  });
}

function setupPeopleSearch() {
  const input = document.getElementById('people-search');
  const dd    = document.getElementById('people-dropdown');

  input.addEventListener('focus', () => {
    buildPeopleDropdown();
    dd.classList.add('open');
  });

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    dd.querySelectorAll('.people-option').forEach(opt => {
      opt.style.display = opt.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
    dd.classList.add('open');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.people-search-wrap')) dd.classList.remove('open');
  });

  document.getElementById('clear-people-btn').addEventListener('click', () => {
    activePeople.clear();
    renderPeopleTags();
    buildPeopleDropdown();
    applyFilters();
  });
}

function togglePerson(person) {
  if (activePeople.has(person.id)) {
    activePeople.delete(person.id);
  } else {
    activePeople.add(person.id);
  }
  renderPeopleTags();
  buildPeopleDropdown();
  applyFilters();
  document.getElementById('people-dropdown').classList.remove('open');
  document.getElementById('people-search').value = '';
}

function renderPeopleTags() {
  const container = document.getElementById('active-people-tags');
  const clearBtn  = document.getElementById('clear-people-btn');
  container.innerHTML = '';
  activePeople.forEach(id => {
    const person = allPeople.find(p => p.id === id);
    if (!person) return;
    const tag = document.createElement('div');
    tag.className = 'person-tag';
    tag.innerHTML = `${person.name} <button aria-label="Remove ${person.name}">×</button>`;
    tag.querySelector('button').addEventListener('click', () => togglePerson(person));
    container.appendChild(tag);
  });
  clearBtn.style.display = activePeople.size > 1 ? '' : 'none';
}

// ── FILTER ENGINE ────────────────────────────────────────────
function applyFilters() {
  filteredPhotos = allPhotos.filter(photo => {
    const catOk    = activeCategory === 'all' || photo.category === activeCategory;
    const peopleOk = activePeople.size === 0 ||
      [...activePeople].every(pid => photo.tags && photo.tags.includes(pid));
    return catOk && peopleOk;
  });
  renderGallery(filteredPhotos);
  updateMeta(filteredPhotos.length);
}

function updateMeta(count) {
  const label  = activeCategory === 'all' ? 'All Photos' : formatCategory(activeCategory);
  const suffix = activePeople.size > 0
    ? ` · filtered by ${activePeople.size} person${activePeople.size > 1 ? 's' : ''}`
    : '';
  document.getElementById('gallery-meta').textContent =
    `${label} · ${count} photo${count !== 1 ? 's' : ''}${suffix}`;
}

function formatCategory(cat) {
  const map = {
    'getting-ready': 'Getting Ready',
    'ceremony':      'Ceremony',
    'portraits':     'Portraits',
    'cocktail-hour': 'Cocktail Hour',
    'reception':     'Reception',
    'photobooth':    'Photobooth',
  };
  return map[cat] || cat;
}

// ── RENDER GRID ──────────────────────────────────────────────
function renderGallery(photos) {
  const grid  = document.getElementById('gallery-grid');
  const empty = document.getElementById('empty-state');
  grid.innerHTML = '';

  if (photos.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  photos.forEach((photo, idx) => {
    const item = document.createElement('div');
    item.className = 'photo-item';
    item.style.animationDelay = `${Math.min(idx * 40, 600)}ms`;

    const tagNames = (photo.tags || []).map(tid => {
      const p = allPeople.find(x => x.id === tid);
      return p ? p.name : '';
    }).filter(Boolean);

    item.innerHTML = `
      <img
        src="${photo.thumbnail || photo.url}"
        data-full="${photo.url}"
        alt="${photo.alt || 'Wedding photo'}"
        loading="lazy"
      />
      <div class="photo-item-overlay">
        <div class="photo-item-tags">
          ${tagNames.map(n => `<span class="photo-tag-chip">${n}</span>`).join('')}
        </div>
      </div>
      <span class="photo-cat-badge">${formatCategory(photo.category)}</span>
    `;

    item.addEventListener('click', () => openLightbox(idx));
    grid.appendChild(item);
  });
}

// ── LIGHTBOX ─────────────────────────────────────────────────
function setupLightbox() {
  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-bg').addEventListener('click', closeLightbox);
  document.getElementById('lb-prev').addEventListener('click', () => moveLightbox(-1));
  document.getElementById('lb-next').addEventListener('click', () => moveLightbox(1));

  document.addEventListener('keydown', e => {
    if (!document.getElementById('lightbox').classList.contains('active')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  moveLightbox(-1);
    if (e.key === 'ArrowRight') moveLightbox(1);
  });

  let touchStartX = 0;
  document.getElementById('lightbox').addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  document.getElementById('lightbox').addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) moveLightbox(dx > 0 ? -1 : 1);
  });
}

function openLightbox(idx) {
  lightboxIndex = idx;
  showLightboxPhoto();
  document.getElementById('lightbox').classList.add('active');
  document.getElementById('lightbox-bg').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.getElementById('lightbox-bg').classList.remove('active');
  document.body.style.overflow = '';
}

function moveLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + filteredPhotos.length) % filteredPhotos.length;
  showLightboxPhoto();
}

function showLightboxPhoto() {
  const photo  = filteredPhotos[lightboxIndex];
  const img    = document.getElementById('lb-img');
  const loader = document.getElementById('lb-loader');
  const cap    = document.getElementById('lb-caption');
  const ctr    = document.getElementById('lb-counter');

  img.style.opacity = '0';
  loader.classList.add('active');

  const newImg  = new Image();
  newImg.onload = () => {
    img.src           = newImg.src;
    img.alt           = photo.alt || '';
    img.style.opacity = '1';
    loader.classList.remove('active');
  };
  newImg.src = photo.url;

  const tagNames = (photo.tags || []).map(tid => {
    const p = allPeople.find(x => x.id === tid);
    return p ? p.name : '';
  }).filter(Boolean);

  cap.textContent = tagNames.length > 0 ? tagNames.join(' · ') : (photo.alt || '');
  ctr.textContent = `${lightboxIndex + 1} / ${filteredPhotos.length}`;
}

// ── GLOBAL RESET ─────────────────────────────────────────────
function resetAllFilters() {
  activeCategory = 'all';
  activePeople.clear();
  document.querySelectorAll('[data-filter-type="category"]').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-filter-value="all"]').classList.add('active');
  renderPeopleTags();
  applyFilters();
}
