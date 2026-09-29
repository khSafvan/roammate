import { describe, expect, it } from 'vitest';
import {
  BackgroundRemovalProvider,
  getActiveBackgroundRemovalProvider,
  removeBackground,
  setBackgroundRemovalProvider,
} from '../src/utils/backgroundRemoval';

class MockSuccessProvider implements BackgroundRemovalProvider {
  readonly name = 'Mock Provider';
  async removeBackground(image: Blob | File, onProgress?: (ratio: number) => void): Promise<Blob> {
    if (onProgress) {
      onProgress(0.5);
      onProgress(1.0);
    }
    return new Blob(['cutout_data'], { type: 'image/webp' });
  }
}

class MockFailingProvider implements BackgroundRemovalProvider {
  readonly name = 'Failing Provider';
  async removeBackground(): Promise<Blob> {
    throw new Error('Neural network model failed to converge');
  }
}

describe('Background Removal Provider Abstraction', () => {
  it('successfully removes background via active provider and reports progress', async () => {
    const originalProvider = getActiveBackgroundRemovalProvider();
    const mockSuccess = new MockSuccessProvider();
    setBackgroundRemovalProvider(mockSuccess);

    const progressUpdates: number[] = [];
    const dummyBlob = new Blob(['original_image'], { type: 'image/jpeg' });

    const result = await removeBackground(dummyBlob, (ratio) => {
      progressUpdates.push(ratio);
    });

    expect(result).toBeInstanceOf(Blob);
    expect(progressUpdates).toContain(0.5);
    expect(progressUpdates).toContain(1.0);

    // Restore original provider
    setBackgroundRemovalProvider(originalProvider);
  });

  it('rejects gracefully with descriptive error when provider fails', async () => {
    const originalProvider = getActiveBackgroundRemovalProvider();
    const mockFailing = new MockFailingProvider();
    setBackgroundRemovalProvider(mockFailing);

    const dummyBlob = new Blob(['original_image'], { type: 'image/jpeg' });

    await expect(removeBackground(dummyBlob)).rejects.toThrow(
      'Neural network model failed to converge'
    );

    setBackgroundRemovalProvider(originalProvider);
  });
});
