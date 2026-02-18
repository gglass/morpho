import { useState } from 'react';
import { useLLMConfigs, useCategories } from '@/hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import { createLLMConfig, deleteLLMConfig, updateLLMConfig } from '@/utils/api';
import { Key, Server, Plus, Trash2, Sparkles, RefreshCw, Edit } from 'lucide-react';

interface LLMFormData {
  provider: string;
  api_key: string;
  model_name: string;
  base_url: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: configs } = useLLMConfigs();
  const { data: categories } = useCategories();
  
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<number | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [formData, setFormData] = useState<LLMFormData>({
    provider: 'openai',
    api_key: '',
    model_name: 'gpt-4',
    base_url: '',
    temperature: 0.3,
    max_tokens: 500,
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.model_name.trim()) {
      alert('Please select or enter a model name');
      return;
    }
    
    try {
      if (editingConfig !== null) {
        await updateLLMConfig(editingConfig, {
          ...formData,
          base_url: formData.base_url || undefined,
        });
        queryClient.invalidateQueries({ queryKey: ['llm-configs'] });
        setEditingConfig(null);
      } else {
        await createLLMConfig({
          ...formData,
          base_url: formData.base_url || undefined,
        });
        queryClient.invalidateQueries({ queryKey: ['llm-configs'] });
      }
      setShowForm(false);
      setFormData({
        provider: 'openai',
        api_key: '',
        model_name: 'gpt-4',
        base_url: '',
        temperature: 0.3,
        max_tokens: 500,
        is_active: true,
      });
      setAvailableModels([]);
    } catch (error) {
      alert('Failed to save configuration');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      try {
        await deleteLLMConfig(id);
        queryClient.invalidateQueries({ queryKey: ['llm-configs'] });
      } catch (error: any) {
        const message = error?.response?.data?.detail || error?.message || 'Failed to delete configuration';
        alert(`Failed to delete configuration: ${message}`);
      }
    }
  };

  const handleEdit = (config: any) => {
    setEditingConfig(config.id);
    setFormData({
      provider: config.provider,
      api_key: config.api_key || '',
      model_name: config.model_name,
      base_url: config.base_url || '',
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      is_active: config.is_active,
    });
    setShowForm(true);
  };

  const handleFetchModels = async () => {
    if (!formData.base_url.trim()) {
      alert('Please enter a base URL first');
      return;
    }
    
    setFetchingModels(true);
    try {
      const response = await fetch(`/api/models?provider=${formData.provider}&base_url=${encodeURIComponent(formData.base_url)}`);
      const data = await response.json();
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models);
        // Set first model as default selection
        if (!formData.model_name || !data.models.includes(formData.model_name)) {
          setFormData(prev => ({ ...prev, model_name: data.models[0] }));
        }
      } else {
        alert('No models found. The URL might not be a valid OpenAI-compatible API endpoint.');
      }
    } catch (error) {
      alert('Failed to fetch models from the provider');
    } finally {
      setFetchingModels(false);
    }
  };

  const providers = [
    { id: 'openai', name: 'LM Studio / Other OpenAI-Compatible' },
    { id: 'ollama', name: 'Ollama (Local)' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Settings</h1>
        <p className="text-stone-400 mt-1">Configure AI providers and app preferences</p>
      </div>

      {/* AI Provider Configurations */}
      <div className="card">
        <div className="p-6 border-b border-dark-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warm-500/10 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-warm-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-100">AI Providers</h2>
              <p className="text-stone-400 text-sm">Configure LLM providers for auto-categorization</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-warm-500 hover:bg-warm-600 text-white rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Provider
          </button>
        </div>

        {showForm && (
          <div className="p-6 border-b border-dark-500 bg-dark-700/50">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-2">Provider</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => {
                      setFormData({ ...formData, provider: e.target.value });
                      setAvailableModels([]);
                    }}
                    className="w-full px-4 py-2 bg-dark-700 border border-dark-500 rounded-xl text-stone-100 focus:ring-2 focus:ring-warm-500"
                  >
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-2">Model</label>
                  {availableModels.length > 0 ? (
                    <div className="flex gap-2">
                      <select
                        value={formData.model_name}
                        onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                        className="flex-1 px-4 py-2 bg-dark-700 border border-dark-500 rounded-xl text-stone-100 focus:ring-2 focus:ring-warm-500"
                      >
                        {availableModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={formData.model_name}
                      onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                      placeholder="Enter model name (e.g., gpt-4)"
                      className="w-full px-4 py-2 bg-dark-700 border border-dark-500 rounded-xl text-stone-100 focus:ring-2 focus:ring-warm-500"
                    />
                  )}
                </div>

                {formData.provider !== 'ollama' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-300 mb-2">API Key</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                      <input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        placeholder="sk-..."
                        className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-500 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-warm-500"
                      />
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-300 mb-2">Base URL (Optional)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                      <input
                        type="url"
                        value={formData.base_url}
                        onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                        placeholder={formData.provider === 'ollama' ? "http://localhost:11434" : "http://192.168.1.31:1234"}
                        className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-500 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-warm-500"
                      />
                    </div>
                    {formData.base_url && (
                      <button
                        type="button"
                        onClick={handleFetchModels}
                        disabled={fetchingModels}
                        className="px-4 py-2 bg-dark-600 hover:bg-dark-700 text-white rounded-xl transition-colors whitespace-nowrap"
                      >
                        {fetchingModels ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 inline mr-1" />
                            Fetch Models
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {formData.base_url && availableModels.length > 0 && (
                    <p className="text-emerald-500 text-xs mt-2">
                      Found {availableModels.length} model(s) - select one above
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-2">Temperature ({formData.temperature})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-warm-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-dark-700 border border-dark-500 rounded-xl text-stone-100 focus:ring-2 focus:ring-warm-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-warm-500 hover:bg-warm-600 text-white rounded-xl transition-colors font-medium"
                >
                  {editingConfig !== null ? 'Update Configuration' : 'Save Configuration'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      provider: 'openai',
                      api_key: '',
                      model_name: 'gpt-4',
                      base_url: '',
                      temperature: 0.3,
                      max_tokens: 500,
                      is_active: true,
                    });
                    setAvailableModels([]);
                  }}
                  className="px-6 py-2 bg-dark-600 hover:bg-dark-700 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {configs && configs.length > 0 && (
          <div className="divide-y divide-dark-500">
            {configs.map((config) => (
              <div key={config.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Server className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-stone-100 font-medium">{config.provider}</p>
                    <p className="text-stone-400 text-sm">
                      Model: {config.model_name}
                      {config.base_url && ` • ${config.base_url}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(config)}
                    className="p-2 text-stone-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Edit configuration"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="p-2 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete configuration"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div className="card">
          <div className="p-6 border-b border-dark-500">
            <h2 className="text-xl font-bold text-stone-100">Categories</h2>
          </div>
          <div className="divide-y divide-dark-500">
            {categories.map((category) => (
              <div key={category.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    category.color ? `bg-${category.color}-500/10` : 'bg-gray-500/10'
                  }`}>
                    <span className={`text-lg font-bold ${
                      category.color ? `text-${category.color}-400` : 'text-gray-400'
                    }`}>
                      {category.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-stone-100 font-medium">{category.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
