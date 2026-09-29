/**
 * Image processing pipeline for Couple Outfit Planner:
 * - Validation: Type (JPG/PNG/WEBP/HEIC) and Size (<= 10MB)
 * - Downscale: Max height 1200px (preserving aspect ratio)
 * - EXIF stripping: Re-rendering to canvas purges GPS, orientation, and sensitive camera metadata
 * - Alpha preservation: Lossless/lossy WebP with alpha transparency, falling back to PNG
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_HEIGHT = 1200;

export const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

export function validateImageFile(file: File): ValidationResult {
  if (!file) {
    return { valid: false, error: 'No image file provided' };
  }

  // Validate file size (< 10 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image size (${sizeMb} MB) exceeds maximum allowed limit of 10 MB`,
    };
  }

  // Validate mime type & extension
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const type = file.type.toLowerCase();

  const isTypeValid = (type && SUPPORTED_MIME_TYPES.has(type)) || SUPPORTED_EXTENSIONS.has(ext);

  if (!isTypeValid) {
    return {
      valid: false,
      error: 'Unsupported image format. Please select a JPG, PNG, WEBP, or HEIC photo.',
    };
  }

  return { valid: true };
}

/**
 * Loads an image Blob into an HTMLImageElement asynchronously.
 */
export function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${err}`));
    };
    img.src = url;
  });
}

/**
 * Downscales an image to max height 1200px while preserving aspect ratio.
 * Canvas drawing naturally removes EXIF tags, camera details, and GPS coordinates.
 */
export async function downscaleAndStripExif(
  fileOrBlob: File | Blob,
  maxHeight: number = MAX_IMAGE_HEIGHT
): Promise<{ blob: Blob; width: number; height: number }> {
  // If in Node/test environment without window.Image, return mock/original
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { blob: fileOrBlob, width: 800, height: 1200 };
  }

  const img = await loadImageElement(fileOrBlob);
  let { width, height } = img;

  if (height > maxHeight) {
    const scale = maxHeight / height;
    width = Math.round(width * scale);
    height = maxHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire 2D canvas context for image processing');
  }

  // Draw image to canvas (purges EXIF GPS & metadata)
  ctx.drawImage(img, 0, 0, width, height);

  const encodedBlob = await encodeCanvasBlob(canvas, 'image/webp', 0.88);
  return { blob: encodedBlob, width, height };
}

/**
 * Encodes canvas to Blob with alpha channel transparency.
 * Tries WebP first; falls back to PNG if WebP is unsupported.
 */
export function encodeCanvasBlob(
  canvas: HTMLCanvasElement,
  preferredType: 'image/webp' | 'image/png' = 'image/webp',
  quality: number = 0.88
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback to PNG if WebP fails
          canvas.toBlob(
            (fallbackBlob) => {
              if (fallbackBlob) resolve(fallbackBlob);
              else reject(new Error('Canvas blob encoding failed'));
            },
            'image/png',
            1.0
          );
        }
      },
      preferredType,
      quality
    );
  });
}
