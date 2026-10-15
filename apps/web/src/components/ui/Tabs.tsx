import React from 'react';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeId, onChange, className = '' }) => {
  return (
    <nav className={`tabs-container ${className}`} style={{ overflowX: 'auto', scrollbarWidth: 'none', whiteSpace: 'nowrap' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeId === tab.id ? 'tab-active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-selected={activeId === tab.id}
          role="tab"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};
