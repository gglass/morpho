export interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string;
  parent_id?: number;
  is_system: boolean;
  created_at: string;
  subcategories?: Category[];
}

export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category_id?: number;
  subcategory_id?: number;
  account_name?: string;
  is_income: boolean;
  original_description?: string;
  is_categorized: boolean;
  llm_provider?: string;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  subcategory?: Category;
}

export interface LLMConfig {
  id: number;
  provider: string;
  api_key?: string;
  model_name: string;
  base_url?: string;
  is_active: boolean;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface SankeyNode {
  id: number;
  name: string;
  color?: string;
  category_id?: number;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
  color?: string;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface Summary {
  total_income: number;
  total_expenses: number;
  net: number;
  transaction_count: number;
  uncategorized_count: number;
}

export interface InsightResponse {
  success?: boolean;
  insight?: string;
  error?: string;
  transaction_count?: number;
  query?: string;
}

export interface CSVImport {
  id: number;
  filename: string;
  account_name?: string;
  row_count: number;
  imported_count: number;
  status: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
