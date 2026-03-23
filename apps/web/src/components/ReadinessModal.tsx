import React, { useState } from 'react';
import {
  Briefcase,
  Check,
  CheckCircle2,
  FileCheck,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { PackingCategory, PackingItem, ReadinessItem } from '../types/trip';

interface ReadinessModalProps {
  isOpen: boolean;
  score: number;
  items: ReadinessItem[];
  packingList?: PackingItem[];
  onToggleItem: (id: string) => void;
  onTogglePackingItem?: (id: string) => void;
  onAddPackingItem?: (category: PackingCategory, name: string) => void;
  onDeletePackingItem?: (id: string) => void;
  onClose: () => void;
}

const PACKING_CATEGORIES: { key: PackingCategory; label: string; icon: string }[] = [
  { key: 'Clothes', label: 'Clothes & Footwear', icon: '👕' },
  { key: 'Toiletries', label: 'Toiletries & Grooming', icon: '🧴' },
  { key: 'Electronics', label: 'Electronics & Cables', icon: '🔌' },
  { key: 'Documents', label: 'Passports & Documents', icon: '📄' },
  { key: 'Essentials', label: 'Essentials & Valuables', icon: '🎒' },
];

export const ReadinessModal: React.FC<ReadinessModalProps> = ({
  isOpen,
  score,
  items,
  packingList = [],
  onToggleItem,
  onTogglePackingItem,
  onAddPackingItem,
  onDeletePackingItem,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'readiness' | 'packing'>('readiness');
  const [newItemName, setNewItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PackingCategory>('Clothes');

  if (!isOpen) return null;

  const totalPacked = packingList.filter((item) => item.packed).length;
  const packingProgress =
    packingList.length > 0 ? Math.round((totalPacked / packingList.length) * 100) : 0;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !onAddPackingItem) return;
    onAddPackingItem(selectedCategory, newItemName.trim());
    setNewItemName('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Trip Readiness &amp; Packing</h2>
            <p className="modal-subtitle">
              roammate travel hub: flight prerequisites and categorized packing lists
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light, #e2e8f0)', paddingBottom: '10px' }}>
          <button
            className={`nav-tab-btn ${activeTab === 'readiness' ? 'active' : ''}`}
            onClick={() => setActiveTab('readiness')}
            style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px' }}
          >
            <FileCheck size={14} />
            <span>Flight Readiness ({score}%)</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'packing' ? 'active' : ''}`}
            onClick={() => setActiveTab('packing')}
            style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px' }}
          >
            <Briefcase size={14} />
            <span>Packing List ({packingList.length > 0 ? `${packingProgress}%` : '0%'})</span>
          </button>
        </div>

        {/* TAB 1: READINESS CHECKLIST */}
        {activeTab === 'readiness' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Score Progress */}
            <div className="readiness-summary-card">
              <div className="summary-score-row">
                <CheckCircle2 size={24} className="text-emerald" />
                <span className="summary-score-text">{score}% Prepared</span>
              </div>
              <div className="progress-track">
                <div className="progress-bar-fill" style={{ width: `${score}%` }} />
              </div>
            </div>

            {/* Checklist */}
            <div className="checklist-items" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`checklist-row ${item.completed ? 'completed' : ''}`}
                  onClick={() => onToggleItem(item.id)}
                >
                  <div className={`checkbox-box ${item.completed ? 'checked' : ''}`}>
                    {item.completed && <Check size={13} />}
                  </div>
                  <span className="checkbox-label">{item.label}</span>
                  {item.critical && !item.completed && (
                    <span className="critical-pill">
                      <ShieldAlert size={12} />
                      <span>Required</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CATEGORIZED PACKING LIST (FEATURE F7) */}
        {activeTab === 'packing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Overall Packing Progress */}
            <div className="readiness-summary-card">
              <div className="summary-score-row">
                <Briefcase size={22} className="text-blue" />
                <span className="summary-score-text">
                  {totalPacked} of {packingList.length} Items Packed ({packingProgress}%)
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${packingProgress}%`, backgroundColor: '#3B82F6' }}
                />
              </div>
            </div>

            {/* Add Item Row */}
            {onAddPackingItem && (
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-input"
                  style={{ width: '140px', fontSize: '12px', padding: '6px 8px' }}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as PackingCategory)}
                >
                  {PACKING_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.icon} {c.key}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Add item e.g. Passport, Power Bank..."
                  className="form-input"
                  style={{ flex: 1, fontSize: '13px' }}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
                <button type="submit" className="primary-action-btn" style={{ padding: '6px 12px' }}>
                  <Plus size={15} />
                </button>
              </form>
            )}

            {/* Categories & Items Accordion */}
            <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
              {PACKING_CATEGORIES.map((cat) => {
                const catItems = packingList.filter((item) => item.category === cat.key);
                const packedCat = catItems.filter((i) => i.packed).length;

                return (
                  <div
                    key={cat.key}
                    style={{
                      border: '1px solid var(--border-light, #e2e8f0)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-card, #ffffff)',
                    }}
                  >
                    {/* Category Header */}
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-subtle, #f8fafc)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: catItems.length > 0 ? '1px solid var(--border-light, #f1f5f9)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>
                        {packedCat} / {catItems.length}
                      </span>
                    </div>

                    {/* Category Item Rows */}
                    {catItems.length === 0 ? (
                      <div style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-tertiary, #94a3b8)', fontStyle: 'italic' }}>
                        No items added yet.
                      </div>
                    ) : (
                      catItems.map((item) => (
                        <div
                          key={item.id}
                          className={`checklist-row ${item.packed ? 'completed' : ''}`}
                          style={{ padding: '8px 14px', borderBottom: '1px solid #f8fafc' }}
                        >
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}
                            onClick={() => onTogglePackingItem && onTogglePackingItem(item.id)}
                          >
                            <div className={`checkbox-box ${item.packed ? 'checked' : ''}`}>
                              {item.packed && <Check size={12} />}
                            </div>
                            <span
                              className="checkbox-label"
                              style={{
                                fontSize: '13px',
                                textDecoration: item.packed ? 'line-through' : 'none',
                                color: item.packed ? 'var(--text-tertiary, #94a3b8)' : 'var(--text-primary, #0f172a)',
                              }}
                            >
                              {item.name}
                            </span>
                          </div>

                          {onDeletePackingItem && (
                            <button
                              type="button"
                              onClick={() => onDeletePackingItem(item.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: 'var(--text-tertiary, #94a3b8)',
                              }}
                              title="Delete Item"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <button className="primary-modal-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
