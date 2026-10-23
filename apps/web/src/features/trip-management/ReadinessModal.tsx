import React, { useState } from 'react';
import {
  Briefcase,
  Check,
  CheckCircle2,
  FileCheck,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { PackingCategory, PackingItem, ReadinessItem } from '../../types/trip';
import { Modal } from '../../components/ui/Modal';
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trip Readiness & Packing"
      subtitle="Roammate travel hub: flight prerequisites and categorized packing lists"
    >
        {/* Tab Switcher */}
        <div className="modal-type-tabs" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={`modal-type-tab ${activeTab === 'readiness' ? 'active' : ''}`}
            onClick={() => setActiveTab('readiness')}
          >
            <FileCheck size={13} style={{ display: 'inline', marginRight: '5px' }} />
            <span>Flight Readiness ({score}%)</span>
          </button>

          <button
            type="button"
            className={`modal-type-tab ${activeTab === 'packing' ? 'active' : ''}`}
            onClick={() => setActiveTab('packing')}
          >
            <Briefcase size={13} style={{ display: 'inline', marginRight: '5px' }} />
            <span>Packing List ({packingList.length > 0 ? `${packingProgress}%` : '0%'})</span>
          </button>
        </div>

        {/* TAB 1: READINESS CHECKLIST */}
         {activeTab === 'readiness' && (
          <div className="flex-col gap-4">
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
            {items.length === 0 ? (
              <div className="not-found-state">
                <span className="not-found-icon">✅</span>
                <span className="not-found-title">No checklist items</span>
                <span className="not-found-hint">Add readiness items to track your trip preparation</span>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* TAB 2: CATEGORIZED PACKING LIST (FEATURE F7) */}
        {activeTab === 'packing' && (
          <div className="flex-col gap-4">
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
              <form onSubmit={handleAddSubmit} className="flex gap-2">
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
                <Input
                  type="text"
                  placeholder="Add item e.g. Passport, Power Bank..."
                  className="form-input"
                  style={{ flex: 1, fontSize: '13px' }}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
                <Button type="submit" className="primary-action-btn" style={{ padding: '6px 12px' }} variant="primary">
                  <Plus size={15} />
                </Button>
              </form>
            )}

            {/* Categories & Items Accordion */}
            <div className="flex-col gap-3" style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
              {PACKING_CATEGORIES.map((cat) => {
                const catItems = packingList.filter((item) => item.category === cat.key);
                const packedCat = catItems.filter((i) => i.packed).length;

                return (
                  <div
                    key={cat.key}
                    className="packing-category-card"
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-card)',
                    }}
                  >
                    {/* Category Header */}
                    <div
                      className="flex justify-between items-center"
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-subtle)',
                        borderBottom: catItems.length > 0 ? '1px solid var(--border-light)' : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                      <span className="text-xs text-secondary font-medium">
                        {packedCat} / {catItems.length}
                      </span>
                    </div>

                    {/* Category Item Rows */}
                    {catItems.length === 0 ? (
                      <div className="text-sm text-tertiary" style={{ padding: '12px 14px', fontStyle: 'italic' }}>
                        No items added yet.
                      </div>
                    ) : (
                      catItems.map((item) => (
                        <div
                          key={item.id}
                          className={`checklist-row ${item.packed ? 'completed' : ''}`}
                          style={{ padding: '8px 14px', borderBottom: '1px solid var(--bg-subtle)' }}
                        >
                          <div
                            className="flex items-center gap-3 flex-1 pointer"
                            onClick={() => onTogglePackingItem && onTogglePackingItem(item.id)}
                          >
                            <div className={`checkbox-box ${item.packed ? 'checked' : ''}`}>
                              {item.packed && <Check size={12} />}
                            </div>
                            <span
                              className={`checkbox-label text-base ${item.packed ? 'text-tertiary' : 'text-primary'}`}
                              style={{ textDecoration: item.packed ? 'line-through' : 'none' }}
                            >
                              {item.name}
                            </span>
                          </div>

                          {onDeletePackingItem && (
                            <button
                              type="button"
                              onClick={() => onDeletePackingItem(item.id)}
                              className="no-bg no-border pointer text-tertiary"
                              style={{ padding: '4px' }}
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
          <Button className="primary-modal-btn" onClick={onClose} variant="primary">
            Done
          </Button>
        </div>
    </Modal>
  );
};
