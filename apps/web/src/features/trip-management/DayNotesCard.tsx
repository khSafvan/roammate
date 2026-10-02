import React, { useState } from 'react';
import { Check, Edit2, FileText, Plus, Trash2, X } from 'lucide-react';
import { MarkdownText } from '../../components/ui/MarkdownText';

export interface DayNotesCardProps {
  dayNumber: number;
  notes?: string;
  onSaveNotes: (notes: string) => void;
}

export const DayNotesCard: React.FC<DayNotesCardProps> = ({
  dayNumber,
  notes = '',
  onSaveNotes,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftNotes, setDraftNotes] = useState(notes);

  const handleStartEdit = () => {
    setDraftNotes(notes);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSaveNotes(draftNotes.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraftNotes(notes);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onSaveNotes('');
    setDraftNotes('');
    setIsEditing(false);
  };

  if (!notes && !isEditing) {
    return (
      <div style={{ marginTop: '2px', marginBottom: '8px' }}>
        <button
          type="button"
          className="day-notes-empty-trigger"
          onClick={handleStartEdit}
          title="Add notes, reminders, or tips for this entire day"
        >
          <Plus size={13} />
          <FileText size={13} />
          <span>Add Day Note</span>
        </button>
      </div>
    );
  }

  return (
    <div className="day-notes-card">
      <div className="day-notes-header">
        <div className="flex items-center gap-1.5" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-amber, #D97706)' }}>
          <FileText size={14} />
          <span>Day {dayNumber} Notes &amp; Tips</span>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="card-more-menu-btn"
              onClick={handleStartEdit}
              title="Edit Day Notes"
              aria-label="Edit Day Notes"
            >
              <Edit2 size={12} />
            </button>
            <button
              type="button"
              className="card-more-menu-btn"
              onClick={handleDelete}
              title="Delete Day Notes"
              aria-label="Delete Day Notes"
            >
              <Trash2 size={12} className="text-rose" />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div style={{ marginTop: '8px' }}>
          <textarea
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            placeholder="Write reminders, local customs, packing tips, or general schedule notes for this day (Markdown supported)..."
            rows={3}
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-medium, #cbd5e1)',
              borderRadius: '8px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />
          <div className="flex items-center justify-end gap-2" style={{ marginTop: '8px' }}>
            <button
              type="button"
              className="timeline-action-pill"
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={handleCancel}
            >
              <X size={12} />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              className="timeline-action-primary"
              style={{ width: 'auto', padding: '5px 14px', fontSize: '12px' }}
              onClick={handleSave}
            >
              <Check size={12} />
              <span>Save Note</span>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <MarkdownText text={notes} />
        </div>
      )}
    </div>
  );
};
