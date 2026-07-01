import React from 'react';
import { Plus } from 'lucide-react';
import { PlaceSearchResult } from '../PlaceSearchInput';

export interface DiscoveryResultCardProps {
  result: PlaceSearchResult;
  onAdd: (result: PlaceSearchResult) => void;
}

export const DiscoveryResultCard: React.FC<DiscoveryResultCardProps> = ({
  result,
  onAdd,
}) => {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md, 10px)',
        backgroundColor: 'var(--bg-subtle, #f8fafc)',
        border: '1px solid var(--border-light, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {result.title}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {result.subtitle}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAdd(result)}
        style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-pill, 9999px)',
          backgroundColor: 'var(--brand-blue, #2563EB)',
          color: '#ffffff',
          border: 'none',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title="Add to Ideas"
      >
        <Plus size={12} />
        <span>Add</span>
      </button>
    </div>
  );
};
