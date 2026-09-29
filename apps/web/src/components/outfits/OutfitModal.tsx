import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CloudSun,
  Eye,
  EyeOff,
  Loader2,
  Maximize2,
  RefreshCw,
  Shirt,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { Look, Trip } from '@mojolog/shared';
import { ApiClient } from '@mojolog/api-client';
import { useModalA11y } from '../../hooks';
import { downscaleAndStripExif, validateImageFile } from '../../utils/imagePipeline';
import { removeBackground } from '../../utils/backgroundRemoval';
import { uploadOutfitImage } from '../../utils/storageUpload';
import { ImagePreviewModal } from './ImagePreviewModal';

interface OutfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  initialLook?: Look | null;
  initialDayNumber?: number;
  initialEventId?: string;
  apiClient?: ApiClient | null;
  onSaveLook: (look: Look) => void;
  onDeleteLook?: (lookId: string) => void;
}

export const OutfitModal: React.FC<OutfitModalProps> = ({
  isOpen,
  onClose,
  trip,
  initialLook,
  initialDayNumber = 1,
  initialEventId,
  apiClient,
  onSaveLook,
  onDeleteLook,
}) => {
  useModalA11y(isOpen, onClose);

  const person1Name = trip.travelers?.[0] || 'Person 1';
  const person2Name = trip.travelers?.[1] || 'Person 2';

  // Form states
  const [dayNumber, setDayNumber] = useState<number>(initialDayNumber);
  const [eventId, setEventId] = useState<string>(initialEventId || `day_${initialDayNumber}`);
  const [title, setTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [packed, setPacked] = useState<boolean>(false);

  // Person 1 slot state
  const [p1Original, setP1Original] = useState<string | undefined>(undefined);
  const [p1Cutout, setP1Cutout] = useState<string | undefined>(undefined);
  const [p1Label, setP1Label] = useState<string>('');
  const [p1UseCutout, setP1UseCutout] = useState<boolean>(true);
  const [p1Progress, setP1Progress] = useState<number | null>(null);
  const [p1Status, setP1Status] = useState<string>('');
  const [p1Error, setP1Error] = useState<string>('');

  // Person 2 slot state
  const [p2Original, setP2Original] = useState<string | undefined>(undefined);
  const [p2Cutout, setP2Cutout] = useState<string | undefined>(undefined);
  const [p2Label, setP2Label] = useState<string>('');
  const [p2UseCutout, setP2UseCutout] = useState<boolean>(true);
  const [p2Progress, setP2Progress] = useState<number | null>(null);
  const [p2Status, setP2Status] = useState<string>('');
  const [p2Error, setP2Error] = useState<string>('');

  // Big preview modal state
  const [previewState, setPreviewState] = useState<{
    personName: string;
    originalUrl?: string;
    cutoutUrl?: string;
    defaultUseCutout: boolean;
    label?: string;
  } | null>(null);

  const p1FileRef = useRef<HTMLInputElement>(null);
  const p2FileRef = useRef<HTMLInputElement>(null);

  // Initialize/reset form when opening or initialLook changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialLook) {
      setDayNumber(initialLook.dayNumber || initialDayNumber);
      setEventId(initialLook.eventId || initialEventId || `day_${initialDayNumber}`);
      setTitle(initialLook.title || '');
      setNotes(initialLook.notes || '');
      setPacked(Boolean(initialLook.packed));

      setP1Original(initialLook.person1Original);
      setP1Cutout(initialLook.person1Cutout);
      setP1Label(initialLook.person1Label || '');
      setP1UseCutout(initialLook.person1UseCutout ?? true);

      setP2Original(initialLook.person2Original);
      setP2Cutout(initialLook.person2Cutout);
      setP2Label(initialLook.person2Label || '');
      setP2UseCutout(initialLook.person2UseCutout ?? true);
    } else {
      setDayNumber(initialDayNumber);
      setEventId(initialEventId || `day_${initialDayNumber}`);
      setTitle('');
      setNotes('');
      setPacked(false);

      setP1Original(undefined);
      setP1Cutout(undefined);
      setP1Label('');
      setP1UseCutout(true);

      setP2Original(undefined);
      setP2Cutout(undefined);
      setP2Label('');
      setP2UseCutout(true);
    }

    setP1Progress(null);
    setP1Status('');
    setP1Error('');
    setP2Progress(null);
    setP2Status('');
    setP2Error('');
  }, [isOpen, initialLook, initialDayNumber, initialEventId]);

  if (!isOpen) return null;

  // Selected Day and stops lookup
  const selectedDay = trip.days.find((d) => d.dayNumber === dayNumber) || trip.days[0];
  const dayStops = selectedDay?.stops || [];
  const weather = selectedDay?.weather;

  const handleUploadSlot = async (slot: 1 | 2, file: File) => {
    const setProgress = slot === 1 ? setP1Progress : setP2Progress;
    const setStatus = slot === 1 ? setP1Status : setP2Status;
    const setError = slot === 1 ? setP1Error : setP2Error;
    const setOrig = slot === 1 ? setP1Original : setP2Original;
    const setCut = slot === 1 ? setP1Cutout : setP2Cutout;
    const setUseCut = slot === 1 ? setP1UseCutout : setP2UseCutout;

    setError('');
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      setStatus('Optimizing photo...');
      setProgress(0.15);
      const { blob: compressedBlob } = await downscaleAndStripExif(file, 1200);

      setStatus('Removing background (AI Cutout)...');
      setProgress(0.35);
      let cutoutBlob: Blob | null = null;
      try {
        cutoutBlob = await removeBackground(compressedBlob, (ratio) => {
          setProgress(0.35 + ratio * 0.45);
        });
      } catch (bgErr) {
        console.warn('Background removal failed, falling back to original:', bgErr);
        setError('Background removal failed — using original photo.');
      }

      setStatus('Saving to storage...');
      setProgress(0.85);

      const [origRes, cutRes] = await Promise.all([
        uploadOutfitImage(compressedBlob, `orig_${file.name}`, 'image/webp', apiClient),
        cutoutBlob
          ? uploadOutfitImage(cutoutBlob, `cutout_${file.name}`, 'image/webp', apiClient)
          : Promise.resolve(null),
      ]);

      setProgress(1.0);
      setStatus('Complete!');

      setOrig(origRes.publicUrl);
      if (cutRes) {
        setCut(cutRes.publicUrl);
        setUseCut(true);
      } else {
        setCut(undefined);
        setUseCut(false);
      }
    } catch (err: any) {
      console.error('Photo pipeline failed:', err);
      setError(err?.message || 'Upload failed');
    } finally {
      setTimeout(() => {
        setProgress(null);
        setStatus('');
      }, 600);
    }
  };

  const handleRerunCutout = async (slot: 1 | 2) => {
    const origUrl = slot === 1 ? p1Original : p2Original;
    if (!origUrl) return;

    const setProgress = slot === 1 ? setP1Progress : setP2Progress;
    const setStatus = slot === 1 ? setP1Status : setP2Status;
    const setError = slot === 1 ? setP1Error : setP2Error;
    const setCut = slot === 1 ? setP1Cutout : setP2Cutout;
    const setUseCut = slot === 1 ? setP1UseCutout : setP2UseCutout;

    setError('');
    setStatus('Re-running background removal...');
    setProgress(0.2);

    try {
      const res = await fetch(origUrl);
      const blob = await res.blob();
      const cutoutBlob = await removeBackground(blob, (r) => setProgress(0.2 + r * 0.6));

      setStatus('Uploading new cutout...');
      setProgress(0.85);
      const cutRes = await uploadOutfitImage(
        cutoutBlob,
        `cutout_rerun_${Date.now()}.webp`,
        'image/webp',
        apiClient
      );

      setCut(cutRes.publicUrl);
      setUseCut(true);
      setProgress(1.0);
      setStatus('Cutout refreshed!');
    } catch (err: any) {
      console.error('Re-run cutout failed:', err);
      setError('Could not regenerate cutout from photo.');
    } finally {
      setTimeout(() => {
        setProgress(null);
        setStatus('');
      }, 600);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Default title if empty
    const finalTitle =
      title.trim() ||
      (eventId.startsWith('day_')
        ? `Day ${dayNumber} Look`
        : dayStops.find((s) => s.id === eventId)?.title || `Day ${dayNumber} Outfit`);

    const lookToSave: Look = {
      id: initialLook?.id || `look_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tripId: trip.id,
      dayNumber,
      eventId,
      title: finalTitle,
      position: initialLook?.position || 0,
      person1Original: p1Original,
      person1Cutout: p1Cutout,
      person1Label: p1Label.trim() || undefined,
      person1UseCutout: p1UseCutout,
      person2Original: p2Original,
      person2Cutout: p2Cutout,
      person2Label: p2Label.trim() || undefined,
      person2UseCutout: p2UseCutout,
      notes: notes.trim() || undefined,
      packed,
      createdAt: initialLook?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSaveLook(lookToSave);
    onClose();
  };

  const p1DisplaySrc = p1UseCutout ? p1Cutout || p1Original : p1Original;
  const p2DisplaySrc = p2UseCutout ? p2Cutout || p2Original : p2Original;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
        <div
          className="modal-card outfit-editor-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '640px', width: '95%' }}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-left">
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shirt size={20} />
              </div>
              <div>
                <h3 className="modal-title">
                  {initialLook ? 'Edit Outfit Look' : 'Add Coordinated Look'}
                </h3>
                <p className="modal-subtitle">
                  Attach coordinated outfits to your daily itinerary
                </p>
              </div>
            </div>

            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={p1FileRef}
              accept="image/jpeg,image/png,image/webp,image/heic"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadSlot(1, f);
              }}
            />
            <input
              type="file"
              ref={p2FileRef}
              accept="image/jpeg,image/png,image/webp,image/heic"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadSlot(2, f);
              }}
            />

            {/* Row 1: Itinerary Day & Event Assignment */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="outfit-day-select">
                  Itinerary Day
                </label>
                <select
                  id="outfit-day-select"
                  className="form-input"
                  value={dayNumber}
                  onChange={(e) => {
                    const newDay = Number(e.target.value);
                    setDayNumber(newDay);
                    setEventId(`day_${newDay}`);
                  }}
                >
                  {trip.days.map((d) => (
                    <option key={d.id} value={d.dayNumber}>
                      Day {d.dayNumber} {d.dateStr ? `(${d.dateStr.replace(/^[A-Za-z]+,\s*/, '')})` : ''} - {d.title || 'Day Plan'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="outfit-event-select">
                  Event / Activity
                </label>
                <select
                  id="outfit-event-select"
                  className="form-input"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                >
                  <option value={`day_${dayNumber}`}>🌟 General Day Look / Free Time</option>
                  {dayStops
                    .filter((s) => s.category !== 'note')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        📍 #{s.orderIndex} {s.title} ({s.startTime})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Weather Tip for Selected Day */}
            {weather && (
              <div className="lookbook-weather-chip" style={{ width: 'fit-content' }}>
                <CloudSun size={13} />
                <span>
                  Day {dayNumber} Forecast: {weather.tempC}°C, {weather.conditionText}
                </span>
                {weather.clothingTip && <span>&bull; {weather.clothingTip}</span>}
              </div>
            )}

            {/* Outfit Title Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="outfit-title-input">
                Look Title
              </label>
              <input
                id="outfit-title-input"
                type="text"
                className="form-input"
                placeholder="e.g. Romantic Sunset Dinner, Walking Tour, Beach Resort"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Side-by-Side Photo Slots (Person 1 & Person 2) */}
            <div className="lookbook-stage" style={{ gap: '14px', minHeight: '260px' }}>
              {/* Person 1 Slot */}
              <div className="lookbook-slot" style={{ width: '100%', maxWidth: 'none' }}>
                <div className="slot-header">
                  <span className="slot-person-tag">
                    <User size={12} />
                    <span>{person1Name}</span>
                  </span>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {p1DisplaySrc && (
                      <button
                        type="button"
                        className="slot-action-btn"
                        onClick={() =>
                          setPreviewState({
                            personName: person1Name,
                            originalUrl: p1Original,
                            cutoutUrl: p1Cutout,
                            defaultUseCutout: p1UseCutout,
                            label: p1Label,
                          })
                        }
                        title="Zoom / Inspect photo"
                      >
                        <Maximize2 size={11} />
                      </button>
                    )}

                    {p1Cutout && p1Original && (
                      <button
                        type="button"
                        className={`slot-action-btn ${p1UseCutout ? 'active-toggle' : ''}`}
                        onClick={() => setP1UseCutout(!p1UseCutout)}
                        title={p1UseCutout ? 'View Original' : 'View Cutout'}
                      >
                        {p1UseCutout ? <EyeOff size={11} /> : <Eye size={11} />}
                        <span>{p1UseCutout ? 'Original' : 'Cutout'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload or Cutout Stage */}
                {p1Progress !== null ? (
                  <div className="slot-processing-overlay">
                    <Loader2 size={24} className="processing-spinner" />
                    <span className="processing-label">{p1Status}</span>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${Math.round(p1Progress * 100)}%` }} />
                    </div>
                  </div>
                ) : p1DisplaySrc ? (
                  <div
                    className="slot-image-display"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleUploadSlot(1, f);
                    }}
                  >
                    <img
                      src={p1DisplaySrc}
                      alt={p1Label || `${person1Name}'s outfit`}
                      className={`slot-cutout-img ${!p1UseCutout ? 'original-mode' : ''}`}
                    />
                  </div>
                ) : (
                  <div
                    className="slot-empty-dropzone"
                    onClick={() => p1FileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleUploadSlot(1, f);
                    }}
                  >
                    <div className="dropzone-icon">
                      <Upload size={18} />
                    </div>
                    <span className="dropzone-text">Upload {person1Name}&apos;s Photo</span>
                    <span className="dropzone-subtext">Click or drag &bull; Auto-Cutout</span>
                  </div>
                )}

                {p1Error && <span className="form-error-text">{p1Error}</span>}

                <input
                  type="text"
                  className="slot-label-input"
                  placeholder={`e.g. Linen shirt & loafers`}
                  value={p1Label}
                  onChange={(e) => setP1Label(e.target.value)}
                />

                {p1DisplaySrc && (
                  <div className="slot-actions-strip">
                    <button
                      type="button"
                      className="slot-action-btn"
                      onClick={() => p1FileRef.current?.click()}
                      title="Replace photo"
                    >
                      <RefreshCw size={11} />
                      <span>Replace</span>
                    </button>
                    {p1Original && !p1Cutout && (
                      <button
                        type="button"
                        className="slot-action-btn"
                        onClick={() => handleRerunCutout(1)}
                        title="Retry cutout"
                      >
                        <Sparkles size={11} />
                        <span>Cutout</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="slot-action-btn btn-danger"
                      onClick={() => {
                        setP1Original(undefined);
                        setP1Cutout(undefined);
                      }}
                      title="Remove photo"
                    >
                      <Trash2 size={11} />
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Person 2 Slot */}
              <div className="lookbook-slot" style={{ width: '100%', maxWidth: 'none' }}>
                <div className="slot-header">
                  <span className="slot-person-tag">
                    <User size={12} />
                    <span>{person2Name}</span>
                  </span>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {p2DisplaySrc && (
                      <button
                        type="button"
                        className="slot-action-btn"
                        onClick={() =>
                          setPreviewState({
                            personName: person2Name,
                            originalUrl: p2Original,
                            cutoutUrl: p2Cutout,
                            defaultUseCutout: p2UseCutout,
                            label: p2Label,
                          })
                        }
                        title="Zoom / Inspect photo"
                      >
                        <Maximize2 size={11} />
                      </button>
                    )}

                    {p2Cutout && p2Original && (
                      <button
                        type="button"
                        className={`slot-action-btn ${p2UseCutout ? 'active-toggle' : ''}`}
                        onClick={() => setP2UseCutout(!p2UseCutout)}
                        title={p2UseCutout ? 'View Original' : 'View Cutout'}
                      >
                        {p2UseCutout ? <EyeOff size={11} /> : <Eye size={11} />}
                        <span>{p2UseCutout ? 'Original' : 'Cutout'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload or Cutout Stage */}
                {p2Progress !== null ? (
                  <div className="slot-processing-overlay">
                    <Loader2 size={24} className="processing-spinner" />
                    <span className="processing-label">{p2Status}</span>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${Math.round(p2Progress * 100)}%` }} />
                    </div>
                  </div>
                ) : p2DisplaySrc ? (
                  <div
                    className="slot-image-display"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleUploadSlot(2, f);
                    }}
                  >
                    <img
                      src={p2DisplaySrc}
                      alt={p2Label || `${person2Name}'s outfit`}
                      className={`slot-cutout-img ${!p2UseCutout ? 'original-mode' : ''}`}
                    />
                  </div>
                ) : (
                  <div
                    className="slot-empty-dropzone"
                    onClick={() => p2FileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleUploadSlot(2, f);
                    }}
                  >
                    <div className="dropzone-icon">
                      <Upload size={18} />
                    </div>
                    <span className="dropzone-text">Upload {person2Name}&apos;s Photo</span>
                    <span className="dropzone-subtext">Click or drag &bull; Auto-Cutout</span>
                  </div>
                )}

                {p2Error && <span className="form-error-text">{p2Error}</span>}

                <input
                  type="text"
                  className="slot-label-input"
                  placeholder={`e.g. Floral maxi dress`}
                  value={p2Label}
                  onChange={(e) => setP2Label(e.target.value)}
                />

                {p2DisplaySrc && (
                  <div className="slot-actions-strip">
                    <button
                      type="button"
                      className="slot-action-btn"
                      onClick={() => p2FileRef.current?.click()}
                      title="Replace photo"
                    >
                      <RefreshCw size={11} />
                      <span>Replace</span>
                    </button>
                    {p2Original && !p2Cutout && (
                      <button
                        type="button"
                        className="slot-action-btn"
                        onClick={() => handleRerunCutout(2)}
                        title="Retry cutout"
                      >
                        <Sparkles size={11} />
                        <span>Cutout</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="slot-action-btn btn-danger"
                      onClick={() => {
                        setP2Original(undefined);
                        setP2Cutout(undefined);
                      }}
                      title="Remove photo"
                    >
                      <Trash2 size={11} />
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notes / Dress Code */}
            <div className="form-group">
              <label className="form-label" htmlFor="outfit-notes-input">
                Notes &amp; Dress Code
              </label>
              <textarea
                id="outfit-notes-input"
                className="form-input"
                rows={2}
                placeholder="e.g. Smart casual required, no open shoes, bring light cardigan for evening"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Packed in Luggage Checkbox */}
            <label className="packed-toggle-label" style={{ padding: '6px 0' }}>
              <input
                type="checkbox"
                className="packed-checkbox"
                checked={packed}
                onChange={(e) => setPacked(e.target.checked)}
              />
              <span>Mark this look as Packed in Luggage</span>
            </label>

            {/* Modal Actions Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-light)',
              }}
            >
              {initialLook && onDeleteLook ? (
                <button
                  type="button"
                  className="slot-action-btn btn-danger"
                  onClick={() => {
                    onDeleteLook(initialLook.id);
                    onClose();
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete Look</span>
                </button>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="slot-action-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="primary-modal-btn">
                  <Check size={14} />
                  <span>{initialLook ? 'Save Look' : 'Add Look'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Enlarged Photo Preview Modal */}
      {previewState && (
        <ImagePreviewModal
          isOpen={Boolean(previewState)}
          onClose={() => setPreviewState(null)}
          personName={previewState.personName}
          originalUrl={previewState.originalUrl}
          cutoutUrl={previewState.cutoutUrl}
          defaultUseCutout={previewState.defaultUseCutout}
          label={previewState.label}
          outfitTitle={title}
        />
      )}
    </>
  );
};
