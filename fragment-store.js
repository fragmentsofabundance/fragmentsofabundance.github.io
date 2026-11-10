'use strict';

// IndexedDB stores the metadata and media together in one transaction.
async function fragmentStore(mode, operation) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('foa-cabinet-archive', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('fragments', {keyPath: 'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('fragments', mode);
      const request = operation(transaction.objectStore('fragments'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error || request.error || new DOMException('The change was cancelled.', 'AbortError'));
    });
  } finally {
    database.close();
  }
}

function readFragments() {
  return fragmentStore('readonly', store => store.getAll());
}

function saveFragment(fragment, previous) {
  return fragmentStore('readwrite', store => {
    if (!previous) return store.add(fragment);
    const read = store.get(fragment.id);
    read.onsuccess = () => {
      const current = read.result;
      if (current?.deleted || (current?.revision ?? 0) !== (previous.revision ?? 0)) {
        store.transaction.abort();
        return;
      }
      store.put({...fragment, revision: (current?.revision ?? 0) + 1});
    };
    return read;
  });
}

function deleteFragment(id) {
  // A deletion marker also keeps a removed sample from returning after reload.
  return fragmentStore('readwrite', store => store.put({id, deleted: true}));
}
