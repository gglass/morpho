import { useState, useCallback } from 'react';
import { useImportCSV, useImports, useDeleteImport, useCategorizeUncategorized } from '@/hooks/useApi';
import { formatDate } from '@/utils/format';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Trash2, Sparkles } from 'lucide-react';

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [accountName, setAccountName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [categorizeAfterImport, setCategorizeAfterImport] = useState(true);
  
  const importMutation = useImportCSV();
  const categorizeMutation = useCategorizeUncategorized();
  const deleteImportMutation = useDeleteImport();
  const { data: imports } = useImports?.() || { data: [] };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    const onSuccess = () => {
      setFile(null);
      setAccountName('');
      
      if (categorizeAfterImport) {
        setTimeout(() => {
          console.log('Starting auto-categorization...');
          categorizeMutation.mutate(undefined);
        }, 500);
      }
    };
    
    importMutation.mutate(
      { file, accountName: accountName || undefined },
      {
        onSuccess,
      }
    );
  };

  const handleDeleteImport = async (id: number) => {
    if (confirm("Are you sure you want to delete this import? This will also delete all associated transactions.")) {
      try {
        await deleteImportMutation.mutateAsync(id);
      } catch (error) {
        alert("Failed to delete import");
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Import</h1>
        <p className="text-stone-400 mt-1">Import transactions from your bank CSV files</p>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
              isDragging 
                ? 'border-warm-500 bg-warm-500/5' 
                : 'border-dark-500 hover:border-dark-400'
            }`}
          >
            <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8 text-warm-400" />
            </div>
            
            {file ? (
              <div>
                <p className="text-stone-100 font-medium">{file.name}</p>
                <p className="text-stone-400 text-sm mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-warm-400 text-sm mt-2 hover:underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <p className="text-stone-100 font-medium">
                  Drop your CSV file here, or{' '}
                  <label className="text-warm-400 hover:underline cursor-pointer">
                    browse
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </p>
                <p className="text-stone-400 text-sm mt-2">
                  Supports most bank CSV formats
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Account Name <span className="text-stone-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., Chase Checking, Savings..."
              className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-warm-500 focus:border-transparent"
            />
          </div>

          <label className="flex items-center gap-3 p-4 bg-dark-700/30 border border-dark-500 rounded-xl cursor-pointer hover:bg-dark-700/50 transition-colors">
            <input
              type="checkbox"
              checked={categorizeAfterImport}
              onChange={(e) => setCategorizeAfterImport(e.target.checked)}
              className="w-5 h-5 text-warm-500 rounded border-dark-600 focus:ring-warm-500"
            />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-warm-500" />
              <span className="text-stone-300">Auto-categorize all transactions after importing</span>
            </div>
          </label>

          <button
            type="submit"
            disabled={!file || importMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-warm-500 hover:bg-warm-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Import Transactions
              </>
            )}
          </button>
        </form>
      </div>

      {imports && imports.length > 0 && (
        <div className="card">
          <div className="p-6 border-b border-dark-500">
            <h2 className="text-xl font-bold text-stone-100">Recent Imports</h2>
            <p className="text-stone-400 text-sm mt-1">History of your CSV imports</p>
          </div>
          <div className="divide-y divide-dark-500">
            {imports.map((importItem: any) => (
               
              <div key={importItem.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    importItem.status === 'completed' ? 'bg-emerald-500/10' : 
                    importItem.status === 'failed' ? 'bg-red-500/10' : 'bg-amber-500/10'
                  }`}>
                    {importItem.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : importItem.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    )}
                  </div>
                  <div>
                    <p className="text-stone-100 font-medium">{importItem.filename}</p>
                    <p className="text-stone-400 text-sm">
                      {importItem.imported_count} of {importItem.row_count} rows imported
                      {importItem.account_name && ` • ${importItem.account_name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-stone-500 text-sm">
                    {formatDate(importItem.created_at)}
                  </span>
                  <button
                      onClick={() => handleDeleteImport(importItem.id)}
                      disabled={deleteImportMutation.isPending}
                      className="p-2 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
