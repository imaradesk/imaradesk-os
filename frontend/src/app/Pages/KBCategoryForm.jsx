import React, { useState } from 'react'
import { Head, useForm, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import AppShell from '../components/AppShell'
import KBSidebar from '../components/KBSidebar'
import { THEME } from '../constants/theme'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'

export default function KBCategoryForm({ mode = 'add', category = {}, categories = [], pagination = {}, errors: serverErrors = {}, sidebar = { views: [] }, pendingCount = 0 }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data, setData, post, processing, errors } = useForm({
    name: category.name || '',
    description: category.description || '',
    icon: category.icon || '📁',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const url = mode === 'add' ? '/knowledgebase/category/add/' : `/knowledgebase/category/${category.id}/update/`
    const successMsg = mode === 'add' ? 'Category created successfully!' : 'Category updated successfully!'
    
    toast.promise(
      new Promise((resolve, reject) => {
        post(url, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            if (mode === 'add') {
              router.visit('/knowledgebase/category/new/')
            }
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: mode === 'add' ? 'Creating category...' : 'Updating category...',
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
    router.visit(`/knowledgebase/category/new/?page=${page}`, {
      preserveState: true,
    })
  }

  const allErrors = { ...serverErrors, ...errors }

  const emojiOptions = ['📁', '🚀', '💳', '🔧', '🔗', '🔒', '⭐', '📚', '💡', '🎯', '📊', '🛠️', '🎨', '🌟', '📝']

  return (
    <>
      <Head title={mode === 'add' ? 'Add Category' : 'Edit Category'} />
      <AppShell active="knowledgebase">
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          <KBSidebar views={sidebar.views} activePage="categories" pendingCount={pendingCount} />
          <main className="flex-1 bg-gray-50">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/knowledgebase/"
                className="p-2 rounded-md hover:bg-gray-100"
                title="Back to Knowledge Base"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-800">
                {mode === 'add' ? 'Add Category' : 'Edit Category'}
              </h1>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-2xl mb-8">
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
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
                      <div className="text-4xl">{data.icon}</div>
                      <span className="text-sm text-gray-500">Selected icon</span>
                    </div>
                    <div className="grid grid-cols-10 gap-2">
                      {emojiOptions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setData('icon', emoji)}
                          className={`text-2xl p-2 rounded-md border-2 transition-all hover:scale-110 ${
                            data.icon === emoji
                              ? 'border-[#4a154b] bg-[#e6f0f1]'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <Link
                      href="/knowledgebase/"
                      className={`px-4 py-2 rounded-md ${THEME.button.secondary}`}
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={processing}
                      className={`px-4 py-2 rounded-md ${THEME.button.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {mode === 'add' ? 'Create Category' : 'Update Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Categories List - Only show in add mode */}
            {mode === 'add' && categories.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">All Categories</h2>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Articles
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created By
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categories.map((cat) => (
                          <tr key={cat.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{cat.icon}</span>
                                <span className="font-medium text-gray-900">{cat.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600 line-clamp-1">{cat.description || '—'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{cat.article_count}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-600">{cat.created_by}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/knowledgebase/category/${cat.id}/edit/`}
                                  className="text-[#4a154b] hover:text-[#825084] p-1.5 hover:bg-gray-100 rounded"
                                  title="Edit"
                                >
                                  <Edit className="w-5 h-5" />
                                </Link>
                                <button
                                  onClick={() => setDeleteConfirm(cat.id)}
                                  className="text-red-600 hover:text-red-700 p-1.5 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {pagination.total_pages > 1 && (
                      <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                        <div className="text-sm text-gray-700">
                          Showing <span className="font-medium">{((pagination.current_page - 1) * 10) + 1}</span> to{' '}
                          <span className="font-medium">{Math.min(pagination.current_page * 10, pagination.total_items)}</span> of{' '}
                          <span className="font-medium">{pagination.total_items}</span> results
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePageChange(pagination.current_page - 1)}
                            disabled={!pagination.has_previous}
                            className={`px-3 py-1 rounded-md ${
                              pagination.has_previous
                                ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1 text-sm text-gray-700">
                            Page {pagination.current_page} of {pagination.total_pages}
                          </span>
                          <button
                            onClick={() => handlePageChange(pagination.current_page + 1)}
                            disabled={!pagination.has_next}
                            className={`px-3 py-1 rounded-md ${
                              pagination.has_next
                                ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </main>
        </div>

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
