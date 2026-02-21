import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { Category } from '@/types';
import {
  useUpdateCategory,
  useDeleteCategory,
  useCreateSubcategory,
  useUpdateSubcategory,
  useDeleteSubcategory,
} from '@/hooks/useApi';

interface EditingState {
  categoryId: number;
  type: 'name' | 'color';
  value: string;
}

interface CategoryEditorProps {
  categories: Category[];
}

export default function CategoryEditor({ categories }: CategoryEditorProps) {
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newSubcategoryParentId, setNewSubcategoryParentId] = useState<number | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryColor, setNewSubcategoryColor] = useState('#3B82F6');

  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createSubcategory = useCreateSubcategory();
  const updateSubcategory = useUpdateSubcategory();
  const deleteSubcategory = useDeleteSubcategory();

  const parentCategories = useMemo(() => {
    return categories.filter(cat => !cat.parent_id);
  }, [categories]);

  const getSubcategories = (parentId: number) => {
    return categories.filter(cat => cat.parent_id === parentId);
  };

  const toggleExpanded = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleUpdateCategory = async (categoryId: number, updates: any) => {
    try {
      await updateCategory.mutateAsync({ id: categoryId, category: updates });
      setEditingState(null);
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to update category';
      alert(`Error: ${message}`);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory.mutateAsync(categoryId);
      } catch (error: any) {
        const message = error?.response?.data?.detail || error?.message || 'Failed to delete category';
        alert(`Error: ${message}`);
      }
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          color: newCategoryColor,
          parent_id: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create category');
      }

      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
      setShowNewCategoryForm(false);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: number) => {
    if (confirm('Are you sure you want to delete this subcategory?')) {
      try {
        await deleteSubcategory.mutateAsync(subcategoryId);
      } catch (error: any) {
        const message = error?.response?.data?.detail || error?.message || 'Failed to delete subcategory';
        alert(`Error: ${message}`);
      }
    }
  };

  const handleCreateSubcategory = async (parentId: number) => {
    if (!newSubcategoryName.trim()) {
      alert('Please enter a subcategory name');
      return;
    }

    try {
      await createSubcategory.mutateAsync({
        parentId,
        category: {
          name: newSubcategoryName,
          color: newSubcategoryColor,
        },
      });
      setNewSubcategoryParentId(null);
      setNewSubcategoryName('');
      setNewSubcategoryColor('#3B82F6');
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to create subcategory';
      alert(`Error: ${message}`);
    }
  };

  const handleUpdateSubcategory = async (subcategoryId: number, updates: any) => {
    try {
      await updateSubcategory.mutateAsync({ id: subcategoryId, category: updates });
      setEditingState(null);
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to update subcategory';
      alert(`Error: ${message}`);
    }
  };

  const colorOptions = [
    '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6',
    '#EC4899', '#14B8A6', '#6366F1', '#F97316', '#06B6D4',
    '#6B7280',
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-stone-100">Manage Categories</h2>
        <button
          onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
          className="flex items-center gap-2 px-4 py-2 bg-warm-500 hover:bg-warm-600 text-white rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {showNewCategoryForm && (
        <div className="p-4 bg-dark-700/50 rounded-xl border border-dark-500 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Category Name</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g., Entertainment"
              className="w-full px-4 py-2 bg-dark-700 border border-dark-500 rounded-xl text-stone-100 focus:ring-2 focus:ring-warm-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewCategoryColor(color)}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    newCategoryColor === color
                      ? 'ring-2 ring-offset-2 ring-offset-dark-800 ring-warm-400'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateCategory}
              disabled={updateCategory.isPending}
              className="px-4 py-2 bg-warm-500 hover:bg-warm-600 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewCategoryForm(false);
                setNewCategoryName('');
                setNewCategoryColor('#3B82F6');
              }}
              className="px-4 py-2 bg-dark-600 hover:bg-dark-700 text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {parentCategories.map((category) => {
          const subcategories = getSubcategories(category.id);
          const isExpanded = expandedCategories.has(category.id);
          const isEditing = editingState?.categoryId === category.id;

          return (
            <div key={category.id}>
              <div className="flex items-center gap-3 p-4 bg-dark-700/30 rounded-lg hover:bg-dark-700/50 transition-colors group">
                {subcategories.length > 0 && (
                  <button
                    onClick={() => toggleExpanded(category.id)}
                    className="text-stone-400 hover:text-stone-200"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                )}
                {subcategories.length === 0 && <div className="w-4" />}

                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                  style={{
                    backgroundColor: category.color || '#3B82F6',
                    opacity: 0.2,
                  }}
                />

                {isEditing && editingState.type === 'name' ? (
                  <input
                    type="text"
                    value={editingState.value}
                    onChange={(e) =>
                      setEditingState({ ...editingState, value: e.target.value })
                    }
                    className="flex-1 px-2 py-1 bg-dark-700 border border-dark-500 rounded text-stone-100"
                    autoFocus
                  />
                ) : (
                  <div className="flex-1">
                    <p className="text-stone-100 font-medium">
                      {category.name}
                      {category.is_system && (
                        <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                          System
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditing && editingState.type === 'name' ? (
                    <>
                      <button
                        onClick={() =>
                          handleUpdateCategory(category.id, { name: editingState.value })
                        }
                        className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingState(null)}
                        className="p-2 text-stone-400 hover:bg-dark-500 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          setEditingState({ categoryId: category.id, type: 'name', value: category.name })
                        }
                        className="p-2 text-stone-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!category.is_system && (
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-2 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isExpanded && subcategories.length > 0 && (
                <div className="ml-4 mt-2 space-y-2 border-l border-dark-500 pl-4">
                  {subcategories.map((subcategory) => {
                    const isSubEditing = editingState?.categoryId === subcategory.id;
                    return (
                      <div key={subcategory.id}>
                        <div className="flex items-center gap-3 p-3 bg-dark-700/20 rounded-lg hover:bg-dark-700/40 transition-colors group">
                          <div className="w-4" />

                          <div
                            className="w-6 h-6 rounded flex-shrink-0"
                            style={{
                              backgroundColor: subcategory.color || '#3B82F6',
                              opacity: 0.2,
                            }}
                          />

                          {isSubEditing && editingState.type === 'name' ? (
                            <input
                              type="text"
                              value={editingState.value}
                              onChange={(e) =>
                                setEditingState({ ...editingState, value: e.target.value })
                              }
                              className="flex-1 px-2 py-1 bg-dark-700 border border-dark-500 rounded text-stone-100"
                              autoFocus
                            />
                          ) : (
                            <p className="flex-1 text-stone-200 text-sm">
                              {subcategory.name}
                              {subcategory.is_system && (
                                <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                  System
                                </span>
                              )}
                            </p>
                          )}

                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isSubEditing && editingState.type === 'name' ? (
                              <>
                                <button
                                  onClick={() =>
                                    handleUpdateSubcategory(subcategory.id, {
                                      name: editingState.value,
                                    })
                                  }
                                  className="p-1 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingState(null)}
                                  className="p-1 text-stone-400 hover:bg-dark-500 rounded transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    setEditingState({
                                      categoryId: subcategory.id,
                                      type: 'name',
                                      value: subcategory.name,
                                    })
                                  }
                                  className="p-1 text-stone-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                {!subcategory.is_system && (
                                  <button
                                    onClick={() => handleDeleteSubcategory(subcategory.id)}
                                    className="p-1 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {newSubcategoryParentId === category.id ? (
                    <div className="p-3 bg-dark-700/50 rounded-lg border border-dark-500 space-y-3 ml-4">
                      <input
                        type="text"
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        placeholder="Subcategory name"
                        className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded text-stone-100 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCreateSubcategory(category.id)}
                          disabled={createSubcategory.isPending}
                          className="px-3 py-1 bg-warm-500 hover:bg-warm-600 text-white rounded text-sm transition-colors disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setNewSubcategoryParentId(null);
                            setNewSubcategoryName('');
                          }}
                          className="px-3 py-1 bg-dark-600 hover:bg-dark-700 text-white rounded text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewSubcategoryParentId(category.id)}
                      className="w-full mt-2 p-2 text-stone-400 hover:text-warm-400 hover:bg-warm-500/10 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus className="w-3 h-3" />
                      Add Subcategory
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
