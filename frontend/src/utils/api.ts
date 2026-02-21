import axios from 'axios';
import { Transaction, Category, LLMConfig, SankeyData, Summary, MonthlySummary, CSVImport, InsightResponse } from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export { api };

// Transactions
export const getTransactions = async (params?: {
  skip?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  category_id?: number;
  is_income?: boolean;
  search?: string;
}) => {
  const { data } = await api.get<Transaction[]>('/transactions', { params });
  return data;
};

export const createTransaction = async (transaction: Partial<Transaction>) => {
  const { data } = await api.post<Transaction>('/transactions', transaction);
  return data;
};

export const updateTransaction = async (id: number, transaction: Partial<Transaction>) => {
  const { data } = await api.put<Transaction>(`/transactions/${id}`, transaction);
  return data;
};

export const deleteTransaction = async (id: number) => {
  await api.delete(`/transactions/${id}`);
};

// Categories
export const getCategories = async () => {
  const { data } = await api.get<Category[]>('/categories');
  return data;
};

export const createCategory = async (category: Partial<Category>) => {
  const { data } = await api.post<Category>('/categories', category);
  return data;
};

// LLM Configs
export const getLLMConfigs = async () => {
  const { data } = await api.get<LLMConfig[]>('/llm-configs');
  return data;
};

export const createLLMConfig = async (config: Partial<LLMConfig>) => {
  const { data } = await api.post<LLMConfig>('/llm-configs', config);
  return data;
};

export const updateLLMConfig = async (id: number, config: Partial<LLMConfig>) => {
  const { data } = await api.put<LLMConfig>(`/llm-configs/${id}`, config);
  return data;
};

// Categorization
export const categorizeTransactions = async (transactionIds: number[]) => {
  const { data } = await api.post('/categorize', { transaction_ids: transactionIds });
  return data;
};

export const categorizeUncategorized = async (limit?: number) => {
  const { data } = await api.post('/categorize-uncategorized', null, {
    params: { limit }
  });
  return data;
};

// Analytics
export const getSankeyData = async (params?: { start_date?: string; end_date?: string }) => {
  const { data } = await api.get<SankeyData>('/analytics/sankey', { params });
  return data;
};

export const getSummary = async (params?: { start_date?: string; end_date?: string }) => {
  const { data } = await api.get<Summary>('/analytics/summary', { params });
  return data;
};

export const getTransactionCount = async (params?: {
  category_id?: number;
  search?: string;
}) => {
  const { data } = await api.get<{ count: number }>('/transactions/count', { params });
  return data.count;
};

export const getMonthlySummary = async (months?: number) => {
  const { data } = await api.get<MonthlySummary[]>('/analytics/monthly', {
    params: { months }
  });
  return data;
};

export const generateInsights = async (query: string, start_date?: string, end_date?: string) => {
  const { data } = await api.post<InsightResponse>('/analytics/insights', {
    query,
    start_date,
    end_date
  });
  return data;
};

// CSV Import
export const importCSV = async (file: File, accountName?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (accountName) {
    formData.append('account_name', accountName);
  }
  
  const { data } = await api.post<CSVImport>('/import/csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const getImports = async () => {
  const { data } = await api.get<CSVImport[]>('/imports');
  return data;
};

export const deleteLLMConfig = async (id: number) => {
  await api.delete(`/llm-configs/${id}`);
};


export const deleteImport = async (id: number) => {
  await api.delete(`/imports/${id}`);
};
