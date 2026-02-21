import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/utils/api';

// Transactions
export const useTransactions = (params?: Parameters<typeof api.getTransactions>[0]) => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.getTransactions(params),
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['sankey'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, transaction }: { id: number; transaction: Parameters<typeof api.updateTransaction>[1] }) =>
      api.updateTransaction(id, transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['sankey'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['sankey'] });
    },
  });
};

// Categories
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });
};

// LLM Configs
export const useLLMConfigs = () => {
  return useQuery({
    queryKey: ['llm-configs'],
    queryFn: api.getLLMConfigs,
  });
};

// Analytics
export const useSummary = (params?: { start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['summary', params],
    queryFn: () => api.getSummary(params),
  });
};

export const useTransactionCount = (params?: { category_id?: number; search?: string }) => {
  return useQuery({
    queryKey: ['transaction-count', params],
    queryFn: () => api.getTransactionCount(params),
  });
};

export const useSankeyData = (params?: Parameters<typeof api.getSankeyData>[0]) => {
  return useQuery({
    queryKey: ['sankey', params],
    queryFn: () => api.getSankeyData(params),
  });
};

export const useMonthlySummary = (months?: number) => {
  return useQuery({
    queryKey: ['monthly-summary', months],
    queryFn: () => api.getMonthlySummary(months),
  });
};

// Categorization
export const useCategorizeTransactions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.categorizeTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['sankey'] });
    },
  });
};

export const useCategorizeUncategorized = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (limit?: number) => api.categorizeUncategorized(limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['sankey'] });
    },
  });
};

// CSV Import
export const useImportCSV = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, accountName }: { file: File; accountName?: string }) =>
      api.importCSV(file, accountName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['sankey'] });
    },
  });
};

export const useImports = () => {
  return useQuery({
    queryKey: ['imports'],
    queryFn: api.getImports,
  });
};

export const useDeleteImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteImport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });
};

// AI Insights
export const useGenerateInsights = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { query: string; start_date?: string; end_date?: string }) => api.generateInsights(params.query, params.start_date, params.end_date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
