import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secure-logger';

interface Account {
  id: number;
  name: string;
  type: string;
  current_balance: number;
  currency: string;
  color?: string;
  icon?: string;
}

interface Transaction {
  id: number;
  account_id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: string;
}

interface Budget {
  id: number;
  category: string;
  monthly_limit: number;
  current_spent: number;
  color?: string;
  alert_threshold: number;
}

export function FinancialHub() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [view, setView] = useState<'overview' | 'cashflow' | 'budgets' | 'trends'>('overview');
  const [loading, setLoading] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsRes, transactionsRes, budgetsRes]: any[] = await Promise.all([
        api.listRecords('accounts', { pageSize: 100 }),
        api.listRecords('transactions', { pageSize: 500, sort: '-date' }),
        api.listRecords('budgets', { pageSize: 100 })
      ]);
      
      setAccounts(accountsRes?.data || []);
      setTransactions(transactionsRes?.data || []);
      setBudgets(budgetsRes?.data || []);
    } catch (err) {
      secureLogger.error('failed to load financial data', err);
      toast.error('failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const netWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.current_balance, 0);
  }, [accounts]);

  const thisMonthTransactions = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return transactions.filter(t => t.date >= monthStart);
  }, [transactions]);

  const monthlyIncome = useMemo(() => {
    return thisMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [thisMonthTransactions]);

  const monthlyExpenses = useMemo(() => {
    return thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [thisMonthTransactions]);

  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    thisMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        spending[t.category] = (spending[t.category] || 0) + Math.abs(t.amount);
      });
    return spending;
  }, [thisMonthTransactions]);

  // sankey data: income -> categories -> expenses
  const sankeyData = useMemo(() => {
    const nodes: string[] = ['income'];
    const links: { source: string; target: string; value: number }[] = [];

    Object.entries(categorySpending).forEach(([category, amount]) => {
      if (!nodes.includes(category)) nodes.push(category);
      links.push({ source: 'income', target: category, value: amount });
    });

    return { nodes, links };
  }, [categorySpending]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse">
        <div className="h-32 bg-white/5 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 lowercase">financial hub</p>
          <h2 className="text-2xl font-bold lowercase">net worth: ${netWorth.toFixed(2)}</h2>
        </div>
        <button
          onClick={() => setShowAddTransaction(true)}
          className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* view selector */}
      <div className="flex gap-2 flex-wrap">
        {['overview', 'cashflow', 'budgets', 'trends'].map(v => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs lowercase',
              view === v ? 'bg-blue-600' : 'bg-white/10'
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {/* overview */}
      {view === 'overview' && (
        <div className="space-y-4">
          {/* accounts */}
          <div className="grid grid-cols-2 gap-3">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className="p-3 rounded-lg bg-white/[0.03]"
                style={{ borderLeft: `3px solid ${acc.color || '#ffffff'}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {acc.icon && <span>{acc.icon}</span>}
                  <span className="text-sm lowercase text-white/70">{acc.name}</span>
                </div>
                <p className="text-xl font-bold">${acc.current_balance.toFixed(2)}</p>
                <p className="text-xs text-white/40 lowercase">{acc.type}</p>
              </div>
            ))}
          </div>

          {/* monthly summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-green-400" />
                <span className="text-xs text-white/40 lowercase">income</span>
              </div>
              <p className="text-xl font-bold text-green-400">${monthlyIncome.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={16} className="text-red-400" />
                <span className="text-xs text-white/40 lowercase">expenses</span>
              </div>
              <p className="text-xl font-bold text-red-400">${monthlyExpenses.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* cashflow sankey */}
      {view === 'cashflow' && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <p className="text-xs text-white/40 lowercase mb-3">cash flow (this month)</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-24 text-xs text-white/60 lowercase">income</div>
              <div className="flex-1 h-8 bg-green-500/20 rounded-lg relative overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-green-500/40"
                  style={{ width: '100%' }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white">
                  ${monthlyIncome.toFixed(0)}
                </span>
              </div>
            </div>
            {Object.entries(categorySpending)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => {
                const percentage = (amount / monthlyIncome) * 100;
                return (
                  <div key={category} className="flex items-center gap-2">
                    <div className="w-24 text-xs text-white/60 lowercase truncate">{category}</div>
                    <div className="flex-1 h-6 bg-white/5 rounded-lg relative overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-blue-500/40"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-white">
                        ${amount.toFixed(0)} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* budgets */}
      {view === 'budgets' && (
        <div className="space-y-3">
          {budgets.map(budget => {
            const percentage = (budget.current_spent / budget.monthly_limit) * 100;
            const status = percentage >= 100 ? 'over' : percentage >= budget.alert_threshold * 100 ? 'warning' : 'good';
            const color = status === 'over' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#22c55e';
            
            return (
              <div key={budget.id} className="p-3 rounded-lg bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm lowercase text-white">{budget.category}</span>
                  <span className="text-xs text-white/40">
                    ${budget.current_spent.toFixed(0)} / ${budget.monthly_limit.toFixed(0)}
                  </span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
                <p className="text-xs text-white/40 mt-1 lowercase">
                  {percentage.toFixed(0)}% used
                  {status === 'over' && ' - over budget!'}
                  {status === 'warning' && ' - approaching limit'}
                </p>
              </div>
            );
          })}
          {budgets.length === 0 && (
            <p className="text-center text-white/30 text-sm lowercase py-8">
              no budgets configured yet
            </p>
          )}
        </div>
      )}

      {/* trends */}
      {view === 'trends' && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <p className="text-xs text-white/40 lowercase mb-3">spending by category</p>
          <div className="space-y-2">
            {Object.entries(categorySpending)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm lowercase text-white/70">{category}</span>
                  <span className="text-sm font-medium">${amount.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* add transaction modal */}
      {showAddTransaction && (
        <AddTransactionModal
          accounts={accounts}
          onClose={() => setShowAddTransaction(false)}
          onSuccess={() => {
            loadData();
            setShowAddTransaction(false);
          }}
        />
      )}
    </div>
  );
}

function AddTransactionModal({ 
  accounts, 
  onClose, 
  onSuccess 
}: { 
  accounts: Account[]; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || 0);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!accountId || !amount || !category) {
      toast.error('account, amount, and category required');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      await api.createRecord('transactions', {
        account_id: accountId,
        amount: type === 'expense' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
        category,
        description,
        date: now.toISOString().split('T')[0],
        timestamp: now.toISOString(),
        type,
        tags: []
      });
      
      toast.success('transaction logged');
      onSuccess();
    } catch (err) {
      secureLogger.error('failed to log transaction', err);
      toast.error('failed to log transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div 
        className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-80"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm lowercase text-white">log transaction</p>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setType('expense')}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm lowercase',
                type === 'expense' ? 'bg-red-600' : 'bg-white/10'
              )}
            >
              expense
            </button>
            <button
              onClick={() => setType('income')}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm lowercase',
                type === 'income' ? 'bg-green-600' : 'bg-white/10'
              )}
            >
              income
            </button>
          </div>

          <select
            value={accountId}
            onChange={e => setAccountId(parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>

          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="amount"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30"
          />

          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="category"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30"
          />

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="description (optional)"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 resize-none"
            rows={2}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white lowercase"
          >
            {loading ? 'logging...' : 'log transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}
