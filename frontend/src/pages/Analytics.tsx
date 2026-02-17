import { useState, useMemo } from 'react';
import { useSankeyData, useTransactions } from '@/hooks/useApi';
import SankeyChart from '@/components/SankeyChart';
import { formatCurrency } from '@/utils/format';

export default function Analytics() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  const { data: sankeyData, isLoading: sankeyLoading } = useSankeyData();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({
    skip: 0,
    limit: 100,
    category_id: undefined
  });

  const categoryMap = useMemo(() => {
    const map = new Map<string, number>();
    if (sankeyData) {
      sankeyData.nodes.forEach(node => {
        if (node.name !== 'Income' && node.name !== 'Expenses') {
          map.set(node.name, node.category_id || node.id);
        }
      });
    }
    return map;
  }, [sankeyData]);

  const filteredTransactions = useMemo(() => {
    if (!transactions || !selectedNode) return transactions || [];
    
    const categoryId = categoryMap.get(selectedNode);
    if (categoryId === undefined) return transactions;
    
    return transactions.filter(t => t.category_id === categoryId);
  }, [transactions, selectedNode, categoryMap]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Analytics</h1>
        <p className="text-stone-400 mt-1">Deep dive into your spending patterns</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-stone-100">Money Flow</h2>
            <p className="text-stone-400 text-sm mt-1">
              Click on any category to see related transactions
            </p>
          </div>
          {selectedNode && (
            <button
              onClick={() => setSelectedNode(null)}
              className="px-4 py-2 text-sm text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>
        
        {sankeyLoading ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : sankeyData ? (
          <SankeyChart 
            data={sankeyData} 
            onNodeClick={setSelectedNode}
            selectedNode={selectedNode}
          />
        ) : (
          <div className="h-[500px] flex items-center justify-center text-stone-500">
            No data available
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-stone-100">Transactions</h2>
            <p className="text-stone-400 text-sm mt-1">
              {selectedNode 
                ? `Showing transactions for: ${selectedNode}` 
                : 'All transactions'}
            </p>
          </div>
        </div>

        {transactionsLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredTransactions && filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-800">
                <tr>
                  <th className="text-left px-6 py-4 text-stone-400 font-medium">Date</th>
                  <th className="text-left px-6 py-4 text-stone-400 font-medium">Description</th>
                  <th className="text-left px-6 py-4 text-stone-400 font-medium">Category</th>
                  <th className="text-right px-6 py-4 text-stone-400 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-700">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-stone-700/30 transition-colors">
                    <td className="px-6 py-4 text-stone-400 whitespace-nowrap">
                      {new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-stone-100 font-medium">{transaction.description}</p>
                      {transaction.account_name && (
                        <p className="text-stone-500 text-sm">{transaction.account_name}</p>
                      )}
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
                        <span className="text-stone-500 text-sm">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {transaction.is_income ? (
                          <span className="text-emerald-400">↑</span>
                        ) : (
                          <span className="text-red-400">↓</span>
                        )}
                        <span className={`font-semibold ${
                          transaction.is_income ? 'text-emerald-400' : 'text-stone-100'
                        }`}>
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
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
            {selectedNode && (
              <p className="mt-1 text-sm">Try clearing the selection to see all transactions</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
