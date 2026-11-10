'use strict';

const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'];
const entryMedia = {
  image: {label: 'Image file', accept: imageTypes.join(','), hint: 'PNG, JPEG, WebP, AVIF or GIF.'},
  video: {label: 'Video file', accept: 'video/mp4,video/webm', hint: 'MP4 or WebM. Add a still for the gallery.'},
  model: {label: '3D model file', accept: '.glb', hint: 'GLB. Add a still for the preview and gallery.'},
  pdf: {label: 'PDF file', accept: 'application/pdf,.pdf', hint: 'Choose a PDF document.'},
  audio: {label: 'Audio file', accept: 'audio/*', hint: 'Choose an audio file supported by your browser.'},
  link: {},
  assembly: {}
};

async function imageRatio(file) {
  if (!imageTypes.includes(file.type)) throw new Error('Choose a PNG, JPEG, WebP, AVIF or GIF image.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image.naturalWidth / image.naturalHeight;
  } catch {
    throw new Error('This image could not be opened.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function validateModel(file) {
  const header = new DataView(await file.slice(0, 12).arrayBuffer());
  if (header.byteLength !== 12 || header.getUint32(0, true) !== 0x46546c67 ||
      header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== file.size) {
    throw new Error('Choose a complete glTF 2.0 binary model (.glb).');
  }
}

function webAddress(input) {
  let address;
  try {
    address = new URL(input.trim());
  } catch {
    throw new Error('Enter a complete web address.');
  }
  if (!['https:', 'http:'].includes(address.protocol)) {
    throw new Error('Use an https:// or http:// address.');
  }
  return address.href;
}

function initializeEntry(fragments, storageAvailable, editId) {
  const existing = fragments.find(item => item.id === editId);
  const assembly = existing?.type === 'assembly';
  const pageTitle = assembly ? 'Edit assembly' : (editId ? 'Edit fragment' : 'Create fragment');
  document.title = pageTitle + ' | Fragments of Abundance';
  document.getElementById('archive').hidden = true;
  document.getElementById('entry-page').hidden = false;
  document.querySelector('#entry-page h1').textContent = pageTitle;
  const skip = document.getElementById('skip-main');
  skip.href = '#entry-page';
  skip.textContent = 'Skip to fragment entry';
  document.getElementById('create-link').setAttribute('aria-current', 'page');

  const form = document.getElementById('fragment-form');
  const {title, description, type, media, thumbnail, webUrl, thumbnailCrop, thumbnailSpan} = form.elements;
  const thumbnailField = document.getElementById('thumbnail-field');
  const feedback = document.getElementById('entry-status');
  const submit = form.querySelector('[type="submit"]');
  const choices = document.getElementById('entry-related-options');
  if (existing) {
    title.value = existing.title;
    description.value = existing.description ?? existing.alt ?? (assembly ? 'Two source fragments brought together in one assembly.' : '');
    type.value = existing.type;
    webUrl.value = existing.webUrl ?? '';
    thumbnailCrop.value = existing.thumbnailCrop ?? (existing.image ? 'current' : 'original');
    thumbnailSpan.value = existing.thumbnailSpan ?? 1;
    submit.textContent = 'Save changes';
  }

  document.getElementById('type-field').hidden = assembly;
  type.disabled = assembly;
  document.getElementById('entry-related').hidden = assembly;
  for (const fragment of fragments.filter(item => !assembly && item.type !== 'assembly' && item.id !== editId)) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'related';
    checkbox.value = fragment.id;
    checkbox.checked = existing?.relatedIds?.includes(fragment.id) ?? false;
    label.append(checkbox, fragment.title);
    choices.append(label);
  }

  function updateMediaFields() {
    const kind = type.value;
    const isLink = kind === 'link';
    const settings = entryMedia[kind];
    const previous = existing?.type === kind ? existing : null;
    const keepsMedia = Boolean(previous?.media || previous?.image);
    document.getElementById('media-field').hidden = isLink || assembly;
    media.disabled = isLink || assembly;
    media.required = !isLink && !assembly && !keepsMedia;
    document.getElementById('link-field').hidden = !isLink;
    webUrl.disabled = !isLink;
    webUrl.required = isLink;
    if (!isLink && !assembly) {
      document.getElementById('media-label').textContent = settings.label;
      document.getElementById('media-hint').textContent = keepsMedia
        ? 'Leave this empty to keep the current file.'
        : settings.hint;
      media.accept = settings.accept;
    }
    thumbnailField.hidden = kind === 'image';
    thumbnail.disabled = thumbnailField.hidden;
    thumbnail.required = (kind === 'video' || kind === 'model') && !previous?.thumbnail;
    document.getElementById('thumbnail-label').textContent = previous?.thumbnail
      ? 'Replacement thumbnail (optional)'
      : (thumbnail.required ? 'Thumbnail' : 'Thumbnail (optional)');
  }
  type.addEventListener('change', () => {
    media.value = '';
    updateMediaFields();
  });
  updateMediaFields();

  function report(message) {
    feedback.hidden = false;
    feedback.textContent = message;
  }

  if (!storageAvailable) {
    submit.disabled = true;
    report('This browser could not open local storage for this draft.');
  }
  if (editId && !existing) {
    submit.disabled = true;
    report('This fragment is no longer available to edit.');
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!storageAvailable || (editId && !existing)) return;
    submit.disabled = true;
    report('Saving fragment…');
    try {
      const name = title.value.trim();
      const kind = type.value;
      if (kind === 'assembly' && !assembly) throw new Error('Open an assembly to edit it.');
      const previous = existing?.type === kind ? existing : null;
      const newFile = media.files[0];
      const fileRequired = kind !== 'link' && !assembly;
      let file = fileRequired ? (newFile || previous?.media || null) : null;
      const image = kind === 'image' && !file ? previous?.image : undefined;
      const address = kind === 'link' ? webAddress(webUrl.value) : null;
      const still = kind === 'image' ? file : (thumbnail.files[0] || previous?.thumbnail);
      if (!name) throw new Error('Enter a title.');
      if (fileRequired && !file?.size && !image) throw new Error('Choose a media file.');
      if ((kind === 'video' || kind === 'model') && !still?.size) throw new Error('Choose a thumbnail.');
      if (kind === 'video' && !['video/mp4', 'video/webm'].includes(file.type)) {
        throw new Error('Choose an MP4 or WebM video.');
      }
      if (kind === 'model') await validateModel(file);
      if (kind === 'pdf') {
        if (await file.slice(0, 5).text() !== '%PDF-') throw new Error('Choose a valid PDF document.');
        if (file.type !== 'application/pdf') file = new File([file], file.name, {type: 'application/pdf'});
      }
      if (kind === 'audio' && !file.type.startsWith('audio/')) throw new Error('Choose a supported audio file.');
      const ratio = still ? await imageRatio(still) : (image ? previous.ratio : (assembly ? 2 : 1.5));
      const id = existing?.id ?? ('fragment-' + crypto.randomUUID());
      const relatedIds = new FormData(form).getAll('related');
      await saveFragment({
        id, title: name, description: description.value.trim(), type: kind,
        media: file, webUrl: address, thumbnail: kind === 'image' ? null : (still || null), ratio, relatedIds,
        thumbnailCrop: thumbnailCrop.value === 'current' ? undefined : thumbnailCrop.value,
        thumbnailSpan: Number(thumbnailSpan.value), sources: assembly ? existing.sources : undefined,
        image, alt: image ? previous.alt : undefined, createdAt: existing?.createdAt ?? Date.now()
      }, existing);
      location.assign('index.html?fragment=' + encodeURIComponent(id));
    } catch (error) {
      let message = error.message;
      if (error.name === 'QuotaExceededError') message = 'Browser storage is full. Try a smaller file.';
      else if (error.name === 'AbortError') message = 'This fragment changed. Reopen it from the archive and try again.';
      else if (error instanceof DOMException) message = 'The fragment could not be saved in this browser.';
      report(message);
      submit.disabled = false;
    }
  });
}
