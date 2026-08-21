import React, { useState } from 'react';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { useCategory } from '../hooks/useCategory';
import { useCartStore } from '../../../../store';
import CategoryForm from '../components/CategoryForm';
import CategoryTable from '../components/CategoryTable';
import DeleteCategoryDialog from '../components/DeleteCategoryDialog';

export default function CategoryPage() {
  const { categories, loading, error, addCategory, updateCategory, deleteCategory, refresh } = useCategory();
  const { menuItems } = useCartStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleSubmit = async (data) => {
    if (editingCat) {
      await updateCategory(editingCat.id, data);
    } else {
      await addCategory(data);
    }
    setShowForm(false);
    setEditingCat(null);
  };

  const handleEdit = (cat) => {
    setEditingCat(cat);
    setShowForm(true);
  };

  const handleDelete = async (cat) => {
    await deleteCategory(cat.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-extrabold text-[#191c1e]">Category Management</h3>
          <p className="text-[11px] text-slate-500 font-medium">Organize your menu into categories</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setEditingCat(null); setShowForm(true); }}
            className="h-8.5 px-3 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-xs text-red-700 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-[18px] border border-slate-200 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            {editingCat ? 'Edit Category' : 'Create New Category'}
          </p>
          <CategoryForm
            initialData={editingCat}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingCat(null); }}
          />
        </div>
      )}

      {categories.length > 0 && (
        <CategoryTable
          categories={categories}
          menuItems={menuItems}
          onEdit={handleEdit}
          onDelete={(cat) => setDeleteTarget(cat)}
        />
      )}

      {!loading && categories.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400 text-xs italic">
          No categories created yet. Click "Add Category" to get started.
        </div>
      )}

      <DeleteCategoryDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        category={deleteTarget}
      />
    </div>
  );
}
