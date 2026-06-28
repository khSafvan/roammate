/**
 * Background Removal Service for Couple Outfit Planner:
 * - Unified interface: `removeBackground(blob, onProgress?): Promise<Blob>`
 * - Provider A: Client-side WASM via `@imgly/background-removal` (Zero server cost)
 * - Provider B: Cloud API provider (Remove.bg / Photoroom / Cloudinary) configurable via env
 * - Progress tracking & graceful failure recovery with retry capabilities
 */

export interface BackgroundRemovalProvider {
  readonly name: string;
  removeBackground(
    image: Blob | File,
    onProgress?: (ratio: number) => void
  ): Promise<Blob>;
}

/**
 * Client-Side WASM Background Removal Provider using @imgly/background-removal
 */
export class WasmBackgroundRemovalProvider implements BackgroundRemovalProvider {
  readonly name = 'Wasm (imgly)';

  async removeBackground(
    image: Blob | File,
    onProgress?: (ratio: number) => void
  ): Promise<Blob> {
    const imgly = await import('@imgly/background-removal');
    const removeFn = imgly.removeBackground || (imgly as any).default;

    if (typeof removeFn !== 'function') {
      throw new Error('@imgly/background-removal module could not be loaded');
    }

    const blob = await removeFn(image, {
      progress: (_key: string, current: number, total: number) => {
        if (total > 0 && onProgress) {
          const ratio = Math.min(Math.max(current / total, 0), 1);
          onProgress(ratio);
        }
      },
      model: 'isnet_fp16',
      output: {
        format: 'image/webp',
        quality: 0.9,
      },
    });

    return blob;
  }
}

/**
 * Cloud API Background Removal Provider (Remove.bg, Photoroom, Cloudinary)
 */
export class CloudBackgroundRemovalProvider implements BackgroundRemovalProvider {
  readonly name = 'Cloud API';
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey: string, endpoint = 'https://api.remove.bg/v1.0/removebg') {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async removeBackground(
    image: Blob | File,
    onProgress?: (ratio: number) => void
  ): Promise<Blob> {
    if (onProgress) onProgress(0.2);

    const formData = new FormData();
    formData.append('image_file', image);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    if (onProgress) onProgress(0.4);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
      },
      body: formData,
    });

    if (onProgress) onProgress(0.8);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cloud background removal failed (${response.status}): ${errText}`);
    }

    const blob = await response.blob();
    if (onProgress) onProgress(1.0);
    return blob;
  }
}

// Active provider selection based on environment configuration
let activeProvider: BackgroundRemovalProvider = new WasmBackgroundRemovalProvider();

export function setBackgroundRemovalProvider(provider: BackgroundRemovalProvider) {
  activeProvider = provider;
}

export function getActiveBackgroundRemovalProvider(): BackgroundRemovalProvider {
  return activeProvider;
}

/**
 * Main background removal function behind unified interface.
 * Times out if processing takes longer than 25 seconds.
 */
export async function removeBackground(
  image: Blob | File,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  const timeoutMs = 25000;
  let timeoutId: any;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Background removal timed out (exceeded 25s)'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      activeProvider.removeBackground(image, onProgress),
      timeoutPromise,
    ]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}
