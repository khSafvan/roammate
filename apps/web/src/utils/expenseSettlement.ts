import { DebtSettlement, Expense, TravelerBalance } from '../types/trip';

/**
 * Calculates net spending and balance for each traveler across all logged expenses.
 */
export function computeTravelerBalances(
  expenses: Expense[],
  fallbackTravelers: string[] = []
): {
  balances: TravelerBalance[];
  travelers: string[];
  totalPool: number;
} {
  // Collect all unique travelers
  const travelerSet = new Set<string>();
  fallbackTravelers.forEach((t) => {
    if (t.trim()) travelerSet.add(t.trim());
  });

  expenses.forEach((exp) => {
    if (exp.paidBy?.trim()) travelerSet.add(exp.paidBy.trim());
    if (exp.splitWith && Array.isArray(exp.splitWith)) {
      exp.splitWith.forEach((p) => {
        if (p?.trim()) travelerSet.add(p.trim());
      });
    }
  });

  if (travelerSet.size === 0) {
    travelerSet.add('Me');
  }

  const travelers = Array.from(travelerSet);

  const tracker: Record<string, { paid: number; share: number }> = {};
  travelers.forEach((t) => {
    tracker[t] = { paid: 0, share: 0 };
  });

  let totalPool = 0;

  expenses.forEach((exp) => {
    const amount = Number(exp.amount) || 0;
    if (amount <= 0) return;

    totalPool += amount;
    const payer = exp.paidBy?.trim() || 'Me';
    if (!tracker[payer]) {
      tracker[payer] = { paid: 0, share: 0 };
      travelers.push(payer);
    }
    tracker[payer].paid += amount;

    // Determine participants splitting this expense
    let participants =
      exp.splitWith && exp.splitWith.length > 0
        ? exp.splitWith.map((p) => p.trim()).filter(Boolean)
        : travelers;

    if (participants.length === 0) {
      participants = [payer];
    }

    const sharePerPerson = amount / participants.length;
    participants.forEach((p) => {
      if (!tracker[p]) {
        tracker[p] = { paid: 0, share: 0 };
        travelers.push(p);
      }
      tracker[p].share += sharePerPerson;
    });
  });

  const balances: TravelerBalance[] = travelers.map((name) => {
    const paid = Number(tracker[name].paid.toFixed(2));
    const share = Number(tracker[name].share.toFixed(2));
    const net = Number((paid - share).toFixed(2));
    return { name, paid, share, net };
  });

  return { balances, travelers, totalPool };
}

/**
 * Greedy debt simplification algorithm: matches largest debtors with largest creditors
 * to minimize the total number of reimbursement transactions required ("Who Owes Whom").
 */
export function computeDebtSettlements(balances: TravelerBalance[]): DebtSettlement[] {
  // Separate into creditors (net > 0) and debtors (net < 0)
  interface Party {
    name: string;
    amount: number;
  }

  const creditors: Party[] = [];
  const debtors: Party[] = [];

  balances.forEach((b) => {
    if (b.net > 0.005) {
      creditors.push({ name: b.name, amount: b.net });
    } else if (b.net < -0.005) {
      debtors.push({ name: b.name, amount: -b.net });
    }
  });

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: DebtSettlement[] = [];

  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settleAmount = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Number(settleAmount.toFixed(2));

    if (roundedAmount > 0) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: roundedAmount,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.005) i++;
    if (creditor.amount < 0.005) j++;
  }

  return settlements;
}

/**
 * Generates an Expense object for recording a debt settlement reimbursement
 */
export function createSettlementExpense(
  from: string,
  to: string,
  amount: number,
  currency: string
): Expense {
  return {
    id: `exp_settle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    date: new Date().toISOString().split('T')[0],
    category: 'Miscellaneous',
    amount: Number(amount.toFixed(2)),
    currency,
    paidBy: from,
    splitWith: [to],
    notes: `Debt Settlement: ${from} paid ${to}`,
    isSettlement: true,
  };
}
