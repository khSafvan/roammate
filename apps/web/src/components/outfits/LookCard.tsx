import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  CloudSun,
  Eye,
  EyeOff,
  FolderHeart,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { DayWeather, Look } from '@mojolog/shared';
import { ApiClient } from '@mojolog/api-client';
import { downscaleAndStripExif, validateImageFile } from '../../utils/imagePipeline';
import { uploadOutfitImage } from '../../utils/storageUpload';
import { WardrobeItem, WardrobePickerModal } from './WardrobePickerModal';

interface LookCardProps {
  look?: Look;
  tripId: string;
  eventId: string;
  person1Name?: string;
  person2Name?: string;
  weather?: DayWeather;
  apiClient?: ApiClient | null;
  existingLooks?: Look[];
  onSaveLook: (look: Look) => void;
  onDeleteLook?: (lookId: string) => void;
  onClose?: () => void;
}

export const LookCard: React.FC<LookCardProps> = ({
  look,
  tripId,
  eventId,
  person1Name = 'John (Husband)',
  person2Name = 'Jane (Wife)',
  weather,
  apiClient,
  existingLooks = [],
  onSaveLook,
  onDeleteLook,
  onClose,
}) => {
  // Slot processing states (progress: 0 to 1, or error text)
  const [slot1Progress, setSlot1Progress] = useState<number | null>(null);
  const [slot1Status, setSlot1Status] = useState<string>('');
  const [slot1Error, setSlot1Error] = useState<string>('');

  const [slot2Progress, setSlot2Progress] = useState<number | null>(null);
  const [slot2Status, setSlot2Status] = useState<string>('');
  const [slot2Error, setSlot2Error] = useState<string>('');

  const [wardrobePickerSlot, setWardrobePickerSlot] = useState<1 | 2 | null>(null);

  const p1FileInputRef = useRef<HTMLInputElement>(null);
  const p2FileInputRef = useRef<HTMLInputElement>(null);

  // Active or draft look
  const currentLook: Look = look || {
    id: `look_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tripId,
    eventId,
    position: 0,
    person1UseCutout: false,
    person2UseCutout: false,
    packed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Memoized Wardrobe looks for Slot 1 and Slot 2
  const slot1WardrobeItems = useMemo(() => {
    if (!existingLooks) return [];
    const map = new Map<string, WardrobeItem>();
    for (const l of existingLooks) {
      const img = l.person1Original || l.person1Cutout;
      if (img && !map.has(img)) {
        map.set(img, {
          imageUrl: img,
          label: l.person1Label,
          sourceEventId: l.eventId,
        });
      }
    }
    return Array.from(map.values());
  }, [existingLooks]);

  const slot2WardrobeItems = useMemo(() => {
    if (!existingLooks) return [];
    const map = new Map<string, WardrobeItem>();
    for (const l of existingLooks) {
      const img = l.person2Original || l.person2Cutout;
      if (img && !map.has(img)) {
        map.set(img, {
          imageUrl: img,
          label: l.person2Label,
          sourceEventId: l.eventId,
        });
      }
    }
    return Array.from(map.values());
  }, [existingLooks]);

  const handleSelectFromWardrobe = (slot: 1 | 2, item: WardrobeItem) => {
    const updatedLook: Look = {
      ...currentLook,
      updatedAt: Date.now(),
      ...(slot === 1
        ? {
            person1Original: item.imageUrl,
            person1Cutout: item.imageUrl,
            person1UseCutout: false,
            person1Label: item.label || currentLook.person1Label,
          }
        : {
            person2Original: item.imageUrl,
            person2Cutout: item.imageUrl,
            person2UseCutout: false,
            person2Label: item.label || currentLook.person2Label,
          }),
    };
    onSaveLook(updatedLook);
  };

  const handleProcessUpload = async (slot: 1 | 2, file: File) => {
    const setProgress = slot === 1 ? setSlot1Progress : setSlot2Progress;
    const setStatus = slot === 1 ? setSlot1Status : setSlot2Status;
    const setError = slot === 1 ? setSlot1Error : setSlot2Error;

    setError('');
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    try {
      // Step 1: Downscale and strip EXIF
      setStatus('Optimizing photo...');
      setProgress(0.3);
      const { blob: compressedBlob } = await downscaleAndStripExif(file, 1200);

      // Step 2: Upload high-quality photo to vault
      setStatus('Saving to vault...');
      setProgress(0.7);

      const origRes = await uploadOutfitImage(compressedBlob, `outfit_${file.name}`, 'image/webp', apiClient);

      setProgress(1.0);
      setStatus('Complete!');

      // Step 3: Patch look data and notify parent
      const updatedLook: Look = {
        ...currentLook,
        updatedAt: Date.now(),
        ...(slot === 1
          ? {
              person1Original: origRes.publicUrl,
              person1Cutout: origRes.publicUrl,
              person1UseCutout: false,
            }
          : {
              person2Original: origRes.publicUrl,
              person2Cutout: origRes.publicUrl,
              person2UseCutout: false,
            }),
      };

      onSaveLook(updatedLook);
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setTimeout(() => {
        setProgress(null);
        setStatus('');
      }, 500);
    }
  };

  const handleToggleCutout = (slot: 1 | 2) => {
    const updated: Look = {
      ...currentLook,
      updatedAt: Date.now(),
      ...(slot === 1
        ? { person1UseCutout: !currentLook.person1UseCutout }
        : { person2UseCutout: !currentLook.person2UseCutout }),
    };
    onSaveLook(updated);
  };

  const handleClearSlot = (slot: 1 | 2) => {
    const updated: Look = {
      ...currentLook,
      updatedAt: Date.now(),
      ...(slot === 1
        ? {
            person1Original: undefined,
            person1Cutout: undefined,
            person1Label: undefined,
            person1UseCutout: true,
          }
        : {
            person2Original: undefined,
            person2Cutout: undefined,
            person2Label: undefined,
            person2UseCutout: true,
          }),
    };
    onSaveLook(updated);
  };

  const handleLabelChange = (slot: 1 | 2, label: string) => {
    const updated: Look = {
      ...currentLook,
      updatedAt: Date.now(),
      ...(slot === 1 ? { person1Label: label } : { person2Label: label }),
    };
    onSaveLook(updated);
  };

  const handleTogglePacked = () => {
    const updated: Look = {
      ...currentLook,
      packed: !currentLook.packed,
      updatedAt: Date.now(),
    };
    onSaveLook(updated);
  };

  // Determine which image URL to display per slot
  const p1Src = currentLook.person1UseCutout
    ? currentLook.person1Cutout || currentLook.person1Original
    : currentLook.person1Original;

  const p2Src = currentLook.person2UseCutout
    ? currentLook.person2Cutout || currentLook.person2Original
    : currentLook.person2Original;

  return (
    <div className="lookbook-canvas" onClick={(e) => e.stopPropagation()}>
      {/* Hidden file inputs for slots */}
      <input
        type="file"
        ref={p1FileInputRef}
        accept="image/jpeg,image/png,image/webp,image/heic"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessUpload(1, file);
        }}
      />
      <input
        type="file"
        ref={p2FileInputRef}
        accept="image/jpeg,image/png,image/webp,image/heic"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessUpload(2, file);
        }}
      />

      {/* Lookbook Header */}
      <div className="lookbook-header">
        <div className="lookbook-header-left">
          <span className="lookbook-badge">
            <Sparkles size={11} />
            <span>Coordinated Look</span>
          </span>
          <span className="lookbook-title">Couple Outfit Lookbook</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Day Weather Chip */}
          {weather && (
            <div
              className="lookbook-weather-chip"
              title={`Forecast: ${weather.tempC}°C, ${weather.conditionText}. ${weather.clothingTip}`}
            >
              <CloudSun size={12} />
              <span>{weather.tempC}°C</span>
              {weather.clothingTip && (
                <span className="weather-tip-text">• {weather.clothingTip}</span>
              )}
            </div>
          )}

          {look && onDeleteLook && (
            <button
              type="button"
              className="slot-action-btn btn-danger"
              onClick={() => onDeleteLook(look.id)}
              title="Delete this look"
            >
              <Trash2 size={12} />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              className="slot-action-btn"
              onClick={onClose}
              title="Close lookbook"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Cutout Presentation Stage */}
      <div className="lookbook-stage">
        {/* Slot 1: Person 1 */}
        <div className="lookbook-slot">
          <div className="slot-header">
            <span className="slot-person-tag">
              <User size={12} />
              <span>{person1Name}</span>
            </span>
            {p1Src && currentLook.person1Cutout && (
              <button
                type="button"
                className={`slot-action-btn ${currentLook.person1UseCutout ? 'active-toggle' : ''}`}
                onClick={() => handleToggleCutout(1)}
                title={currentLook.person1UseCutout ? 'Switch to Original' : 'Switch to Cutout'}
              >
                {currentLook.person1UseCutout ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{currentLook.person1UseCutout ? 'Original' : 'Cutout'}</span>
              </button>
            )}
          </div>

          {/* Slot 1 Image Display / Dropzone */}
          {slot1Progress !== null ? (
            <div className="slot-processing-overlay">
              <Loader2 size={24} className="processing-spinner" />
              <span className="processing-label">{slot1Status || 'Processing...'}</span>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.round(slot1Progress * 100)}%` }}
                />
              </div>
            </div>
          ) : p1Src ? (
            <div className="slot-image-display">
              <img
                src={p1Src}
                alt={currentLook.person1Label || `${person1Name}'s outfit`}
                loading="lazy"
                className={`slot-cutout-img ${!currentLook.person1UseCutout ? 'original-mode' : ''}`}
              />
            </div>
          ) : (
            <div className="slot-empty-container">
              <div
                className="slot-empty-dropzone"
                onClick={() => p1FileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="dropzone-icon">
                  <Upload size={16} />
                </div>
                <span className="dropzone-text">Upload {person1Name}&apos;s Outfit</span>
                <span className="dropzone-subtext">JPG, PNG, WEBP, or HEIC</span>
              </div>
              {slot1WardrobeItems.length > 0 && (
                <button
                  type="button"
                  className="wardrobe-picker-trigger-btn"
                  onClick={() => setWardrobePickerSlot(1)}
                >
                  <FolderHeart size={13} />
                  <span>Choose from Saved Looks ({slot1WardrobeItems.length})</span>
                </button>
              )}
            </div>
          )}

          {slot1Error && <span className="form-error-text">{slot1Error}</span>}

          {/* Slot 1 Label Input */}
          <input
            type="text"
            className="slot-label-input"
            placeholder={`e.g. Linen shirt & chinos`}
            value={currentLook.person1Label || ''}
            onChange={(e) => handleLabelChange(1, e.target.value)}
          />

          {/* Slot 1 Action Bar if filled */}
          {p1Src && (
            <div className="slot-actions-strip">
              <button
                type="button"
                className="slot-action-btn"
                onClick={() => p1FileInputRef.current?.click()}
                title="Replace photo"
              >
                <RefreshCw size={11} />
                <span>Replace</span>
              </button>
              {slot1WardrobeItems.length > 0 && (
                <button
                  type="button"
                  className="slot-action-btn"
                  onClick={() => setWardrobePickerSlot(1)}
                  title="Pick from saved looks"
                >
                  <FolderHeart size={11} />
                  <span>Wardrobe</span>
                </button>
              )}
              <button
                type="button"
                className="slot-action-btn btn-danger"
                onClick={() => handleClearSlot(1)}
                title="Remove photo"
              >
                <Trash2 size={11} />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>

        {/* Slot 2: Person 2 */}
        <div className="lookbook-slot" style={{ marginLeft: '-12px', zIndex: 2 }}>
          <div className="slot-header">
            <span className="slot-person-tag">
              <User size={12} />
              <span>{person2Name}</span>
            </span>
            {p2Src && currentLook.person2Cutout && (
              <button
                type="button"
                className={`slot-action-btn ${currentLook.person2UseCutout ? 'active-toggle' : ''}`}
                onClick={() => handleToggleCutout(2)}
                title={currentLook.person2UseCutout ? 'Switch to Original' : 'Switch to Cutout'}
              >
                {currentLook.person2UseCutout ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{currentLook.person2UseCutout ? 'Original' : 'Cutout'}</span>
              </button>
            )}
          </div>

          {/* Slot 2 Image Display / Dropzone */}
          {slot2Progress !== null ? (
            <div className="slot-processing-overlay">
              <Loader2 size={24} className="processing-spinner" />
              <span className="processing-label">{slot2Status || 'Processing...'}</span>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.round(slot2Progress * 100)}%` }}
                />
              </div>
            </div>
          ) : p2Src ? (
            <div className="slot-image-display">
              <img
                src={p2Src}
                alt={currentLook.person2Label || `${person2Name}'s outfit`}
                loading="lazy"
                className={`slot-cutout-img ${!currentLook.person2UseCutout ? 'original-mode' : ''}`}
              />
            </div>
          ) : (
            <div className="slot-empty-container">
              <div
                className="slot-empty-dropzone"
                onClick={() => p2FileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="dropzone-icon">
                  <Upload size={16} />
                </div>
                <span className="dropzone-text">Upload {person2Name}&apos;s Outfit</span>
                <span className="dropzone-subtext">JPG, PNG, WEBP, or HEIC</span>
              </div>
              {slot2WardrobeItems.length > 0 && (
                <button
                  type="button"
                  className="wardrobe-picker-trigger-btn"
                  onClick={() => setWardrobePickerSlot(2)}
                >
                  <FolderHeart size={13} />
                  <span>Choose from Saved Looks ({slot2WardrobeItems.length})</span>
                </button>
              )}
            </div>
          )}

          {slot2Error && <span className="form-error-text">{slot2Error}</span>}

          {/* Slot 2 Label Input */}
          <input
            type="text"
            className="slot-label-input"
            placeholder={`e.g. Floral midi dress`}
            value={currentLook.person2Label || ''}
            onChange={(e) => handleLabelChange(2, e.target.value)}
          />

          {/* Slot 2 Action Bar if filled */}
          {p2Src && (
            <div className="slot-actions-strip">
              <button
                type="button"
                className="slot-action-btn"
                onClick={() => p2FileInputRef.current?.click()}
                title="Replace photo"
              >
                <RefreshCw size={11} />
                <span>Replace</span>
              </button>
              {slot2WardrobeItems.length > 0 && (
                <button
                  type="button"
                  className="slot-action-btn"
                  onClick={() => setWardrobePickerSlot(2)}
                  title="Pick from saved looks"
                >
                  <FolderHeart size={11} />
                  <span>Wardrobe</span>
                </button>
              )}
              <button
                type="button"
                className="slot-action-btn btn-danger"
                onClick={() => handleClearSlot(2)}
                title="Remove photo"
              >
                <Trash2 size={11} />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lookbook Footer: Packed Checklist Toggle */}
      <div className="lookbook-footer">
        <label className="packed-toggle-label">
          <input
            type="checkbox"
            className="packed-checkbox"
            checked={Boolean(currentLook.packed)}
            onChange={handleTogglePacked}
          />
          <span>Mark as Packed in Luggage</span>
        </label>

        {currentLook.packed && (
          <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={12} />
            <span>Ready for trip</span>
          </span>
        )}
      </div>

      {/* Wardrobe Picker Modal */}
      {wardrobePickerSlot !== null && (
        <WardrobePickerModal
          isOpen={true}
          travelerName={wardrobePickerSlot === 1 ? person1Name : person2Name}
          items={wardrobePickerSlot === 1 ? slot1WardrobeItems : slot2WardrobeItems}
          onSelect={(item) => handleSelectFromWardrobe(wardrobePickerSlot, item)}
          onClose={() => setWardrobePickerSlot(null)}
        />
      )}
    </div>
  );
};
