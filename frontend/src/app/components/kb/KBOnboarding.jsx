import React from 'react'
import { Plus } from 'lucide-react'
import SuggestionsEmptyState from '../SuggestionsEmptyState'
import { ARTICLE_TEMPLATES } from './templates'
import { useKBLayout, newArticlePrefill } from './KBLayout'
import { CategoryIcon, PRIMARY_BTN } from './ui'

const DEFAULT_TITLE = "Let's create your first article"
const DEFAULT_DESCRIPTION = 'Articles give customers self-serve answers in your support portal, so common questions get resolved without a ticket.'

/**
 * Empty state for an article list: write from scratch, or pick a suggested article
 * pill (opens the article drawer prefilled, where it can be reviewed before saving).
 * `category` preselects a category.
 */
export default function KBOnboarding({ title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION, category = null }) {
  const { openArticleForm } = useKBLayout()

  return (
    <SuggestionsEmptyState
      surface="bg-white"
      title={title}
      description={description}
      action={(
        <button type="button" onClick={() => openArticleForm(null, newArticlePrefill({ category }))} className={`${PRIMARY_BTN} !h-9 !px-4`}>
          <Plus className="w-4 h-4" /> Create new
        </button>
      )}
      layout="pills"
      suggestionsDescription="Start from an article commonly published by support teams"
      suggestions={ARTICLE_TEMPLATES.map((t) => ({
        id: t.id,
        title: t.title,
        meta: t.summary,
        icon: <CategoryIcon icon={t.icon} size="w-5 h-5" iconSize="w-3 h-3" className="bg-[#0B3D26]/10 text-[#0B3D26] !rounded-full" />,
        onClick: () => openArticleForm(null, newArticlePrefill({ template: t, category })),
      }))}
    />
  )
}
