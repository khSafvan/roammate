import { describe, expect, it } from 'vitest';
import { Expense } from '../src/types/trip';
import {
  computeDebtSettlements,
  computeTravelerBalances,
  createSettlementExpense,
} from '../src/utils/expenseSettlement';

describe('Group Expense Splitting & Debt Settlement ("Who Owes Whom")', () => {
  it('computes balanced 50/50 split between two travelers', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        date: '2027-01-08',
        category: 'Activities',
        amount: 100,
        currency: 'USD',
        paidBy: 'Alex',
        splitWith: ['Alex', 'Taylor'],
      },
    ];

    const { balances, totalPool } = computeTravelerBalances(expenses, ['Alex', 'Taylor']);
    expect(totalPool).toBe(100);

    const alex = balances.find((b) => b.name === 'Alex');
    const taylor = balances.find((b) => b.name === 'Taylor');

    expect(alex?.paid).toBe(100);
    expect(alex?.share).toBe(50);
    expect(alex?.net).toBe(50); // Alex is owed 50

    expect(taylor?.paid).toBe(0);
    expect(taylor?.share).toBe(50);
    expect(taylor?.net).toBe(-50); // Taylor owes 50
  });

  it('handles multi-traveler expenses with custom subsets', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        date: '2027-01-08',
        category: 'Food & Drinks',
        amount: 90,
        currency: 'USD',
        paidBy: 'Alex',
        splitWith: ['Alex', 'Taylor', 'Sam'], // 30 each
      },
      {
        id: 'e2',
        date: '2027-01-09',
        category: 'Transport',
        amount: 40,
        currency: 'USD',
        paidBy: 'Taylor',
        splitWith: ['Alex', 'Taylor'], // 20 each, Sam not included
      },
    ];

    const { balances } = computeTravelerBalances(expenses);
    const alex = balances.find((b) => b.name === 'Alex');
    const taylor = balances.find((b) => b.name === 'Taylor');
    const sam = balances.find((b) => b.name === 'Sam');

    // Alex: paid 90, share 30 + 20 = 50 -> net = +40
    expect(alex?.paid).toBe(90);
    expect(alex?.share).toBe(50);
    expect(alex?.net).toBe(40);

    // Taylor: paid 40, share 30 + 20 = 50 -> net = -10
    expect(taylor?.paid).toBe(40);
    expect(taylor?.share).toBe(50);
    expect(taylor?.net).toBe(-10);

    // Sam: paid 0, share 30 -> net = -30
    expect(sam?.paid).toBe(0);
    expect(sam?.share).toBe(30);
    expect(sam?.net).toBe(-30);

    // Sum of net balances must always equal zero
    const netSum = balances.reduce((sum, b) => sum + b.net, 0);
    expect(Math.abs(netSum)).toBeLessThan(0.01);
  });

  it('computes minimal debt settlement transfers ("Who Owes Whom")', () => {
    const balances = [
      { name: 'Alex', paid: 100, share: 40, net: 60 },
      { name: 'Taylor', paid: 20, share: 40, net: -20 },
      { name: 'Sam', paid: 0, share: 40, net: -40 },
    ];

    const settlements = computeDebtSettlements(balances);

    // Sam owes 40 -> pays Alex 40
    // Taylor owes 20 -> pays Alex 20
    expect(settlements.length).toBe(2);

    const samToAlex = settlements.find((s) => s.from === 'Sam' && s.to === 'Alex');
    expect(samToAlex?.amount).toBe(40);

    const taylorToAlex = settlements.find((s) => s.from === 'Taylor' && s.to === 'Alex');
    expect(taylorToAlex?.amount).toBe(20);
  });

  it('creates settlement expense that zeroes out debt when applied', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        date: '2027-01-08',
        category: 'Lodging',
        amount: 200,
        currency: 'AED',
        paidBy: 'Alex Chen',
        splitWith: ['Alex Chen', 'Jordan Taylor'],
      },
    ];

    // Initial balances
    const initial = computeTravelerBalances(expenses);
    const settlements = computeDebtSettlements(initial.balances);
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({
      from: 'Jordan Taylor',
      to: 'Alex Chen',
      amount: 100,
    });

    // Record debt settlement
    const settleExp = createSettlementExpense(
      settlements[0].from,
      settlements[0].to,
      settlements[0].amount,
      'AED'
    );
    expect(settleExp.isSettlement).toBe(true);
    expect(settleExp.paidBy).toBe('Jordan Taylor');
    expect(settleExp.splitWith).toEqual(['Alex Chen']);

    // Recompute with settlement expense logged
    const finalBalances = computeTravelerBalances([...expenses, settleExp]);
    const remainingDebts = computeDebtSettlements(finalBalances.balances);

    expect(remainingDebts).toHaveLength(0);
    const alexFinal = finalBalances.balances.find((b) => b.name === 'Alex Chen');
    const jordanFinal = finalBalances.balances.find((b) => b.name === 'Jordan Taylor');
    expect(alexFinal?.net).toBe(0);
    expect(jordanFinal?.net).toBe(0);
  });
});
