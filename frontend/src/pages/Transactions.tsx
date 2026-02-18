import { useState, useMemo, useEffect } from 'react';
import { useTransactions, useCategories, useDeleteTransaction, useCategorizeTransactions, useSummary, useTransactionCount, useUpdateTransaction } from '@/hooks/useApi';
import { formatCurrency, formatDate } from '@/utils/format';
import { ArrowUpRight, ArrowDownRight, Search, Filter, Sparkles, Trash2 } from 'lucide-react';
import type { Transaction } from '@/types';
import TransactionDetailsModal from "@/components/TransactionDetailsModal";

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all' | -1>('all');
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 50;
  
  // Modal state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, selectedCategory]);
  
  // Get filtered transaction count for pagination
  const { data: summary } = useSummary();
  const totalCount = summary?.transaction_count || 0;
  
  // Use filtered count when category or search is active
  // Pass category_id directly (it can be a number, -1 for uncategorized, or undefined)
  const { data: filteredCount } = useTransactionCount({
    category_id: selectedCategory === 'all' ? undefined : Number(selectedCategory),
    search: search || undefined
  });
  
  // Calculate total pages based on whether filtering is active
  const hasFilter = (selectedCategory !== 'all' && selectedCategory !== -1) || search;
  const effectiveTotalCount = hasFilter ? (filteredCount ?? totalCount) : totalCount;
  const totalPages = Math.ceil(effectiveTotalCount / ITEMS_PER_PAGE);
  
  const { data: transactions, isLoading } = useTransactions({ 
    skip: page * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
    category_id: selectedCategory === 'all' ? undefined : selectedCategory,
    search: search || undefined
  });
  const { data: categories } = useCategories();
  const deleteMutation = useDeleteTransaction();
  const categorizeMutation = useCategorizeTransactions();
  const updateMutation = useUpdateTransaction();

  // For uncategorized (-1), we need client-side filtering since backend doesn't support it
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (selectedCategory === -1) {
      return transactions.filter(t => !t.category_id);
    }
    return transactions;
  }, [transactions, selectedCategory]);

  const uncategorizedCount = useMemo(() => 
    transactions?.filter(t => !t.is_categorized).length || 0,
    [transactions]
  );

  const handleCategorizeAll = (transactionIds?: number[]) => {
    const ids = transactionIds ?? transactions?.map(t => t.id) ?? [];
    if (ids.length > 0) {
      categorizeMutation.mutate(ids);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteMutation.mutate(id);
    }
  };

  // Modal handlers
  const openTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (id: number, updates: Partial<Transaction>) => {
    await updateMutation.mutateAsync({ id, transaction: updates });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Transaction Details Modal */}
      <TransactionDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        transaction={selectedTransaction}
        categories={categories || []}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Transactions</h1>
          <p className="text-stone-400 mt-1">Manage and categorize your transactions</p>
        </div>
        
        {uncategorizedCount > 0 && (
          <button
            onClick={() => handleCategorizeAll(transactions?.filter(t => !t.category_id).map(t => t.id) || [])}
            disabled={categorizeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-warm-500 hover:bg-warm-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {categorizeMutation.isPending ? 'Categorizing...' : `Auto-categorize ${uncategorizedCount}`}
          </button>
        )}
        
        {/* Categorize All Button - works on all transactions */}
        <button
          onClick={() => handleCategorizeAll(transactions?.map(t => t.id) || [])}
          disabled={categorizeMutation.isPending || !transactions || transactions.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {categorizeMutation.isPending ? 'Processing...' : `Categorize All (${totalCount})`}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-500 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-warm-500 focus:border-transparent"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : e.target.value === '-1' ? -1 as const : Number(e.target.value))}
            className="pl-10 pr-8 py-3 bg-dark-700 border border-dark-500 rounded-xl text-stone-100 focus:ring-2 focus:ring-warm-500 focus:border-transparent appearance-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories?.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
            <option value="-1">Uncategorized</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warm-500"></div>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-700">
                <tr>
                  <th className="text-left px-6 py-4 text-stone-400 font-medium">Date</th>
                  <th className="text-left px-6 py-4 text-stone-400 font-medium">Description</th>
                  <th className="text-left px-6 py-4 text-stone-400 font-medium">Category</th>
                  <th className="text-right px-6 py-4 text-stone-400 font-medium">Amount</th>
                  <th className="px-6 py-4 text-stone-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-500">
                {filteredTransactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className="hover:bg-dark-600/30 cursor-pointer"
                    onClick={() => openTransactionDetails(transaction)}
                  >
                    <td className="px-6 py-4 text-stone-400 whitespace-nowrap">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-stone-100 font-medium">{transaction.description}</p>
                        {transaction.account_name && (
                          <p className="text-stone-500 text-sm">{transaction.account_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {transaction.category ? (
                        <span 
                          className="px-3 py-1 rounded-full text-sm"
                          style={{ 
                            backgroundColor: `${transaction.category.color}20`,
                            color: transaction.category.color 
                          }}
                        >
                          {transaction.category.name}
                        </span>
                      ) : (
                        <span className="text-amber-400 text-sm">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {transaction.is_income ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        )}
                        <span className={`font-semibold ${
                          transaction.is_income ? 'text-emerald-400' : 'text-stone-100'
                        }`}>
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(transaction.id);
                          }}
                          className="p-2 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-stone-500">
            <p className="text-lg">No transactions found</p>
            <p className="mt-1">Try adjusting your search or filters</p>
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-dark-500 bg-dark-700/30">
            <span className="text-stone-400 text-sm">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-stone-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-stone-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
