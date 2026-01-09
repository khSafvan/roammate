import React, { useMemo, useState } from 'react';
import {
  DollarSign,
  Plus,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '../types/trip';
import { computeExpenseBreakdownWasm } from '../wasm/engine';

interface ExpenseTrackerProps {
  expenses: Expense[];
  baseCurrency: string;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
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

export const ExpenseTracker = React.memo<ExpenseTrackerProps>(function ExpenseTracker({
  expenses,
  baseCurrency,
  onAddExpense,
  onDeleteExpense,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Drinks');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('Me');
  const [notes, setNotes] = useState('');

  // 1. Dynamic reduction: Calculate category totals via native Rust WebAssembly (with JS fallback)
  const { categoryTotals, totalSpent } = useMemo(() => {
    const res = computeExpenseBreakdownWasm(expenses);
    return {
      categoryTotals: res.categoryTotals as Record<ExpenseCategory, number>,
      totalSpent: res.totalSpent,
    };
  }, [expenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      date,
      category,
      amount: num,
      currency: baseCurrency,
      paidBy: paidBy.trim() || 'Me',
      notes: notes.trim() || undefined,
    };

    onAddExpense(newExpense);
    setIsModalOpen(false);
    setAmount('');
    setNotes('');
  };

  return (
    <div className="expenses-container">
      {/* Header */}
      <div className="section-toolbar">
        <div>
          <h2 className="section-heading">Trip Expense Tracker</h2>
          <p className="section-subheading">
            Category-wise budget breakdown & spending log
          </p>
        </div>

        <button className="primary-action-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Log Expense</span>
        </button>
      </div>

      {/* Summary Card with Category Breakdown Bar */}
      <div className="budget-summary-card">
        <div className="budget-top-row">
          <div>
            <span className="budget-label">Total Trip Spending</span>
            <div className="budget-total-val">
              ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  title={`${cat}: $${val.toFixed(2)} (${pct.toFixed(1)}%)`}
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
                  <span className="legend-val">${val.toFixed(2)}</span>
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
                    <div className="expense-notes">{exp.notes || exp.category}</div>
                    <div className="expense-submeta">
                      <span>{exp.date}</span>
                      <span>•</span>
                      <span>Paid by {exp.paidBy}</span>
                    </div>
                  </div>
                </div>

                <div className="expense-right">
                  <span className="expense-amount">
                    ${Number(exp.amount).toFixed(2)}
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
                  <p className="modal-subtitle">Instant dynamic category aggregation</p>
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
                  <input
                    type="text"
                    placeholder="e.g. Me, Zack, Sarah"
                    className="form-input"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                  />
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
