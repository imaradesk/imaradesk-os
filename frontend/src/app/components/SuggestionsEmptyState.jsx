import React from 'react'
import { HelpCircle, Plus } from 'lucide-react'

/**
 * First-run empty state: "create your first X" on the left, "or", and a card of
 * suggestions on the right (stacked on phones).
 *
 *   <SuggestionsEmptyState
 *     title="Let's create your first solution article"
 *     description="…"
 *     action={<Link …>Create new</Link>}
 *     suggestionsTitle="Use our suggestions"
 *     suggestionsDescription="…"
 *     suggestions={[{ id, title, meta?, icon?, actions? }]}
 *     footer={<button …>Use suggestions</button>}
 *   />
 *
 * - `icon` is a rendered node (defaults to a help icon); `actions` sits at the row's right edge.
 * - `layout="pills"` shows short suggestions as clickable badges instead of rows; each item
 *   then takes `onClick`, and `meta` becomes its tooltip. `wrap(renderPill)` lets the pill be
 *   another component's trigger (e.g. a popover): call `renderPill(onClick)` to get the badge.
 * - `surface` is the background behind the component, used for the "or" label.
 */
export default function SuggestionsEmptyState({
  title,
  description,
  action,
  suggestionsTitle = 'Use our suggestions',
  suggestionsDescription,
  suggestions = [],
  footer,
  surface = 'bg-gray-50',
  layout = 'list',
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-[1fr_auto_1.2fr] items-center gap-8 py-6 sm:py-10">
        {/* Left: create from scratch */}
        <div className="text-center px-2 sm:px-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
          {description && (
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">{description}</p>
          )}
          {action}
        </div>

        {/* "or" divider: vertical on desktop, horizontal on phones */}
        <div className="hidden md:flex flex-col items-center justify-center h-52 relative" aria-hidden="true">
          <div className="h-full border-r border-gray-200" />
          <span className={`absolute ${surface} px-2 text-xs text-gray-400 font-medium`}>or</span>
        </div>
        <div className="md:hidden flex items-center gap-3 text-xs text-gray-400 font-medium" aria-hidden="true">
          <span className="flex-1 border-t border-gray-200" />or<span className="flex-1 border-t border-gray-200" />
        </div>

        {/* Right: suggestions card */}
        <div className="px-0 sm:px-4">
          <div className="text-center mb-4">
            <h3 className="text-base font-semibold text-gray-900">{suggestionsTitle}</h3>
            {suggestionsDescription && <p className="text-xs text-gray-500 mt-1">{suggestionsDescription}</p>}
          </div>

          {layout === 'pills' ? (
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((item) => {
                const renderPill = (onClick) => (
                  <button
                    type="button"
                    onClick={onClick}
                    disabled={item.disabled}
                    title={typeof item.meta === 'string' ? item.meta : undefined}
                    className="group inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-full border border-gray-200 bg-white text-sm text-gray-700 shadow-sm hover:border-[#0B3D26]/40 hover:bg-[#0B3D26]/5 hover:text-[#0B3D26] active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {item.icon || <HelpCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className="font-medium">{item.title}</span>
                    <Plus className="w-3.5 h-3.5 -mr-1 text-gray-300 group-hover:text-[#0B3D26] transition-colors" />
                  </button>
                )
                return <React.Fragment key={item.id}>{item.wrap ? item.wrap(renderPill) : renderPill(item.onClick)}</React.Fragment>
              })}
            </div>
          ) : (
            <ul className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
              {suggestions.map((item) => (
                <li key={item.id} className="group flex items-center justify-between px-4 py-3 gap-3 hover:bg-gray-50/80 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.icon || <HelpCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className={`${item.meta ? 'text-sm font-medium text-gray-800' : 'text-xs text-gray-700'} truncate`}>{item.title}</p>
                      {item.meta && <div className="text-xs text-gray-500 truncate">{item.meta}</div>}
                    </div>
                  </div>
                  {item.actions && <div className="flex items-center gap-1 flex-shrink-0">{item.actions}</div>}
                </li>
              ))}
            </ul>
          )}

          {footer && <div className="text-center mt-5">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
