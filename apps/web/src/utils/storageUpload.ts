/**
 * Storage Upload Service for Outfit Images:
 * - Uses signed/direct uploads when connected to Cloudflare API / R2
 * - Seamlessly falls back to local IndexedDB Blob Store when operating offline or in zero-cloud vault mode
 */

import { ApiClient } from '@mojolog/api-client';

const IDB_NAME = 'mojolog_outfit_vault';
const IDB_STORE = 'outfit_blobs';

function openBlobDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in current environment'));
      return;
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalBlob(key: string, blob: Blob): Promise<string> {
  try {
    const db = await openBlobDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    // Create an object URL or data URL for rendering
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Local IndexedDB storage unavailable, falling back to data URL', err);
    return blobToDataUrl(blob);
  }
}

export async function getLocalBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openBlobDb();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface UploadResult {
  publicUrl: string;
  key: string;
}

/**
 * Uploads an image blob to storage:
 * 1. Tries signed direct upload to backend API (R2 / Worker storage)
 * 2. If network fails or no API configured, stores in local offline vault
 */
export async function uploadOutfitImage(
  blob: Blob,
  filename: string,
  contentType: string = 'image/webp',
  apiClient?: ApiClient | null
): Promise<UploadResult> {
  const fallbackKey = `outfits/${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${filename}`;

  if (!apiClient) {
    const localUrl = await saveLocalBlob(fallbackKey, blob);
    return { publicUrl: localUrl, key: fallbackKey };
  }

  try {
    const signResult = await apiClient.signUpload(filename, contentType);
    const method = signResult.method || 'PUT';
    const headers = new Headers(signResult.headers || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', contentType);
    }

    const uploadRes = await fetch(signResult.uploadUrl, {
      method,
      headers,
      body: blob,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed with HTTP ${uploadRes.status}`);
    }

    return {
      publicUrl: signResult.publicUrl,
      key: signResult.key,
    };
  } catch (err) {
    console.warn('Backend storage upload unavailable, saving to local offline vault:', err);
    const localUrl = await saveLocalBlob(fallbackKey, blob);
    return { publicUrl: localUrl, key: fallbackKey };
  }
}
