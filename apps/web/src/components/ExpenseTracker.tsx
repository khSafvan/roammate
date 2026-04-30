import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Plus,
  Receipt,
  Scale,
  User,
  UserRoundPen,
  UserPlus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '../types/trip';
import { computeExpenseBreakdown } from '../utils/routeEngine';
import {
  computeDebtSettlements,
  computeTravelerBalances,
  createSettlementExpense,
} from '../utils/expenseSettlement';
import { fetchRate, RateResult } from '../utils/currencyService';

interface ExpenseTrackerProps {
  expenses: Expense[];
  baseCurrency: string;
  homeCurrency?: string;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  travelers: string[];
  onAddTraveler: (name: string) => void;
  onRenameTraveler: (oldName: string, newName: string) => void;
  onRemoveTraveler: (name: string) => void;
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Flights: '#3B82F6',
  Lodging: '#8B5CF6',
  'Food & Drinks': '#F97316',
  Transport: '#10B981',
  Activities: '#EC4899',
  Shopping: '#F59E0B',
  Miscellaneous: '#64748B',
};

const getCurrencySymbol = (currency: string = 'USD') => {
  switch (currency.toUpperCase()) {
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'CAD': return 'CA$';
    case 'AUD': return 'A$';
    case 'CHF': return 'CHF ';
    case 'SGD': return 'S$';
    case 'AED': return 'AED ';
    case 'MYR': return 'RM ';
    case 'THB': return '฿';
    case 'INR': return '₹';
    case 'IDR': return 'Rp ';
    case 'USD':
    default:
      return '$';
  }
};

export const ExpenseTracker = React.memo<ExpenseTrackerProps>(function ExpenseTracker({
  expenses,
  baseCurrency,
  homeCurrency,
  onAddExpense,
  onDeleteExpense,
  travelers,
  onAddTraveler,
  onRenameTraveler,
  onRemoveTraveler,
}) {
  const [activeView, setActiveView] = useState<'breakdown' | 'settlement'>('breakdown');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Drinks');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState(travelers[0] || 'Me');
  const [splitAll, setSplitAll] = useState(true);
  const [selectedSplitWith, setSelectedSplitWith] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [liveRate, setLiveRate] = useState<RateResult | null>(null);
  const [isTravelerModalOpen, setIsTravelerModalOpen] = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<string | null>(null);
  const [travelerNameDraft, setTravelerNameDraft] = useState('');
  const [travelerNameError, setTravelerNameError] = useState('');

  // Live currency rate — fetches from Frankfurter, falls back offline
  useEffect(() => {
    if (!homeCurrency || homeCurrency.toUpperCase() === baseCurrency.toUpperCase()) {
      setLiveRate(null);
      return;
    }
    fetchRate(baseCurrency, homeCurrency).then(setLiveRate);
  }, [baseCurrency, homeCurrency]);

  useEffect(() => {
    if (!travelers.includes(paidBy)) setPaidBy(travelers[0] || 'Me');
    setSelectedSplitWith((current) => current.filter((name) => travelers.includes(name)));
  }, [travelers, paidBy]);

  // 1. Dynamic category aggregation
  const { categoryTotals, totalSpent } = useMemo(() => {
    const res = computeExpenseBreakdown(expenses);
    return {
      categoryTotals: res.categoryTotals as Record<ExpenseCategory, number>,
      totalSpent: res.totalSpent,
    };
  }, [expenses]);

  // 2. Multi-traveler balance and debt settlement computation
  const { balances } = useMemo(() => {
    return computeTravelerBalances(expenses, travelers);
  }, [expenses, travelers]);

  const debtSettlements = useMemo(() => {
    return computeDebtSettlements(balances);
  }, [balances]);

  const handleToggleSplitParticipant = (traveler: string) => {
    if (splitAll) {
      // Transition from "All" to custom selection without this traveler
      setSplitAll(false);
      setSelectedSplitWith(travelers.filter((t) => t !== traveler));
    } else {
      if (selectedSplitWith.includes(traveler)) {
        const next = selectedSplitWith.filter((t) => t !== traveler);
        setSelectedSplitWith(next);
      } else {
        const next = [...selectedSplitWith, traveler];
        setSelectedSplitWith(next);
        if (next.length === travelers.length) {
          setSplitAll(true);
        }
      }
    }
  };

  const handleSettleDebt = (from: string, to: string, debtAmount: number) => {
    const settleExp = createSettlementExpense(from, to, debtAmount, baseCurrency);
    onAddExpense(settleExp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    const splitList = splitAll
      ? travelers
      : selectedSplitWith.length > 0
      ? selectedSplitWith
      : [paidBy];

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      date,
      category,
      amount: num,
      currency: baseCurrency,
      paidBy: paidBy.trim() || 'Me',
      splitWith: splitList.length > 0 ? splitList : [paidBy],
      notes: notes.trim() || undefined,
    };

    onAddExpense(newExpense);
    setIsModalOpen(false);
    setAmount('');
    setNotes('');
    setSplitAll(true);
    setSelectedSplitWith([]);
  };

  const openTravelerModal = (traveler?: string) => {
    setEditingTraveler(traveler || null);
    setTravelerNameDraft(traveler || '');
    setTravelerNameError('');
    setIsTravelerModalOpen(true);
  };

  const handleTravelerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = travelerNameDraft.trim();
    if (!name) {
      setTravelerNameError('Enter a traveler name.');
      return;
    }
    if (travelers.some((traveler) => traveler !== editingTraveler && traveler.toLowerCase() === name.toLowerCase())) {
      setTravelerNameError('That traveler is already in this trip.');
      return;
    }

    if (editingTraveler) {
      onRenameTraveler(editingTraveler, name);
      if (paidBy === editingTraveler) setPaidBy(name);
      setSelectedSplitWith((current) => current.map((traveler) => traveler === editingTraveler ? name : traveler));
    } else {
      onAddTraveler(name);
    }
    setIsTravelerModalOpen(false);
  };

  return (
    <div className="expenses-container">
      {/* Header */}
      <div className="section-toolbar">
        <div>
          <h2 className="section-heading">Trip Expense Tracker</h2>
          <p className="section-subheading">
            Category budget analytics, multi-traveler splitting & debt settlement
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="primary-action-btn" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Sub-view Navigation Switcher */}
      <div className="category-filter-strip">
        <button
          type="button"
          className={`category-filter-btn ${activeView === 'breakdown' ? 'active' : ''}`}
          onClick={() => setActiveView('breakdown')}
        >
          <Receipt size={14} />
          <span>Category Breakdown</span>
        </button>

        <button
          type="button"
          className={`category-filter-btn ${activeView === 'settlement' ? 'active' : ''}`}
          onClick={() => setActiveView('settlement')}
        >
          <Scale size={14} />
          <span>Who Owes Whom ({debtSettlements.length})</span>
        </button>
      </div>

      {/* VIEW 1: CATEGORY BREAKDOWN */}
      {activeView === 'breakdown' && (
        <>
          {/* Live currency conversion banner */}
          {liveRate && (
            <div className="currency-rate-banner">
              <DollarSign size={14} />
              <span>
                1&nbsp;{baseCurrency}&nbsp;=&nbsp;
                <strong>{liveRate.rate.toFixed(4)}</strong>&nbsp;{homeCurrency}
                {liveRate.isOffline && <span className="rate-offline-tag">&nbsp;· offline rates</span>}
                {!liveRate.isOffline && <span className="rate-date-tag">&nbsp;· {liveRate.date}</span>}
              </span>
              <span className="rate-total-home">
                ≈&nbsp;{getCurrencySymbol(homeCurrency!)}{(totalSpent * liveRate.rate).toLocaleString('en-US', { maximumFractionDigits: 2 })}&nbsp;{homeCurrency}
              </span>
            </div>
          )}

          {/* Summary Card with Category Breakdown Bar */}
          <div className="budget-summary-card">
            <div className="budget-top-row">
              <div>
                <span className="budget-label">Total Trip Spending</span>
                <div className="budget-total-val">
                  {getCurrencySymbol(baseCurrency)}
                  {totalSpent.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span className="budget-currency">{baseCurrency}</span>
                </div>
              </div>

              <div className="budget-expense-count">
                <Receipt size={16} className="text-slate" />
                <span>{expenses.length} logged expenses</span>
              </div>
            </div>

            {/* Multi-color Category Distribution Bar */}
            {totalSpent > 0 && (
              <div className="category-progress-bar">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const val = categoryTotals[cat] || 0;
                  if (val === 0) return null;
                  const pct = (val / totalSpent) * 100;
                  return (
                    <div
                      key={cat}
                      className="bar-segment"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CATEGORY_COLORS[cat],
                      }}
                      title={`${cat}: ${getCurrencySymbol(baseCurrency)}${val.toFixed(2)} (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
            )}

            {/* Category Legend Chips */}
            <div className="category-legend-grid">
              {EXPENSE_CATEGORIES.map((cat) => {
                const val = categoryTotals[cat] || 0;
                const pct = totalSpent > 0 ? (val / totalSpent) * 100 : 0;
                return (
                  <div key={cat} className="legend-cell">
                    <div className="legend-cell-header">
                      <span
                        className="legend-color-dot"
                        style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                      />
                      <span className="legend-name">{cat}</span>
                    </div>
                    <div className="legend-amounts">
                      <span className="legend-val">
                        {getCurrencySymbol(baseCurrency)}
                        {val.toFixed(2)}
                      </span>
                      <span className="legend-pct">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expense Entries Table / List */}
          <div className="expense-list-card">
            <h3 className="card-inner-heading">Recent Transactions</h3>
            {expenses.length === 0 ? (
              <p className="empty-hint">No expenses logged yet.</p>
            ) : (
              <div className="expense-items-table">
                {expenses.map((exp) => (
                  <div key={exp.id} className="expense-row">
                    <div className="expense-left">
                      <div
                        className="expense-cat-badge"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[exp.category]}15`,
                          color: CATEGORY_COLORS[exp.category],
                        }}
                      >
                        {exp.category}
                      </div>
                      <div>
                        <div className="expense-notes">
                          {exp.isSettlement && '🤝 '}
                          {exp.notes || exp.category}
                        </div>
                        <div className="expense-submeta">
                          <span>{exp.date}</span>
                          <span>•</span>
                          <span>Paid by {exp.paidBy}</span>
                          {exp.splitWith && exp.splitWith.length > 0 && (
                            <>
                              <span>•</span>
                              <span>Split with {exp.splitWith.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="expense-right">
                      <span className="expense-amount">
                        {getCurrencySymbol(baseCurrency)}
                        {Number(exp.amount).toFixed(2)}
                      </span>
                      <button
                        className="expense-del-btn"
                        onClick={() => onDeleteExpense(exp.id)}
                        title="Delete entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW 2: SPLIT & DEBT SETTLEMENT ("WHO OWES WHOM") */}
      {activeView === 'settlement' && (
        <div className="settlement-view">
          <section className="traveler-management-section">
            <div className="traveler-management-header">
              <div className="traveler-management-title">
                <Users size={18} />
                <h3>Trip Travelers</h3>
              </div>
              <button className="primary-action-btn" onClick={() => openTravelerModal()}>
                <UserPlus size={15} />
                <span>Add Traveler</span>
              </button>
            </div>
            <div className="traveler-roster-grid">
              {travelers.map((traveler, index) => (
                <article key={traveler} className="booking-voucher-card traveler-voucher-card">
                  <div className="traveler-card-head">
                    <div className="traveler-identity">
                      <span className="traveler-avatar" aria-hidden="true">
                        {traveler.trim().charAt(0).toUpperCase() || <User size={16} />}
                      </span>
                      <div className="traveler-name-stack">
                        <span className="traveler-index">TRAVELER {String(index + 1).padStart(2, '0')}</span>
                        <h3 className="traveler-name" title={traveler}>{traveler}</h3>
                      </div>
                    </div>
                    <div className="traveler-card-actions">
                      <button className="traveler-icon-btn" onClick={() => openTravelerModal(traveler)} title={`Edit ${traveler}`} aria-label={`Edit ${traveler}`}>
                        <UserRoundPen size={15} />
                      </button>
                      <button
                        className="traveler-icon-btn danger"
                        onClick={() => onRemoveTraveler(traveler)}
                        title={travelers.length === 1 ? 'A trip needs at least one active traveler' : `Remove ${traveler}; preserve their records`}
                        aria-label={`Remove ${traveler}`}
                        disabled={travelers.length === 1}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Individual Balances Card Grid */}
          <section className="traveler-balances-section">
            <div className="traveler-section-heading">
              <Users size={18} className="text-blue" />
              <h3>Traveler Balances Summary</h3>
            </div>

            <div className="traveler-balance-grid">
              {balances.map((b) => {
                const isOwed = b.net > 0.005;
                const owes = b.net < -0.005;

                return (
                  <article key={b.name} className={`booking-voucher-card traveler-balance-card ${isOwed ? 'is-owed' : owes ? 'owes' : 'is-settled'}`}>
                    <div className="traveler-balance-head">
                      <h4 className="traveler-balance-name" title={b.name}>{b.name}</h4>
                      <span className="traveler-balance-status">{isOwed ? 'Gets back' : owes ? 'Owes' : 'Settled'}</span>
                    </div>
                    <div className="traveler-balance-main">
                      <span className="traveler-balance-label">Net balance</span>
                      <strong className="traveler-balance-amount">
                        {getCurrencySymbol(baseCurrency)}{Math.abs(b.net).toFixed(2)}
                      </strong>
                    </div>
                    <div className="traveler-balance-footer">
                      <div><span>Paid</span><strong>{getCurrencySymbol(baseCurrency)}{b.paid.toFixed(2)}</strong></div>
                      <div><span>Share</span><strong>{getCurrencySymbol(baseCurrency)}{b.share.toFixed(2)}</strong></div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Who Owes Whom Debt Settlements */}
          <section className="debt-settlement-section">
            <div className="traveler-section-heading">
              <Scale size={18} className="text-emerald" />
              <h3>
                Suggested Debt Settlement ("Who Owes Whom")
              </h3>
            </div>

            {debtSettlements.length === 0 ? (
              <div className="debt-empty-state">
                <CheckCircle2 size={30} className="text-emerald" />
                <p>
                  All group balances are settled!
                </p>
                <p className="debt-empty-detail">
                  No outstanding reimbursements are needed among travelers.
                </p>
              </div>
            ) : (
              <div className="debt-settlement-list">
                {debtSettlements.map((debt, idx) => (
                  <article key={`${debt.from}-${debt.to}-${idx}`} className="debt-settlement-row">
                    <div className="debt-parties">
                      <strong title={debt.from}>{debt.from}</strong>
                      <span className="debt-transfer-label">pays <ArrowRight size={13} /></span>
                      <strong title={debt.to}>{debt.to}</strong>
                    </div>

                    <div className="debt-settlement-action">
                      <strong className="debt-amount">
                        {getCurrencySymbol(baseCurrency)}
                        {debt.amount.toFixed(2)}
                      </strong>

                      <button
                        className="primary-action-btn"
                        onClick={() => handleSettleDebt(debt.from, debt.to, debt.amount)}
                        title="Record a payment transaction to settle this debt"
                      >
                        <CheckCircle2 size={13} />
                        <span>Settle Up</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="auth-header-icon">
                  <DollarSign size={18} className="text-emerald" />
                </div>
                <div>
                  <h3 className="modal-title">Log Expense</h3>
                  <p className="modal-subtitle">Instant dynamic category aggregation & split</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-content-col">
              <div>
                <label className="form-label">Amount ({baseCurrency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  className="form-input text-lg font-bold"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Category *</label>
                <div className="category-chips-select">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`cat-chip-btn ${category === cat ? 'selected' : ''}`}
                      style={{
                        borderColor: category === cat ? CATEGORY_COLORS[cat] : undefined,
                        backgroundColor: category === cat ? `${CATEGORY_COLORS[cat]}15` : undefined,
                        color: category === cat ? CATEGORY_COLORS[cat] : undefined,
                      }}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Paid By</label>
                  <select
                    className="form-input"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                  >
                    {travelers.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Split With Multi-Select */}
              <div>
                <label className="form-label">Split Expense With</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`cat-chip-btn ${splitAll ? 'selected' : ''}`}
                    onClick={() => {
                      setSplitAll(true);
                      setSelectedSplitWith(travelers);
                    }}
                    style={{
                      borderColor: splitAll ? '#10B981' : undefined,
                      backgroundColor: splitAll ? 'rgba(16, 185, 129, 0.15)' : undefined,
                      color: splitAll ? '#059669' : undefined,
                    }}
                  >
                    <span>All Group Members ({travelers.length})</span>
                  </button>

                  {travelers.map((t) => {
                    const isSelected = splitAll || selectedSplitWith.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`cat-chip-btn ${isSelected && !splitAll ? 'selected' : ''}`}
                        onClick={() => handleToggleSplitParticipant(t)}
                        style={{
                          borderColor: isSelected && !splitAll ? '#3B82F6' : undefined,
                          backgroundColor: isSelected && !splitAll ? 'rgba(59, 130, 246, 0.15)' : undefined,
                          color: isSelected && !splitAll ? '#2563EB' : undefined,
                        }}
                      >
                        <span>{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="form-label">Description / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Ramen dinner, museum tickets"
                  className="form-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="primary-modal-btn">
                Add Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {isTravelerModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsTravelerModalOpen(false)}>
          <div className="modal-card traveler-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="auth-header-icon"><User size={18} className="text-blue" /></div>
                <div>
                  <h3 className="modal-title">{editingTraveler ? 'Edit Traveler' : 'Add Traveler'}</h3>
                  <p className="modal-subtitle">{editingTraveler ? 'Update this traveler across the trip.' : 'Add someone to this trip.'}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsTravelerModalOpen(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <form className="auth-content-col" onSubmit={handleTravelerSubmit}>
              <div>
                <label className="form-label" htmlFor="traveler-name">Name</label>
                <input
                  id="traveler-name"
                  autoFocus
                  className="form-input"
                  value={travelerNameDraft}
                  onChange={(e) => {
                    setTravelerNameDraft(e.target.value);
                    setTravelerNameError('');
                  }}
                  maxLength={80}
                  required
                />
                {travelerNameError && <p className="form-error-text">{travelerNameError}</p>}
              </div>
              <button className="primary-modal-btn" type="submit">
                {editingTraveler ? 'Save Changes' : 'Add Traveler'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
