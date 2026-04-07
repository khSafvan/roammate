import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Plus,
  Receipt,
  Scale,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '../types/trip';
import { computeExpenseBreakdownWasm } from '../wasm/engine';
import {
  computeDebtSettlements,
  computeTravelerBalances,
  createSettlementExpense,
} from '../utils/expenseSettlement';

interface ExpenseTrackerProps {
  expenses: Expense[];
  baseCurrency: string;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  travelers?: string[];
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
  onAddExpense,
  onDeleteExpense,
  travelers = ['Alex Chen', 'Jordan Taylor'],
}) {
  const [activeView, setActiveView] = useState<'breakdown' | 'settlement'>('breakdown');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Drinks');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('Alex Chen');
  const [splitAll, setSplitAll] = useState(true);
  const [selectedSplitWith, setSelectedSplitWith] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // 1. Dynamic category aggregation
  const { categoryTotals, totalSpent } = useMemo(() => {
    const res = computeExpenseBreakdownWasm(expenses);
    return {
      categoryTotals: res.categoryTotals as Record<ExpenseCategory, number>,
      totalSpent: res.totalSpent,
    };
  }, [expenses]);

  // 2. Multi-traveler balance and debt settlement computation
  const { balances, travelers: allTravelers } = useMemo(() => {
    return computeTravelerBalances(expenses, travelers);
  }, [expenses, travelers]);

  const debtSettlements = useMemo(() => {
    return computeDebtSettlements(balances);
  }, [balances]);

  const handleToggleSplitParticipant = (traveler: string) => {
    if (splitAll) {
      // Transition from "All" to custom selection without this traveler
      setSplitAll(false);
      setSelectedSplitWith(allTravelers.filter((t) => t !== traveler));
    } else {
      if (selectedSplitWith.includes(traveler)) {
        const next = selectedSplitWith.filter((t) => t !== traveler);
        setSelectedSplitWith(next);
      } else {
        const next = [...selectedSplitWith, traveler];
        setSelectedSplitWith(next);
        if (next.length === allTravelers.length) {
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
      ? undefined // defaults to all
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
      splitWith: splitList,
      notes: notes.trim() || undefined,
    };

    onAddExpense(newExpense);
    setIsModalOpen(false);
    setAmount('');
    setNotes('');
    setSplitAll(true);
    setSelectedSplitWith([]);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Individual Balances Card Grid */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: 'var(--radius-xl, 16px)',
              border: '1px solid var(--border-light, #e2e8f0)',
              padding: '20px',
              boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Users size={18} className="text-blue" />
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                Traveler Balances Summary
              </h3>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {balances.map((b) => {
                const isOwed = b.net > 0.005;
                const owes = b.net < -0.005;

                return (
                  <div
                    key={b.name}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-lg, 12px)',
                      border: '1px solid var(--border-light, #e2e8f0)',
                      backgroundColor: isOwed
                        ? 'rgba(16, 185, 129, 0.05)'
                        : owes
                        ? 'rgba(239, 68, 68, 0.05)'
                        : 'var(--bg-subtle, #f8fafc)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary, #0f172a)' }}>
                        {b.name}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: isOwed
                            ? 'rgba(16, 185, 129, 0.15)'
                            : owes
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(100, 116, 139, 0.15)',
                          color: isOwed ? '#059669' : owes ? '#DC2626' : '#64748B',
                        }}
                      >
                        {isOwed ? 'Gets back' : owes ? 'Owes' : 'Settled'}
                      </span>
                    </div>

                    <div style={{ fontSize: '20px', fontWeight: 700, color: isOwed ? '#059669' : owes ? '#DC2626' : 'var(--text-secondary, #64748b)' }}>
                      {getCurrencySymbol(baseCurrency)}
                      {Math.abs(b.net).toFixed(2)}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)', display: 'flex', gap: '8px' }}>
                      <span>Paid: {getCurrencySymbol(baseCurrency)}{b.paid.toFixed(2)}</span>
                      <span>•</span>
                      <span>Share: {getCurrencySymbol(baseCurrency)}{b.share.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Who Owes Whom Debt Settlements */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: 'var(--radius-xl, 16px)',
              border: '1px solid var(--border-light, #e2e8f0)',
              padding: '20px',
              boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Scale size={18} className="text-emerald" />
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                Suggested Debt Settlement ("Who Owes Whom")
              </h3>
            </div>

            {debtSettlements.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--text-secondary, #64748b)',
                  borderRadius: '12px',
                  border: '1px dashed var(--border-light, #e2e8f0)',
                }}
              >
                <CheckCircle2 size={32} className="text-emerald" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                  All group balances are settled!
                </p>
                <p style={{ fontSize: '12px', margin: '4px 0 0' }}>
                  No outstanding reimbursements are needed among travelers.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {debtSettlements.map((debt, idx) => (
                  <div
                    key={`${debt.from}-${debt.to}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-light, #e2e8f0)',
                      backgroundColor: 'var(--bg-subtle, #f8fafc)',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                        {debt.from}
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#64748B',
                          fontSize: '12px',
                          backgroundColor: '#e2e8f0',
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        <span>pays</span>
                        <ArrowRight size={12} />
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                        {debt.to}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontSize: '17px',
                          fontWeight: 700,
                          color: 'var(--text-primary, #0f172a)',
                        }}
                      >
                        {getCurrencySymbol(baseCurrency)}
                        {debt.amount.toFixed(2)}
                      </span>

                      <button
                        className="primary-action-btn"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleSettleDebt(debt.from, debt.to, debt.amount)}
                        title="Record a payment transaction to settle this debt"
                      >
                        <CheckCircle2 size={13} />
                        <span>Settle Up</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                    {allTravelers.map((t) => (
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
                      setSelectedSplitWith(allTravelers);
                    }}
                    style={{
                      borderColor: splitAll ? '#10B981' : undefined,
                      backgroundColor: splitAll ? 'rgba(16, 185, 129, 0.15)' : undefined,
                      color: splitAll ? '#059669' : undefined,
                    }}
                  >
                    <span>All Group Members ({allTravelers.length})</span>
                  </button>

                  {allTravelers.map((t) => {
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
    </div>
  );
});
