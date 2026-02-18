import { useState, useEffect, useMemo } from 'react';
import type { Transaction, Category } from '@/types';
import { ArrowUpRight, ArrowDownRight, X, Save, Edit2, Check } from 'lucide-react';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionId: number, updates: Partial<Transaction>) => Promise<void>;
  transaction: Transaction | null;
  categories: Category[];
}

export default function TransactionDetailsModal({
  isOpen,
  onClose,
  onSave,
  transaction,
  categories,
}: TransactionDetailsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | ''>('');
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [isIncome, setIsIncome] = useState<boolean>(false);

  useEffect(() => {
    if (transaction) {
      setSelectedCategory(transaction.category_id || '');
      setSelectedSubcategory(transaction.subcategory_id || '');
      setAmount(Math.abs(transaction.amount).toString());
      setIsIncome(transaction.is_income);
      setIsEditing(false);
    }
  }, [transaction]);

  const subcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const parentCategory = categories.find(c => c.id === Number(selectedCategory));
    return parentCategory?.subcategories || [];
  }, [selectedCategory, categories]);

  const categoryOptions = useMemo(() => {
    return categories.filter(cat => !cat.parent_id);
  }, [categories]);

  if (!isOpen || !transaction) return null;

  const formatCurrency = (amount: number, isIncome: boolean) => {
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    return (
      <div className="flex items-center gap-2 justify-end">
        {isIncome ? (
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-red-400" />
        )}
        <span className={`font-semibold ${isIncome ? 'text-emerald-400' : 'text-stone-100'}`}>
          {formatted}
        </span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isOpen || !transaction) return null;

  const handleSave = async () => {
    const numericAmount = parseFloat(amount);
    const finalAmount = isIncome ? Math.abs(numericAmount) : -Math.abs(numericAmount);
    
    await onSave(transaction.id, {
      category_id: selectedCategory || undefined,
      subcategory_id: selectedSubcategory || undefined,
      amount: finalAmount,
      is_income: isIncome
    });
    
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-dark-800 rounded-2xl shadow-2xl border border-dark-600 overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-900/50">
          <h2 className="text-xl font-semibold text-stone-100">Transaction Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-500 mb-1">Date</label>
              <p className="text-stone-200">{formatDate(transaction.date)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-500 mb-1">Description</label>
              <p className="text-stone-200 font-medium">{transaction.description}</p>
              {transaction.account_name && (
                <p className="text-stone-500 text-sm mt-1">{transaction.account_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-500 mb-1">Amount</label>
              {formatCurrency(transaction.amount, transaction.is_income)}
            </div>
          </div>

          <div className="border-t border-dark-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-stone-200">Category</h3>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-stone-500 mb-1.5">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-stone-100 focus:ring-2 focus:ring-warm-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isIncome}
                      onChange={(e) => setIsIncome(e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 border-gray-600 bg-dark-700"
                    />
                    <span className="text-stone-300">This is income</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-500 mb-1.5">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value === '0' ? '' : Number(e.target.value));
                      setSelectedSubcategory('');
                    }}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-stone-100 focus:ring-2 focus:ring-warm-500 focus:border-transparent"
                  >
                    <option value={0}>Select Category...</option>
                    {categoryOptions.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {selectedCategory && subcategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-stone-500 mb-1.5">Subcategory</label>
                    <select
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value === '0' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-stone-100 focus:ring-2 focus:ring-warm-500 focus:border-transparent"
                    >
                      <option value={0}>Select Subcategory...</option>
                      {subcategories.map(subcat => (
                        <option key={subcat.id} value={subcat.id}>{subcat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-2 bg-warm-600 hover:bg-warm-700 text-white rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedCategory(transaction.category_id || '');
                      setSelectedSubcategory(transaction.subcategory_id || '');
                    }}
                    className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-stone-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {transaction.category ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span 
                          className="px-3 py-1.5 rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: `${transaction.category.color}20`,
                            color: transaction.category.color
                          }}
                        >
                          {transaction.category.name}
                        </span>
                      </div>
                      {transaction.subcategory && (
                        <div className="flex items-center gap-2 pl-4">
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium bg-stone-700/50 text-stone-300"
                          >
                            {transaction.subcategory.name}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-amber-400 text-sm">Uncategorized</p>
                  )}
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-2 px-3 py-1.5 bg-warm-600 hover:bg-warm-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-dark-900/30 border-t border-dark-700">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-stone-400 hover:text-stone-200 hover:bg-dark-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
