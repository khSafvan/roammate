import React, { createContext, useContext, useState, useCallback } from 'react';
import { StopCategory } from '../types/trip';

export type AppView = 'trips_list' | 'trip_detail' | 'trip_settings';
export type AppTab = 'timeline' | 'bookings' | 'expenses' | 'outfits';
export type MobileView = 'timeline' | 'map';

interface UIState {
  currentView: AppView;
  activeTab: AppTab;
  mobileView: MobileView;
  isPlacesToVisitActive: boolean;
  isReadinessOpen: boolean;
  isScratchpadOpen: boolean;
  isAuthOpen: boolean;
  isShareModalOpen: boolean;
  isTripManagerOpen: boolean;
  isAddStopModalOpen: boolean;
  addStopCategory: StopCategory;

  // Actions
  setView: (view: AppView) => void;
  setTab: (tab: AppTab) => void;
  setMobileView: (view: MobileView) => void;
  setPlacesToVisitActive: (active: boolean) => void;
  setReadinessOpen: (open: boolean) => void;
  setScratchpadOpen: (open: boolean) => void;
  setAuthOpen: (open: boolean) => void;
  setShareModalOpen: (open: boolean) => void;
  setTripManagerOpen: (open: boolean) => void;
  openAddStopModal: (category?: StopCategory) => void;
  closeAddStopModal: () => void;
}

const UIContext = createContext<UIState | null>(null);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('trip') || params.get('share') || params.get('view') === 'detail') {
      return 'trip_detail';
    }
    return 'trips_list';
  });

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('tab') as AppTab) || 'timeline';
  });

  const [mobileView, setMobileView] = useState<MobileView>('timeline');
  const [isPlacesToVisitActive, setPlacesToVisitActive] = useState(false);
  const [isReadinessOpen, setReadinessOpen] = useState(false);
  const [isScratchpadOpen, setScratchpadOpen] = useState(false);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [isTripManagerOpen, setTripManagerOpen] = useState(false);
  
  const [isAddStopModalOpen, setIsAddStopModalOpen] = useState(false);
  const [addStopCategory, setAddStopCategory] = useState<StopCategory>('sight');

  const openAddStopModal = useCallback((category: StopCategory = 'sight') => {
    setAddStopCategory(category);
    setIsAddStopModalOpen(true);
  }, []);

  const closeAddStopModal = useCallback(() => {
    setIsAddStopModalOpen(false);
  }, []);

  const value: UIState = {
    currentView,
    activeTab,
    mobileView,
    isPlacesToVisitActive,
    isReadinessOpen,
    isScratchpadOpen,
    isAuthOpen,
    isShareModalOpen,
    isTripManagerOpen,
    isAddStopModalOpen,
    addStopCategory,
    setView: setCurrentView,
    setTab: setActiveTab,
    setMobileView,
    setPlacesToVisitActive,
    setReadinessOpen,
    setScratchpadOpen,
    setAuthOpen,
    setShareModalOpen,
    setTripManagerOpen,
    openAddStopModal,
    closeAddStopModal,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
