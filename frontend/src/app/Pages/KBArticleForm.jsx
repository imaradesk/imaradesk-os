import React, { useState } from 'react'
import { Head, useForm, Link, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import api from '../../utils/axios'
import AppShell from '../components/AppShell'
import KBSidebar from '../components/KBSidebar'
import Select from '../components/SearchableSelect'
import RichEditor from '../components/RichEditor'
import { THEME } from '../constants/theme'
import { ArrowLeft, Info, Upload, X } from 'lucide-react'

export default function KBArticleForm({ mode = 'add', article = {}, categories = [], errors: serverErrors = {}, sidebar = {}, kbSettings = {} }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [imagePreview, setImagePreview] = useState(article.display_image || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Default to 'pending' for new articles when require_approval is ON
  const defaultStatus = mode === 'add' && kbSettings.requireApproval ? 'pending' : (article.status || 'draft')
  
  const { data, setData, post, processing, errors } = useForm({
    title: article.title || '',
    summary: article.summary || '',
    content: article.content || '',
    category: article.category || '',
    tags: article.tags || '',
    status: defaultStatus,
    featured: article.featured || false,
    allow_comments: article.allow_comments !== undefined ? article.allow_comments : true,
    display_image: article.display_image || '',
  })

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview the image immediately
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    // Upload to server
    setUploadingImage(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', 'kb-images')

    try {
      const response = await api.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percent)
        }
      })
      setData('display_image', response.data.file_url)
      toast.success('Image uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload image')
      setImagePreview(null)
    } finally {
      setUploadingImage(false)
      setUploadProgress(0)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    setData('display_image', '')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const url = mode === 'add' ? '/knowledgebase/article/add/' : `/knowledgebase/article/${article.uuid}/update/`
    const successMsg = mode === 'add' ? 'Article created successfully!' : 'Article updated successfully!'
    
    toast.promise(
      new Promise((resolve, reject) => {
        post(url, {
          headers: {
            'X-CSRFToken': window.csrfToken,
          },
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            router.visit('/knowledgebase/')
            resolve()
          },
          onError: () => reject(),
        })
      }),
      {
        loading: mode === 'add' ? 'Creating article...' : 'Updating article...',
        success: successMsg,
        error: 'Operation failed',
      }
    )
  }

  const handleNext = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (currentStep === 1) {
      if (!data.title || !data.category) {
        toast.error('Please fill in all required fields')
        return false
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!data.content) {
        toast.error('Article content is required')
        return false
      }
      setCurrentStep(3)
    }
    return false
  }

  const handleBack = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
    return false
  }

  const allErrors = { ...serverErrors, ...errors }

  return (
    <>
      <Head title={mode === 'add' ? 'Add Article' : 'Edit Article'} />
      <AppShell active="knowledgebase">
        <div className="flex">
          <KBSidebar
            views={sidebar.views || []}
            currentView={sidebar.currentView || 'all'}
            activePage="new-article"
            pendingCount={sidebar.pendingCount || 0}
          />
          <main className="flex-1 bg-gray-50">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
            <Link
              href="/knowledgebase/"
              className="p-2 rounded-md hover:bg-gray-100"
              title="Back to Knowledge Base"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-800">
              {mode === 'add' ? 'Add Article' : 'Edit Article'}
            </h1>
          </div>

          <div className="flex gap-0">
            {/* Vertical Step Indicators */}
            <div className="w-64 flex-shrink-0 border-r border-gray-200 p-6">
              <div className="sticky top-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">Steps</h3>
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                      currentStep === 1 ? 'bg-[#4a154b] text-white' : currentStep > 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {currentStep > 1 ? '✓' : '1'}
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className={`text-sm font-medium ${currentStep === 1 ? 'text-gray-900' : currentStep > 1 ? 'text-green-600' : 'text-gray-500'}`}>
                        Basic Information
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Title, category & summary</p>
                    </div>
                  </div>

                  {/* Connector Line */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex justify-center">
                      <div className={`w-0.5 h-8 ${currentStep > 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                      currentStep === 2 ? 'bg-[#4a154b] text-white' : currentStep > 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {currentStep > 2 ? '✓' : '2'}
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className={`text-sm font-medium ${currentStep === 2 ? 'text-gray-900' : currentStep > 2 ? 'text-green-600' : 'text-gray-500'}`}>
                        Article Content
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Write the article body</p>
                    </div>
                  </div>

                  {/* Connector Line */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex justify-center">
                      <div className={`w-0.5 h-8 ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                      currentStep === 3 ? 'bg-[#4a154b] text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      3
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className={`text-sm font-medium ${currentStep === 3 ? 'text-gray-900' : 'text-gray-500'}`}>
                        Settings & Publish
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Tags, status & options</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 p-6">
              <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Article Title* <span className="text-xs text-gray-500">(required)</span>
                      </label>
                      <input
                        type="text"
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#4a154b] focus:border-transparent ${
                          allErrors?.title ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter article title"
                      />
                      {allErrors?.title && <p className="mt-1 text-sm text-red-600">{allErrors.title}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category* <span className="text-xs text-gray-500">(required)</span>
                      </label>
                      <Select
                        value={data.category}
                        onChange={(value) => setData('category', value)}
                        options={categories}
                        placeholder="Select category"
                        displayKey="name"
                        valueKey="id"
                        searchable={true}
                        allowClear={false}
                      />
                      {allErrors?.category && <p className="mt-1 text-sm text-red-600">{allErrors.category}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
                      <textarea
                        value={data.summary}
                        onChange={(e) => setData('summary', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                        placeholder="Brief summary of the article (optional)"
                      />
                      <p className="text-xs text-gray-500 mt-1">A short description that appears in search results</p>
                    </div>

                    {/* Display Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Display Image</label>
                      {imagePreview ? (
                        <div className="relative inline-block">
                          <img
                            src={imagePreview}
                            alt="Display preview"
                            className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full max-w-md h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#4a154b] hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploadingImage ? (
                              <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4a154b] mb-3"></div>
                                <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
                                <div className="w-48 bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                                  <div
                                    className="h-1.5 rounded-full bg-[#4a154b] transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                                <p className="text-sm text-gray-600">Click to upload display image</p>
                                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </label>
                      )}
                      <p className="text-xs text-gray-500 mt-1">This image will be displayed as the article header</p>
                    </div>
                  </>
                )}

                {/* Step 2: Article Content */}
                {currentStep === 2 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Article Content* <span className="text-xs text-gray-500">(required)</span>
                      </label>
                      <RichEditor
                        value={data.content}
                        onChange={(html) => setData('content', html)}
                        placeholder="Write your article content here..."
                      />
                      {allErrors?.content && <p className="mt-1 text-sm text-red-600">{allErrors.content}</p>}
                    </div>
                  </>
                )}

                {/* Step 3: Settings & Publish */}
                {currentStep === 3 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                      <input
                        type="text"
                        value={data.tags}
                        onChange={(e) => setData('tags', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                        placeholder="tag1, tag2, tag3"
                      />
                      <p className="text-xs text-gray-500 mt-1">Comma-separated tags for easier searching</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={data.status}
                        onChange={(e) => setData('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4a154b] focus:border-transparent"
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending Review</option>
                        {!kbSettings.requireApproval && (
                          <option value="published">Published</option>
                        )}
                      </select>
                      {kbSettings.requireApproval && (
                        <p className="mt-2 text-sm text-blue-600 flex items-start gap-2">
                          <Info className="w-5 h-5 flex-shrink-0" />
                          <span>Approval is required. Select "Pending Review" to submit for approval.</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 border border-gray-200 rounded-md p-4 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="featured"
                          checked={data.featured}
                          onChange={(e) => setData('featured', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="featured" className="text-sm text-gray-700">
                          Feature this article
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allow_comments"
                          checked={data.allow_comments}
                          onChange={(e) => setData('allow_comments', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="allow_comments" className="text-sm text-gray-700">
                          Allow comments on this article
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        className={`px-4 py-2 rounded-md ${THEME.button.secondary}`}
                      >
                        Back
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/knowledgebase/"
                      className={`px-4 py-2 rounded-md ${THEME.button.secondary}`}
                    >
                      Cancel
                    </Link>
                    {currentStep < 3 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className={`px-4 py-2 rounded-md ${THEME.button.primary}`}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={processing}
                        className={`px-4 py-2 rounded-md ${THEME.button.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {mode === 'add' ? 'Create Article' : 'Update Article'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
        </div>
      </AppShell>
    </>
  )
}
