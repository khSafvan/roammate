import { describe, expect, it } from 'vitest';
import {
  MAX_FILE_SIZE_BYTES,
  validateImageFile,
} from '../src/utils/imagePipeline';

describe('Outfit Image Processing Pipeline', () => {
  it('accepts valid JPEG, PNG, WEBP, and HEIC files within size limits', () => {
    const validJpg = new File(['dummy_content'], 'outfit.jpg', { type: 'image/jpeg' });
    const validPng = new File(['dummy_content'], 'dress.png', { type: 'image/png' });
    const validWebp = new File(['dummy_content'], 'suit.webp', { type: 'image/webp' });
    const validHeic = new File(['dummy_content'], 'photo.heic', { type: 'image/heic' });

    expect(validateImageFile(validJpg).valid).toBe(true);
    expect(validateImageFile(validPng).valid).toBe(true);
    expect(validateImageFile(validWebp).valid).toBe(true);
    expect(validateImageFile(validHeic).valid).toBe(true);
  });

  it('rejects unsupported file formats like pdf, exe, or svg', () => {
    const pdfFile = new File(['pdf_data'], 'ticket.pdf', { type: 'application/pdf' });
    const exeFile = new File(['bin_data'], 'program.exe', { type: 'application/octet-stream' });
    const svgFile = new File(['<svg></svg>'], 'vector.svg', { type: 'image/svg+xml' });

    const resPdf = validateImageFile(pdfFile);
    expect(resPdf.valid).toBe(false);
    expect(resPdf.error).toContain('Unsupported image format');

    const resExe = validateImageFile(exeFile);
    expect(resExe.valid).toBe(false);

    const resSvg = validateImageFile(svgFile);
    expect(resSvg.valid).toBe(false);
  });

  it('rejects files exceeding the 10 MB limit', () => {
    // Construct mock file over 10 MB
    const largeBlob = new Uint8Array(MAX_FILE_SIZE_BYTES + 1024);
    const oversizedFile = new File([largeBlob], 'huge_photo.jpg', { type: 'image/jpeg' });

    const result = validateImageFile(oversizedFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum allowed limit of 10 MB');
  });

  it('handles empty or missing file safely', () => {
    const result = validateImageFile(null as any);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No image file');
  });
});
