import React, { useState } from 'react';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { AUTH_CONFIG } from '../../config/constants';

interface DeleteAccountDialogProps {
  isProcessing: boolean;
  onCancel: () => void;
  onConfirmDelete: () => void;
}

export const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({
  isProcessing,
  onCancel,
  onConfirmDelete,
}) => {
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  return (
    <div className="delete-account-confirm-box">
      <div className="delete-warning-header">
        <ShieldAlert size={20} className="text-rose" />
        <div>
          <h4 className="delete-warning-title">Permanently Delete Account?</h4>
          <p className="delete-warning-desc">
            This action wipes your public User ID, all saved trip itineraries, flight records, and expenses from both your browser and the Edge database.
          </p>
        </div>
      </div>

      <div className="confirm-type-row">
        <label className="auth-input-label">
          Type <strong>{AUTH_CONFIG.DELETE_CONFIRM_KEYWORD}</strong> to confirm permanent erasure:
        </label>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
          placeholder={AUTH_CONFIG.DELETE_CONFIRM_KEYWORD}
          className="share-link-input text-center font-bold"
          autoFocus
        />
      </div>

      <div className="auth-actions-row mt-3">
        <button
          className="secondary-action-btn flex-1"
          onClick={() => {
            setDeleteConfirmText('');
            onCancel();
          }}
        >
          Cancel
        </button>
        <button
          className="delete-danger-btn flex-1"
          disabled={deleteConfirmText !== AUTH_CONFIG.DELETE_CONFIRM_KEYWORD || isProcessing}
          onClick={onConfirmDelete}
        >
          <Trash2 size={15} />
          <span>{isProcessing ? 'Erasing...' : 'Confirm Permanent Deletion'}</span>
        </button>
      </div>
    </div>
  );
};
