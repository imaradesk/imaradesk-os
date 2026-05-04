import React, { useState } from 'react'
import { Head, useForm, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import KBSidebar from '../components/KBSidebar'
import Drawer from '../components/Drawer'
import { THEME } from '../constants/theme'
import { ArrowLeft, Edit, Trash2, Plus, FolderOpen } from 'lucide-react'
import LucideIcon, { CATEGORY_ICONS } from '../components/LucideIcon'
import DataTable from '../../components/DataTable'

export default function KBCategoryForm({ mode = 'add', category = {}, categories = [], pagination = {}, errors: serverErrors = {}, sidebar = { views: [] }, pendingCount = 0 }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(mode === 'edit')
  const [editingCategory, setEditingCategory] = useState(mode === 'edit' ? category : null)

  const { data, setData, post, processing, errors, reset } = useForm({
    name: category.name || '',
    description: category.description || '',
    icon: category.icon || 'Folder',
  })

  const openAddDrawer = () => {
    setEditingCategory(null)
    reset()
    setData({ name: '', description: '', icon: 'Folder' })
    setDrawerOpen(true)
  }

  const openEditDrawer = (cat) => {
    setEditingCategory(cat)
    setData({ name: cat.name, description: cat.description || '', icon: cat.icon || 'Folder' })
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingCategory(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const isEdit = !!editingCategory
    const url = isEdit ? `/knowledgebase/category/${editingCategory.id}/update/` : '/knowledgebase/category/add/'
    const successMsg = isEdit ? 'Category updated successfully!' : 'Category created successfully!'
    
    toast.promise(
      new Promise((resolve, reject) => {
        post(url, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            closeDrawer()
            router.visit('/knowledgebase/categories/', { preserveScroll: true })
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: isEdit ? 'Updating category...' : 'Creating category...',
        success: successMsg,
        error: 'Operation failed',
      }
    )
  }

  const handleDelete = (categoryId) => {
    toast.promise(
      new Promise((resolve, reject) => {
        router.post(`/knowledgebase/category/${categoryId}/delete/`, {}, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          onSuccess: () => {
            setDeleteConfirm(null)
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: 'Deleting category...',
        success: 'Category deleted successfully!',
        error: 'Failed to delete category',
      }
    )
  }

  const handlePageChange = (page) => {
    router.visit(`/knowledgebase/categories/?page=${page}`, {
      preserveState: true,
    })
  }

  const allErrors = { ...serverErrors, ...errors }

  return (
    <>
      <Head title="Manage Categories" />
      <AppShell active="knowledgebase">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          <KBSidebar views={sidebar.views} activePage="categories" pendingCount={pendingCount} />
          <main className="flex-1 bg-gray-50">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              
              <h1 className="text-xl font-semibold text-gray-800">Manage Categories</h1>
            </div>
            <button
              onClick={openAddDrawer}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md ${THEME.button.primary}`}
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          {/* Categories List */}
          <div className="p-6">
            <DataTable
              data={categories}
              serverPagination={pagination.total_pages > 1 ? { count: pagination.total_items, pages: pagination.total_pages, page: pagination.current_page } : null}
              onPageChange={(page) => handlePageChange(page)}
              columns={[
                {
                  key: 'name',
                  header: 'Category',
                  render: (cat) => (
                    <div className="flex items-center gap-3">
                      <LucideIcon name={cat.icon} className="w-5 h-5 text-[#4a154b]" />
                      <span className="font-medium text-gray-900">{cat.name}</span>
                    </div>
                  ),
                },
                {
                  key: 'description',
                  header: 'Description',
                },
                {
                  key: 'article_count',
                  header: 'Articles',
                },
                {
                  key: 'created_by',
                  header: 'Created By',
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  sortable: false,
                  hideable: false,
                  render: (cat) => (
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditDrawer(cat)}
                        className="text-[#4a154b] hover:text-[#825084] p-1.5 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(cat.id)}
                        className="text-red-600 hover:text-red-700 p-1.5 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </main>
        </div>

        {/* Add/Edit Category Drawer */}
        <Drawer
          isOpen={drawerOpen}
          onClose={closeDrawer}
          title={editingCategory ? 'Edit Category' : 'Add Category'}
          width="max-w-lg"
        >
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name* <span className="text-xs text-gray-500">(required)</span>
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#4a154b] focus:border-transparent ${
                  allErrors?.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter category name"
              />
              {allErrors?.name && <p className="mt-1 text-sm text-red-600">{allErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                placeholder="Enter category description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#4a154b]/10 text-[#4a154b]">
                  <LucideIcon name={data.icon} className="w-6 h-6" />
                </div>
                <span className="text-sm text-gray-500">Selected: {data.icon}</span>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {CATEGORY_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setData('icon', iconName)}
                    title={iconName}
                    className={`p-2 rounded-md border-2 transition-all hover:scale-110 flex items-center justify-center ${
                      data.icon === iconName
                        ? 'border-[#4a154b] bg-[#4a154b]/10 text-[#4a154b]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <LucideIcon name={iconName} className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeDrawer}
                className={`px-4 py-2 rounded-md ${THEME.button.secondary}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className={`px-4 py-2 rounded-md ${THEME.button.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </form>
        </Drawer>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Category</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this category? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={`px-4 py-2 rounded-md ${THEME.button.secondary}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </>
  )
}
