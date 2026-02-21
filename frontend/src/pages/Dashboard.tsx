import { useState, useMemo, useEffect } from 'react';
import { useTransactions, useSummary, useCategorizeTransactions, useGenerateInsights } from '@/hooks/useApi';
import { formatCurrency, formatRelativeDate, getDateRangeForFilter } from '@/utils/format';
import { ArrowUpRight, ArrowDownRight, Sparkles, Wallet, TrendingUp, TrendingDown, DollarSign, MessageSquare } from 'lucide-react';
import AIInsightRenderer from '@/components/AIInsightRenderer';

type TimeFilter = 'all-time' | 'last-year' | 'year-to-date';

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all-time');

  useEffect(() => {
    const saved = localStorage.getItem('dashboard-time-filter');
    if (saved && ['all-time', 'last-year', 'year-to-date'].includes(saved)) {
      setTimeFilter(saved as TimeFilter);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard-time-filter', timeFilter);
  }, [timeFilter]);

  const dateRange = useMemo(() => getDateRangeForFilter(timeFilter), [timeFilter]);
  const { data: summary } = useSummary(dateRange);
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({ limit: 10 });
  const categorizeMutation = useCategorizeTransactions();
  const generateInsightsMutation = useGenerateInsights();

  const [insightQuery, setInsightQuery] = useState('');
  const [showInsight, setShowInsight] = useState(false);
  const [currentInsight, setCurrentInsight] = useState('');

  const uncategorizedTransactions = useMemo(() => {
    return transactions?.filter(t => !t.is_categorized) || [];
  }, [transactions]);

  const handleGenerateInsight = () => {
    if (!insightQuery.trim()) return;
    
    generateInsightsMutation.mutate({
      query: insightQuery,
      start_date: undefined,
      end_date: undefined
    }, {
      onSuccess: (data) => {
        setCurrentInsight(data.insight || '');
        setShowInsight(true);
      }
    });
  };

  const handleCategorizeAll = () => {
    if (uncategorizedTransactions.length > 0) {
      categorizeMutation.mutate(uncategorizedTransactions.map(t => t.id));
    }
  };

  const stats = [
    {
      title: 'Total Income',
      value: summary?.total_income || 0,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Total Expenses',
      value: summary?.total_expenses || 0,
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Net Balance',
      value: summary?.net || 0,
      icon: Wallet,
      color: summary && summary.net >= 0 ? 'text-emerald-400' : 'text-red-400',
      bgColor: summary && summary.net >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Transactions',
      value: summary?.transaction_count || 0,
      icon: DollarSign,
      color: 'text-warm-400',
      bgColor: 'bg-warm-500/10',
      isCount: true,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Dashboard</h1>
          <p className="text-stone-400 mt-1">Overview of your finances</p>
        </div>
        
        {uncategorizedTransactions.length > 0 && (
          <button
            onClick={handleCategorizeAll}
            disabled={categorizeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-warm-500 hover:bg-warm-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {categorizeMutation.isPending ? 'Categorizing...' : `Categorize ${uncategorizedTransactions.length}`}
          </button>
        )}
      </div>

      <div className="card">
        <div className="p-6 border-b border-dark-500">
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-warm-400" />
            AI Insights
          </h2>
          <p className="text-stone-400 text-sm mt-1">Ask questions about your spending patterns</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={insightQuery}
              onChange={(e) => setInsightQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateInsight()}
              placeholder="Ask AI about your finances (e.g., 'What's my top spending category?')"
              className="flex-1 px-4 py-2 bg-dark-700 border border-dark-500 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-warm-500 focus:border-transparent"
            />
            <button
              onClick={handleGenerateInsight}
              disabled={generateInsightsMutation.isPending || !insightQuery.trim()}
              className="px-6 py-2 bg-warm-500 hover:bg-warm-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
          </div>

          {generateInsightsMutation.isPending && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-warm-500"></div>
            </div>
          )}

          {showInsight && currentInsight && (
            <div className="mt-4 pt-4 border-t border-dark-700">
              <AIInsightRenderer insight={currentInsight} />
            </div>
          )}
          
          {generateInsightsMutation.error && (
            <p className="text-red-400 text-sm">{(generateInsightsMutation.error as Error).message}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex gap-2">
          {(['all-time', 'last-year', 'year-to-date'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                timeFilter === filter
                  ? 'bg-warm-500 text-white'
                  : 'bg-dark-700 text-stone-300 hover:bg-dark-600'
              }`}
            >
              {filter === 'all-time' ? 'All Time' : filter === 'last-year' ? 'Last Year' : 'Year to Date'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-stone-400 text-sm">{stat.title}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
                    {stat.isCount ? stat.value.toLocaleString() : formatCurrency(stat.value)}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-dark-500">
          <h2 className="text-xl font-bold text-stone-100">Recent Transactions</h2>
          <p className="text-stone-400 text-sm mt-1">Your latest financial activity</p>
        </div>
        
        <div className="divide-y divide-dark-500">
          {transactionsLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-500"></div>
            </div>
          ) : transactions && transactions.length > 0 ? (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-4 flex items-center justify-between hover:bg-dark-600/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    transaction.is_income ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}>
                    {transaction.is_income ? (
                      <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-stone-100 font-medium">{transaction.description}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-stone-500">{formatRelativeDate(transaction.date)}</span>
                      {transaction.account_name && (
                        <>
                          <span className="text-stone-600">•</span>
                          <span className="text-stone-500">{transaction.account_name}</span>
                        </>
                      )}
                      {transaction.category && (
                        <>
                          <span className="text-stone-600">•</span>
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs"
                            style={{ 
                              backgroundColor: `${transaction.category.color}20`,
                              color: transaction.category.color 
                            }}
                          >
                            {transaction.category.name}
                          </span>
                        </>
                      )}
                      {!transaction.is_categorized && (
                        <>
                          <span className="text-stone-600">•</span>
                          <span className="text-amber-400 text-xs">Uncategorized</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className={`text-lg font-semibold ${
                  transaction.is_income ? 'text-emerald-400' : 'text-stone-100'
                }`}>
                  {transaction.is_income ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                </p>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-stone-500">
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Import your bank CSV to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
