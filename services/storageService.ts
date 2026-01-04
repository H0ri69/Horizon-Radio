import { Song } from '../types';

const DB_NAME = 'HorisAudioDB';
const STORE_NAME = 'songs';
const DB_VERSION = 1;

// Open Database Connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// Save a single song
export const saveSongToDB = async (song: Song): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // We only store essential data. Derived data (like introBuffer) 
    // should be regenerated per session or handled separately to save space/complexity.
    const songToStore = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        file: song.file, // IndexedDB can store File objects natively
        duration: song.duration,
        cover: song.cover
    };

    const request = store.put(songToStore);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Load all songs
export const loadSongsFromDB = async (): Promise<Song[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const songs = request.result as Song[];
      // Return songs. Note: Blob URLs for covers might need regeneration if stored as Blobs,
      // but here we stored 'cover' as string (base64 or URL). 
      // If cover was a Blob URL, it is invalid after refresh. 
      // For simplicity in this demo, we assume covers are rebuilt or invalid covers are handled by UI fallback.
      resolve(songs);
    };
    request.onerror = () => reject(request.error);
  });
};

// Delete a song
export const deleteSongFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Clear all data
export const clearDB = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};