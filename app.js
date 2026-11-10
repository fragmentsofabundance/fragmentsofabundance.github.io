'use strict';

// Switch off prototype authoring controls when preparing the public archive.
const AUTHORING_ENABLED = false;

// Static local data keeps this draft usable by opening index.html directly.
const sampleFragments = [
  { id: '01', title: 'Tidal room', type: 'image', image: '01-tidal-room', alt: 'An orange fabric suspended in a flooded room facing the sea.' },
  { id: '02', title: 'Paper garden', type: 'image', image: '02-paper-garden', alt: 'A handmade collage of green leaves and lilac petals.' },
  { id: '03', title: 'After rain', type: 'image', image: '03-after-rain', alt: 'Wet tropical leaves lit green against a dark blue night.' },
  { id: '04', title: 'Soft structure', type: 'image', image: '04-soft-structure', alt: 'Lilac fabric loops through an orange metal grid.' },
  { id: 'A1', title: 'Room / garden', type: 'assembly', sources: ['01', '02'], thumbnailSpan: 2, thumbnailCrop: 'landscape' },
  { id: '05', title: 'Passing light', type: 'image', image: '05-passing-light', alt: 'Green, violet and amber light reflected in wet glass.' },
  { id: '06', title: 'Small orbit', type: 'image', image: '06-small-orbit', alt: 'An unusual arrangement of clay and green ceramic on violet sand.' },
  { id: '07', title: 'Blue hour', type: 'image', image: '07-blue-hour', alt: 'A painted coastal settlement beneath a cobalt dusk sky.' },
  { id: '08', title: 'Woven field', type: 'image', image: '08-woven-field', alt: 'A close view of green, purple and orange woven threads.' },
  { id: 'A2', title: 'Structure / field', type: 'assembly', sources: ['04', '08'], thumbnailSpan: 3, thumbnailCrop: 'landscape' }
];
let fragments = sampleFragments;
let byId;
let authoringAvailable = false;
const grid = document.getElementById('grid');
const preview = document.getElementById('preview');
const previewScroll = document.getElementById('preview-scroll');
const about = document.getElementById('about');
const status = document.getElementById('status');
const deleteButton = document.getElementById('delete-fragment');
const previewActionStatus = document.getElementById('preview-action-status');
let order = [];
let filter = 'fragment';
let returnFocus;
// Placeholder crop ratios emulate the supplied masonry reference. Real media can
// supply its own width / height ratio. A crop never affects the full-size preview.
const sampleRatios = {'01': .78, '02': 1, '03': 1.48, '04': .88, '05': .8, '06': 1.35, '07': 1.45, '08': .95};
const cropRatios = {square: 1, landscape: 1.5, portrait: .75};
let masonry;
let eligible = [];
let nextRound = 0;
let lastFragment;

function thumbnailRatio(item) {
  if (cropRatios[item.thumbnailCrop]) return cropRatios[item.thumbnailCrop];
  if (!item.thumbnailCrop && sampleRatios[item.id]) return sampleRatios[item.id];
  return item.ratio || (item.type === 'assembly' ? 2 : 1);
}

function measureMasonry() {
  const styles = getComputedStyle(grid);
  const columns = Number(styles.getPropertyValue('--columns'));
  const gap = parseFloat(styles.getPropertyValue('--gap'));
  const gridWidth = grid.clientWidth;
  return {columns, gap, gridWidth, columnWidth: (gridWidth - gap * (columns - 1)) / columns, heights: Array(columns).fill(0)};
}

function positionCard(item) {
  const {columns, gap, columnWidth, heights} = masonry;
  const span = Math.min(columns, item.thumbnailSpan || 1);
  let column = 0;
  let top = Infinity;
  for (let start = 0; start <= columns - span; start++) {
    const available = Math.max(...heights.slice(start, start + span));
    if (available < top) {
      top = available;
      column = start;
    }
  }
  const width = columnWidth * span + gap * (span - 1);
  const height = Math.max(60, width / thumbnailRatio(item));
  heights.fill(top + height + gap, column, column + span);
  const left = column * (columnWidth + gap);
  return `width:${width}px;height:${height}px;left:${left}px;top:${top}px`;
}

function setGridHeight() {
  grid.style.height = `${Math.max(0, Math.max(...masonry.heights) - masonry.gap)}px`;
}

function layoutMasonry() {
  const next = measureMasonry();
  if (!masonry || next.columnWidth <= 0) return;
  if (next.gridWidth === masonry.gridWidth && next.columns === masonry.columns && next.gap === masonry.gap) return;
  masonry = next;
  for (const card of grid.children) card.style.cssText = positionCard(byId.get(card.dataset.fragment));
  setGridHeight();
  fillViewport();
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function appendRound(items) {
  if (!items.length) return;
  const round = nextRound++;
  grid.insertAdjacentHTML('beforeend', items.map(item => cardMarkup(item, round)).join(''));
  lastFragment = items.at(-1).id;
  setGridHeight();
}

function appendShuffledRound() {
  const round = shuffled(eligible);
  if (round.length > 1 && round[0].id === lastFragment) round.push(round.shift());
  appendRound(round);
}

function fillViewport() {
  if (!eligible.length || masonry.columnWidth <= 0) return;
  while (document.documentElement.scrollHeight <= innerHeight) appendShuffledRound();
}

function resetGallery() {
  eligible = order.filter(item => filter === 'all' || (filter === 'fragment' ? item.type !== 'assembly' : item.type === 'assembly'));
  masonry = measureMasonry();
  nextRound = 0;
  grid.dataset.masonry = 'true';
  grid.replaceChildren();
  setGridHeight();
  appendRound(eligible);
  fillViewport();
}

function returnToGalleryStart() {
  const top = document.getElementById('archive').offsetTop;
  if (window.scrollY > top) window.scrollTo({top, behavior: 'instant'});
}
let layoutFrame;
new ResizeObserver(() => {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(layoutMasonry);
}).observe(grid);
window.addEventListener('resize', () => {
  if (masonry) fillViewport();
});

let scrollFrame;
let lastScrollY = scrollY;
window.addEventListener('scroll', () => {
  const movingDown = scrollY > lastScrollY;
  lastScrollY = scrollY;
  if (!movingDown || scrollFrame || !eligible.length || document.body.classList.contains('modal-open')) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null;
    if (scrollY > 0 && document.documentElement.scrollHeight - (scrollY + innerHeight) < 320) appendShuffledRound();
  });
}, {passive: true});

function escapeHtml(value) {
  const entities = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
  return String(value ?? '').replace(/[&<>"']/g, char => entities[char]);
}

function picture(item, className = '') {
  if (!item.thumbnailUrl && !item.image) {
    const labels = {pdf: 'PDF', audio: 'Audio', link: 'Web link'};
    return `<span class="media-placeholder" aria-hidden="true">${labels[item.type] || 'Fragment'}</span>`;
  }
  const source = item.thumbnailUrl || `assets/images/${item.image}.webp`;
  return `<img class="${className}" src="${escapeHtml(source)}" alt="${escapeHtml(item.alt || item.title)}" loading="lazy" decoding="async">`;
}

function pair(item, className, imageClass = '') {
  const sources = item.sources.map(id => byId.get(id)).filter(Boolean);
  if (!sources.length) return '<span class="media-placeholder">No source fragments</span>';
  return `<span class="${className}" style="--source-count: ${sources.length}">${sources.map(source => picture(source, imageClass)).join('')}</span>`;
}

function previewMedia(item) {
  if (item.type === 'assembly') return pair(item, 'preview-pair', 'preview-image');
  const mediaUrl = escapeHtml(item.mediaUrl);
  const title = escapeHtml(item.title);
  const thumbnail = item.thumbnailUrl ? picture(item, 'preview-image') : '';
  if (item.type === 'video') {
    return `<video class="preview-video" controls playsinline preload="metadata" src="${mediaUrl}" poster="${escapeHtml(item.thumbnailUrl)}" aria-label="${title}"></video>`;
  }
  if (item.type === 'model') {
    return `${thumbnail}<a class="preview-download" href="${mediaUrl}" download="${escapeHtml(item.media.name)}">Download 3D model (.glb)</a>`;
  }
  if (item.type === 'pdf') {
    return `<object class="preview-pdf" type="application/pdf" data="${mediaUrl}" aria-label="${title}"></object>
      <a class="preview-download" href="${mediaUrl}" target="_blank" rel="noopener">Open PDF in a new tab</a>`;
  }
  if (item.type === 'audio') {
    return `${thumbnail}<audio class="preview-audio" controls preload="metadata" src="${mediaUrl}" aria-label="${title}"></audio>`;
  }
  if (item.type === 'link') {
    const address = escapeHtml(item.webUrl);
    return `${thumbnail}<a class="preview-web-link" href="${address}" target="_blank" rel="noopener noreferrer">${address} <span aria-hidden="true">↗</span></a>`;
  }
  return picture(item, 'preview-image');
}

function cardMarkup(item, round) {
  return `<article class="card${item.type === 'assembly' ? ' is-assembly' : ''}" data-fragment="${escapeHtml(item.id)}" data-round="${round}" style="${positionCard(item)}">
    <button class="card-button" type="button" data-id="${escapeHtml(item.id)}" aria-label="Open ${escapeHtml(item.title)}">
      <span class="frame">${item.type === 'assembly' && !item.thumbnailUrl ? pair(item, 'assembly-pair') : picture(item)}
        <span class="card-caption"><span class="card-title">${escapeHtml(item.title)}</span>${item.type === 'assembly' ? '<span class="card-label">Assembly</span>' : ''}</span>
      </span>
    </button>
  </article>`;
}

function openDialog(dialog) {
  returnFocus = document.activeElement;
  dialog.showModal();
  document.body.classList.add('modal-open');
}

function openFragment(id) {
  const item = byId.get(id);
  if (!item) return;
  const relatedIds = new Set([...(item.sources ?? []), ...(item.relatedIds ?? [])]);
  for (const other of fragments) {
    if (other.sources?.includes(id) || other.relatedIds?.includes(id)) relatedIds.add(other.id);
  }
  const related = [...relatedIds].map(key => byId.get(key)).filter(Boolean);
  const description = item.description ?? item.alt ?? 'Two source fragments brought together in one assembly.';
  preview.querySelector('video, audio')?.pause();
  document.getElementById('preview-heading').textContent = item.title;
  document.getElementById('preview-authoring').hidden = !authoringAvailable;
  deleteButton.hidden = item.type === 'assembly';
  const editLink = document.getElementById('edit-fragment');
  editLink.href = '?view=create&edit=' + encodeURIComponent(item.id);
  editLink.setAttribute('aria-label', item.type === 'assembly' ? 'Edit assembly' : 'Edit fragment');
  deleteButton.dataset.id = item.id;
  previewActionStatus.hidden = true;
  const offsetX = Math.random() * 640;
  const offsetY = Math.random() * 640;
  document.getElementById('preview-content').innerHTML = `<div class="preview-layout">
    <div class="preview-hero" style="--offset-x:${offsetX}px;--offset-y:${offsetY}px">
      <div class="preview-media">${previewMedia(item)}</div>
      <div class="preview-title"><h2 id="preview-title">${escapeHtml(item.title)}</h2></div>
    </div>
    <div class="preview-copy">
      ${description ? `<p class="preview-description">${escapeHtml(description)}</p>` : ''}
    ${item.media || item.webUrl || item.thumbnail ? '' : '<p class="sample-note">AI-generated placeholder.</p>'}
    </div>
    ${related.length ? `<section class="related" aria-label="Related fragments"><h3>Related fragments</h3><div class="related-links">${related.map(other => `<button type="button" data-related="${escapeHtml(other.id)}">${escapeHtml(other.title)}</button>`).join('')}</div></section>` : ''}
  </div>`;
  if (!preview.open) openDialog(preview);
  else document.getElementById('close-preview').focus();
  previewScroll.scrollTop = 0;
}

document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    if (filter === button.dataset.filter) return;
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    returnToGalleryStart();
    resetGallery();
    status.textContent = `${eligible.length} ${filter === 'all' ? 'items' : filter === 'fragment' ? 'fragments' : 'assemblies'} available.`;
  });
});

document.getElementById('shuffle-button').addEventListener('click', () => {
  const arrangement = shuffled(order);
  const current = new Set(eligible.map(item => item.id));
  const next = arrangement.filter(item => current.has(item.id));
  if (next.length > 1 && next.every((item, i) => item.id === eligible[i].id)) {
    const first = arrangement.indexOf(next[0]);
    const second = arrangement.indexOf(next[1]);
    [arrangement[first], arrangement[second]] = [arrangement[second], arrangement[first]];
  }
  order = arrangement;
  returnToGalleryStart();
  resetGallery();
  status.textContent = 'Fragments reshuffled.';
});
document.getElementById('top-button').addEventListener('click', () => window.scrollTo({top: 0}));

deleteButton.addEventListener('click', async () => {
  const item = byId.get(deleteButton.dataset.id);
  if (!authoringAvailable || !item || item.type === 'assembly') return;
  if (!window.confirm(`Delete “${item.title}” from this browser's archive?`)) return;
  deleteButton.disabled = true;
  try {
    await deleteFragment(item.id);
    byId.delete(item.id);
    fragments = fragments.filter(fragment => fragment.id !== item.id);
    order = order.filter(fragment => fragment.id !== item.id);
    resetGallery();
    if (item.mediaUrl) URL.revokeObjectURL(item.mediaUrl);
    if (item.thumbnailUrl && item.thumbnailUrl !== item.mediaUrl) URL.revokeObjectURL(item.thumbnailUrl);
    if (preview.open && deleteButton.dataset.id === item.id) {
      preview.close();
      document.querySelector('[data-filter][aria-pressed="true"]').focus();
    }
    status.textContent = `Deleted ${item.title}.`;
  } catch {
    previewActionStatus.textContent = 'The fragment could not be deleted.';
    previewActionStatus.hidden = false;
  } finally {
    deleteButton.disabled = false;
  }
});

grid.addEventListener('click', event => {
  const button = event.target.closest('[data-id]');
  if (button) openFragment(button.dataset.id);
});
document.getElementById('preview-content').addEventListener('click', event => {
  const button = event.target.closest('[data-related]');
  if (button) openFragment(button.dataset.related);
});
document.getElementById('about-button').addEventListener('click', () => openDialog(about));
document.getElementById('close-preview').addEventListener('click', () => preview.close());
document.getElementById('close-about').addEventListener('click', () => about.close());

[preview, about].forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (returnFocus?.isConnected) returnFocus.focus();
  });
});
preview.addEventListener('close', () => {
  preview.querySelector('video, audio')?.pause();
  document.getElementById('preview-content').replaceChildren();
});

async function initializeArchive() {
  const query = new URLSearchParams(location.search);
  let saved = [];
  let storageAvailable = true;
  try {
    saved = await readFragments();
  } catch {
    storageAvailable = false;
  }

  authoringAvailable = AUTHORING_ENABLED && storageAvailable;
  document.getElementById('create-link').hidden = !AUTHORING_ENABLED;
  const storedById = new Map(saved.map(item => [item.id, item]));
  const sampleIds = new Set(sampleFragments.map(item => item.id));
  const samples = sampleFragments.map(item => storedById.get(item.id) ?? item);
  const additions = saved.filter(item => !item.deleted && !sampleIds.has(item.id)).sort((a, b) => b.createdAt - a.createdAt);
  const catalog = [...additions, ...samples].filter(item => !item.deleted);
  if (AUTHORING_ENABLED && query.get('view') === 'create') {
    initializeEntry(catalog, storageAvailable, query.get('edit'));
    return;
  }

  fragments = catalog.map(item => {
    const mediaUrl = item.media ? URL.createObjectURL(item.media) : null;
    const thumbnailUrl = item.thumbnail ? URL.createObjectURL(item.thumbnail) : (item.type === 'image' ? mediaUrl : null);
    return {...item, mediaUrl, thumbnailUrl};
  });
  byId = new Map(fragments.map(item => [item.id, item]));
  order = [...fragments];
  const selected = query.get('fragment');
  if (byId.get(selected)?.type === 'assembly') {
    filter = 'assembly';
    document.querySelectorAll('[data-filter]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    });
  }
  resetGallery();
  if (selected && byId.has(selected)) {
    [...grid.querySelectorAll('[data-id]')].find(button => button.dataset.id === selected)?.focus();
    openFragment(selected);
  }
}

initializeArchive();
