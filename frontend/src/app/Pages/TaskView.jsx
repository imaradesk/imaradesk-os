import React, { useEffect, useRef, useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import {
  ListTodo, FolderKanban, ChevronRight, ChevronDown, Link2, Eye, EyeOff, MoreHorizontal, Paperclip,
  Pencil, Check, X, UserCircle2, UserPlus, Users, CalendarDays, Tag, Clock, CheckCircle2,
  MessageSquare, History, FileText, GitBranch, Ticket, Hash, ArrowUpRight, Plus, CircleDot, Shapes, ListChecks,
} from 'lucide-react'
import api from '../../utils/axios'
import useMediaQuery from '../../utils/useMediaQuery'
import AppShell from '../components/AppShell'
import FieldPopover from '../components/detail/FieldPopover'
import { Popover } from '../../components/Popover'
import RichEditor from '../components/RichEditor'
import DatePicker from '../components/pickers/DatePicker'
import DropdownMenu from '../components/DropdownMenu'
import ActivityTimeline from '../../components/ActivityTimeline'
import ConversationTab from '../components/ticket/ConversationTab'
import Tabs from '../components/Tabs'
import MentionHtml from '../components/ticket/MentionHtml'
import AttachmentsTab from '../components/ticket/AttachmentsTab'
import { TASK_STATUSES, TASK_STATUS_MAP, PRIORITIES } from '../components/tasks/constants'
import { useTaskTypes } from '../components/tasks/taskTypes'
import AddTaskTypeModal from '../components/tasks/AddTaskTypeModal'
import ConvertTaskModal from '../components/tasks/ConvertTaskModal'
import {
  TaskStatusIcon, TaskTypeIcon, taskTypeOptionIcon, PriorityIcon, priorityOptionIcon, MiniAvatar, DueDate, formatDate, apiError, Spinner,
} from '../components/tasks/ui'
import {
  IconButton, ChipButton, SmallAction, Section, DetailRow, TagsField, WatchersField, timeAgo,
} from '../components/detail/DetailUI'

// Status pill colours for the big status button (Jira-style lozenge)
const STATUS_STYLES = {
  todo: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  in_progress: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  review: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
  done: 'bg-green-100 text-green-700 hover:bg-green-200',
  cancelled: 'bg-red-100 text-red-700 hover:bg-red-200',
  draft: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
}

const RELATION_ICONS = { project: FolderKanban, ticket: Ticket, tags: Tag }

// Same trigger padding as the ticket page sidebar
// Rows are stacked (label above value), so triggers span the panel width
const TRIGGER = 'w-full'

const taskKey = (task) => `TASK-${task.id}`

const plainText = (html) => (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

export default function TaskView({
  task: serverTask, users = [], groups = [], projects = [], comments = [], attachments = [], activities = [], related_tasks: related = [],
}) {
  const { props } = usePage()
  const me = props.auth?.user
  // Optimistic overrides so edits feel instant; cleared when fresh props arrive
  const [overrides, setOverrides] = useState({})
  const task = { ...serverTask, ...overrides }
  const [saving, setSaving] = useState(null)
  const taskTypes = useTaskTypes()
  const [addingType, setAddingType] = useState(false)
  const [convertMode, setConvertMode] = useState(null)
  // Projects are keyed by uuid; keep the current one listed even if it's not in the picker list
  const projectOptions = (task.project && !projects.some((p) => p.uuid === task.project.uuid) ? [task.project, ...projects] : projects)
    .map((p) => ({ ...p, id: p.uuid }))

  const isLarge = useMediaQuery('(min-width: 1024px)')
  const [activeTab, setActiveTab] = useState('comments')
  const [newComment, setNewComment] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)
  const [commentMentions, setCommentMentions] = useState([])
  const [processing, setProcessing] = useState(false)
  const activityRef = useRef(null)

  useEffect(() => { setOverrides({}) }, [serverTask])

  const refresh = () => router.reload({
    only: ['task', 'activities', 'related_tasks', 'attachments', 'comments'],
    preserveScroll: true,
    preserveState: true,
  })

  /** Update one or more fields; `optimistic` is merged into the view right away. */
  const updateFields = async (payload, optimistic = {}, message = 'Task updated') => {
    const field = Object.keys(payload)[0]
    setOverrides((o) => ({ ...o, ...optimistic }))
    setSaving(field)
    try {
      await api.post(`/tasks/${task.uuid}/update/`, payload)
      if (message) toast.success(message)
      refresh()
      return true
    } catch (error) {
      setOverrides((o) => {
        const next = { ...o }
        Object.keys(optimistic).forEach((k) => delete next[k])
        return next
      })
      toast.error(apiError(error, 'Failed to update task'))
      return false
    } finally {
      setSaving(null)
    }
  }

  // Saves the chosen type; the object is applied optimistically so the row updates at once
  const setType = (type) => {
    if (!type) return
    updateFields({ task_type: type.id }, { task_type: type }, 'Type updated')
  }

  const handleSubmitComment = (commentData = null) => {
    const payload = commentData || {
      message: newComment,
      is_internal: commentInternal,
      mentions: commentMentions,
      attachments: [],
    }
    if (!payload.message?.trim() && (!payload.attachments || payload.attachments.length === 0)) {
      toast.error('Please enter a comment or attach a file')
      return
    }
    setProcessing(true)
    api.post(`/tasks/${task.uuid}/comment/`, {
      ...payload,
      attachments: JSON.stringify(payload.attachments || []),
    }).then(() => {
      toast.success('Comment added')
      setNewComment('')
      setCommentInternal(false)
      setCommentMentions([])
      refresh()
    }).catch(() => {
      toast.error('Failed to add comment')
    }).finally(() => setProcessing(false))
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      toast.loading('Uploading file...', { id: 'file-upload' })
      const uploadResponse = await api.post('/upload/', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const uploadData = uploadResponse.data

      const attachFormData = new FormData()
      attachFormData.append('file_url', uploadData.file_url)
      attachFormData.append('file_name', uploadData.file_name)
      attachFormData.append('file_size', uploadData.file_size)
      attachFormData.append('file_type', uploadData.file_type)
      await api.post(`/tasks/${task.uuid}/attachment/`, attachFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('File uploaded', { id: 'file-upload' })
      refresh()
    } catch {
      toast.error('Failed to upload file', { id: 'file-upload' })
    }
  }

  const pickFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = handleFileUpload
    input.click()
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  const watcherIds = (task.watchers || []).map((w) => w.id)
  const isWatching = !!me && watcherIds.includes(me.id)
  const toggleWatch = () => {
    if (!me) return
    const next = isWatching ? watcherIds.filter((id) => id !== me.id) : [...watcherIds, me.id]
    const nextWatchers = isWatching
      ? task.watchers.filter((w) => w.id !== me.id)
      : [...(task.watchers || []), { id: me.id, name: me.name }]
    updateFields({ watchers: next }, { watchers: nextWatchers }, isWatching ? 'Stopped watching' : 'Watching this task')
  }

  const scrollToActivity = (tab) => {
    setActiveTab(tab)
    activityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const sidePanel = (
    <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusButton
                  status={task.status}
                  label={TASK_STATUS_MAP[task.status]?.name || task.status_display}
                  busy={saving === 'status'}
                  onChange={(status) => updateFields(
                    { status },
                    { status, status_display: TASK_STATUS_MAP[status]?.name },
                    `Moved to ${TASK_STATUS_MAP[status]?.name}`,
                  )}
                />
                {task.status !== 'done' && task.status !== 'cancelled' && (
                  <button
                    onClick={() => updateFields({ status: 'done' }, { status: 'done', status_display: 'Done' }, 'Marked as done')}
                    disabled={!!saving}
                    className="h-9 px-3 inline-flex items-center gap-1.5 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600" /> Mark done
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">Details</h2>
                  {saving && <Spinner className="w-3.5 h-3.5 text-gray-400" />}
                </div>
                <dl className="px-2 py-1.5 divide-y divide-gray-100">
                  <DetailRow
                    stacked
                    icon={UserCircle2}
                    label="Assignee"
                    action={me && task.assignee?.id !== me.id && (
                      <button
                        type="button"
                        onClick={() => updateFields({ assignee: me.id }, { assignee: { id: me.id, name: me.name } }, 'Assigned to you')}
                        className="font-normal text-[#0B3D26] hover:underline"
                      >
                        Assign to me
                      </button>
                    )}
                  >
                    <FieldPopover
                      label="Assignee"
                      description="Who is working on this task"
                      value={task.assignee?.id || ''}
                      options={users}
                      optionIcon={(o) => <MiniAvatar user={o} size="w-5 h-5 text-[9px]" />}
                      emptyLabel="Unassigned"
                      searchable
                      triggerClassName={TRIGGER}
                      variant="field"
                      onPick={(value) => updateFields(
                        { assignee: value || null },
                        { assignee: users.find((u) => u.id === value) || null },
                        value ? 'Assignee updated' : 'Unassigned',
                      )}
                    >
                      {task.assignee ? (
                        <>
                          <MiniAvatar user={task.assignee} size="w-5 h-5 text-[9px]" />
                          <span className="text-sm text-gray-900 truncate">{task.assignee.name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </FieldPopover>
                  </DetailRow>

                  <DetailRow stacked icon={UserPlus} label="Reporter">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-900">
                      <MiniAvatar user={task.created_by} size="w-6 h-6 text-[10px]" />
                      <span className="truncate">{task.created_by?.name || 'Unknown'}</span>
                    </div>
                  </DetailRow>

                  <DetailRow stacked icon={Shapes} label="Type">
                    <FieldPopover
                      label="Type"
                      description="Change the task type"
                      value={task.task_type?.id ?? ''}
                      options={taskTypes || []}
                      searchable
                      optionIcon={taskTypeOptionIcon}
                      triggerClassName={TRIGGER}
                      variant="field"
                      width={240}
                      footerAction={{ label: 'Add type', onClick: () => setAddingType(true) }}
                      onPick={(id) => setType(taskTypes.find((t) => t.id === id))}
                    >
                      {task.task_type ? (
                        <>
                          <TaskTypeIcon type={task.task_type} />
                          <span className="text-sm text-gray-900 truncate">{task.task_type.name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">No type</span>
                      )}
                    </FieldPopover>
                    <AddTaskTypeModal isOpen={addingType} onClose={() => setAddingType(false)} onCreated={setType} />
                  </DetailRow>

                  <DetailRow stacked icon={CircleDot} label="Priority">
                    <FieldPopover
                      label="Priority"
                      description="Change the task priority"
                      value={task.priority || 'normal'}
                      options={PRIORITIES}
                      optionIcon={priorityOptionIcon}
                      triggerClassName={TRIGGER}
                      variant="field"
                      width={240}
                      onPick={(priority) => updateFields(
                        { priority },
                        { priority, priority_display: PRIORITIES.find((p) => p.id === priority)?.name },
                        'Priority updated',
                      )}
                    >
                      <PriorityIcon priority={task.priority || 'normal'} />
                      <span className="text-sm text-gray-900 truncate">
                        {task.priority_display || PRIORITIES.find((p) => p.id === (task.priority || 'normal'))?.name}
                      </span>
                    </FieldPopover>
                  </DetailRow>

                  <DetailRow stacked icon={FolderKanban} label="Project">
                    <div className="flex items-center gap-1">
                      <FieldPopover
                        label="Project"
                        description="Project this task belongs to"
                        value={task.project?.uuid || ''}
                        options={projectOptions}
                        optionIcon={() => <FolderKanban className="w-3.5 h-3.5 text-gray-500" />}
                        emptyLabel="No project"
                        searchable
                        triggerClassName={`${TRIGGER} flex-1`}
                        variant="field"
                        wrapperClassName="flex-1 min-w-0 mt-1"
                        onPick={(value) => updateFields(
                          { project: value || null },
                          { project: projects.find((p) => p.uuid === value) || null },
                          value ? 'Project updated' : 'Removed from project',
                        )}
                      >
                        <span className={`text-sm truncate ${task.project ? 'text-gray-900' : 'text-gray-400'}`}>{task.project?.name || 'No project'}</span>
                      </FieldPopover>
                      {task.project && (
                        <Link href={`/tasks/projects/${task.project.uuid}/`} className="mt-1 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Open project">
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </DetailRow>

                  <DetailRow stacked icon={Users} label="Group">
                    <FieldPopover
                      label="Group"
                      description="Team responsible for this task"
                      value={task.group?.id || ''}
                      options={groups}
                      emptyLabel="No group"
                      searchable
                      triggerClassName={TRIGGER}
                      variant="field"
                      onPick={(value) => updateFields(
                        { group: value || null },
                        { group: groups.find((g) => g.id === value) || null },
                        'Group updated',
                      )}
                    >
                      <span className={`text-sm truncate ${task.group ? 'text-gray-900' : 'text-gray-400'}`}>{task.group?.name || 'No group'}</span>
                    </FieldPopover>
                  </DetailRow>

                  <DetailRow stacked icon={CalendarDays} label="Due date">
                    <DueDateField
                      value={task.due_date}
                      status={task.status}
                      onSave={(due_date) => updateFields({ due_date: due_date || null }, { due_date: due_date || null }, due_date ? 'Due date updated' : 'Due date cleared')}
                    />
                  </DetailRow>

                  <DetailRow stacked icon={Tag} label="Tags">
                    <TagsField
                      tags={task.tags || []}
                      onSave={(tags) => updateFields({ tags }, { tags }, 'Tags updated')}
                    />
                  </DetailRow>

                  <DetailRow stacked icon={Eye} label="Watchers">
                    <WatchersField
                      watchers={task.watchers || []}
                      users={users}
                      onSave={(ids) => updateFields(
                        { watchers: ids },
                        { watchers: users.filter((u) => ids.includes(u.id)) },
                        'Watchers updated',
                      )}
                    />
                  </DetailRow>
                </dl>
              </div>

              <RelatedTasks tasks={related} />

              <div className="px-1 space-y-1 text-xs text-gray-500">
                <p className="flex items-center gap-1.5" title={task.created_at}>
                  <Clock className="w-3.5 h-3.5" /> Created {timeAgo(task.created_at)}
                </p>
                <p className="flex items-center gap-1.5" title={task.updated_at}>
                  <Pencil className="w-3.5 h-3.5" /> Updated {timeAgo(task.updated_at)}
                </p>
                {task.completed_at && (
                  <p className="flex items-center gap-1.5" title={task.completed_at}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Completed {timeAgo(task.completed_at)}
                  </p>
                )}
              </div>
    </div>
  )

  return (
    <>
      <Head title={`${taskKey(task)} ${task.title}`} />
      <AppShell active="tasks">
        <main className="flex-1 min-w-0 bg-white">
          {/* Top bar: breadcrumbs + actions */}
          <div className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
                <Link href="/tasks/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 flex-shrink-0">
                  <ListTodo className="w-4 h-4" /> Tasks
                </Link>
                {task.project && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <Link href={`/tasks/projects/${task.project.uuid}/`} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 min-w-0">
                      <FolderKanban className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{task.project.name}</span>
                    </Link>
                  </>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="inline-flex items-center gap-1.5 text-gray-900 font-medium flex-shrink-0">
                  <TaskStatusIcon status={task.status} /> {taskKey(task)}
                </span>
              </nav>

              <div className="flex items-center gap-1 flex-shrink-0">
                <IconButton
                  label={isWatching ? 'Stop watching' : 'Watch'}
                  onClick={toggleWatch}
                  active={isWatching}
                  disabled={!me || saving === 'watchers'}
                >
                  {isWatching ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {watcherIds.length > 0 && <span className="text-xs tabular-nums">{watcherIds.length}</span>}
                </IconButton>
                <IconButton label="Copy link" onClick={copyLink}>
                  <Link2 className="w-4 h-4" />
                </IconButton>
                <DropdownMenu
                  trigger={({ toggle }) => (
                    <IconButton label="More actions" onClick={toggle}>
                      <MoreHorizontal className="w-4 h-4" />
                    </IconButton>
                  )}
                  items={[
                    { label: 'Attach file', icon: Paperclip, onClick: pickFile },
                    { label: 'Copy task key', icon: Hash, onClick: () => navigator.clipboard?.writeText(taskKey(task)).then(() => toast.success('Copied')) },
                    task.project && { label: 'Open project', icon: FolderKanban, href: `/tasks/projects/${task.project.uuid}/` },
                    task.converted_to_ticket
                      ? { label: `Open ticket ${task.converted_to_ticket.ticket_number}`, icon: Ticket, href: `/tickets/${task.converted_to_ticket.uuid}/` }
                      : { label: 'Convert to ticket', icon: Ticket, onClick: () => setConvertMode('ticket') },
                    task.converted_to_work_item
                      ? { label: 'Open work item ticket', icon: ListChecks, href: `/tickets/${task.converted_to_work_item.ticket.uuid}/` }
                      : { label: 'Convert to work item', icon: ListChecks, onClick: () => setConvertMode('work_item') },
                    { type: 'divider' },
                    { label: 'Back to tasks', icon: ListTodo, href: '/tasks/' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8">
            {/* ── Main column ─────────────────────────── */}
            <div className="min-w-0 space-y-8 animate-fadeIn">
              <div>
                <EditableTitle
                  value={task.title}
                  onSave={(title) => updateFields({ title }, { title }, 'Title updated')}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ChipButton icon={Paperclip} onClick={pickFile}>Attach</ChipButton>
                  <ChipButton icon={MessageSquare} onClick={() => scrollToActivity('comments')}>
                    Comment{comments.length > 0 && <span className="text-gray-400 tabular-nums">{comments.length}</span>}
                  </ChipButton>
                  {!isLarge && (
                    <Popover
                      width={340}
                      maxHeight={520}
                      strategy="fixed"
                      showArrow
                      trigger={({ toggle }) => (
                        <ChipButton icon={MoreHorizontal} onClick={toggle}>More</ChipButton>
                      )}
                    >
                      {() => <div className="p-3 max-h-[70vh] overflow-y-auto">{sidePanel}</div>}
                    </Popover>
                  )}
                </div>
              </div>

              <Section icon={FileText} title="Description">
                <EditableDescription
                  value={task.description}
                  onSave={(description) => updateFields({ description }, { description }, 'Description updated')}
                />
              </Section>

              {(task.related_ticket || task.converted_from_ticket || task.converted_to_ticket || task.converted_to_work_item) && (
                <Section icon={Ticket} title="Linked tickets">
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['Related ticket', task.related_ticket],
                      ['Converted from', task.converted_from_ticket],
                      ['Converted to ticket', task.converted_to_ticket],
                      ['Converted to work item on', task.converted_to_work_item?.ticket],
                    ].map(([label, t]) => t && (
                      <Link
                        key={label}
                        href={`/tickets/${t.uuid}/`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm transition-colors"
                      >
                        <Ticket className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">{label}</span>
                        <span className="text-gray-900 font-medium truncate max-w-[16rem]">{t.ticket_number} {t.title}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </Section>
              )}

              {attachments.length > 0 && (
                <Section
                  icon={Paperclip}
                  title="Attachments"
                  count={attachments.length}
                  action={<SmallAction icon={Plus} onClick={pickFile}>Add</SmallAction>}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <span className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-gray-500" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-gray-900 truncate">{att.file_name}</span>
                          <span className="block text-xs text-gray-400">{timeAgo(att.uploaded_at)}</span>
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-gray-400" />
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* Activity */}
              <section ref={activityRef} className="scroll-mt-16">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">Activity</h2>
                </div>
                <div className="mb-4">
                  <Tabs
                    label="Task activity"
                    active={activeTab}
                    onChange={scrollToActivity}
                    tabs={[
                      { id: 'comments', icon: MessageSquare, label: 'Comments', count: comments.length },
                      { id: 'history', icon: History, label: 'History', count: activities.length },
                      { id: 'attachments', icon: Paperclip, label: 'Files', count: attachments.length },
                    ]}
                  />
                </div>

                <div
                  key={activeTab}
                  className={`animate-fadeIn overflow-hidden ${
                    activeTab === 'comments'
                      ? 'h-[calc(100dvh-9rem)] min-h-[360px] max-h-[720px]'
                      : 'h-[560px]'
                  }`}
                >
                  {activeTab === 'comments' && (
                    <ConversationTab
                      task={task}
                      comments={comments}
                      newComment={newComment}
                      setNewComment={setNewComment}
                      commentInternal={commentInternal}
                      setCommentInternal={setCommentInternal}
                      commentMentions={commentMentions}
                      onMentionsChange={setCommentMentions}
                      processing={processing}
                      onSubmitComment={handleSubmitComment}
                      onFileUpload={handleFileUpload}
                    />
                  )}
                  {activeTab === 'history' && (
                    <div className="h-full overflow-y-auto">
                      {activities.length > 0
                        ? <ActivityTimeline activities={activities} />
                        : <div className="h-full flex items-center justify-center"><p className="text-sm text-gray-400">No history yet.</p></div>}
                    </div>
                  )}
                  {activeTab === 'attachments' && (
                    <AttachmentsTab attachments={attachments} onAddAttachment={pickFile} />
                  )}
                </div>
              </section>
            </div>

            {/* ── Side panel (large screens) ─────────── */}
            {isLarge && (
              <aside className="lg:sticky lg:top-16 self-start animate-fadeIn">
                {sidePanel}
              </aside>
            )}
          </div>
        </main>
      <ConvertTaskModal isOpen={!!convertMode} initialMode={convertMode || 'ticket'} onClose={() => setConvertMode(null)} task={task} users={users} groups={groups} />
    </AppShell>
    </>
  )
}

// ─────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────

function EditableTitle({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const cancelledRef = useRef(false)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  const commit = async () => {
    if (cancelledRef.current) { cancelledRef.current = false; return }
    const title = draft.trim()
    if (!title || title === value) {
      setEditing(false)
      setDraft(value)
      return
    }
    setEditing(false)
    await onSave(title)
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        rows={1}
        value={draft}
        maxLength={255}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { cancelledRef.current = true; setDraft(value); setEditing(false) }
        }}
        className="w-full resize-none text-2xl font-semibold text-gray-900 leading-snug px-2 -mx-2 py-1 rounded-md border border-[#0B3D26]/30 focus:outline-none focus:ring-2 focus:ring-[#0B3D26]/20"
        aria-label="Task title"
      />
    )
  }

  return (
    <h1
      onClick={() => setEditing(true)}
      title="Click to edit"
      className="text-2xl font-semibold text-gray-900 leading-snug px-2 -mx-2 py-1 rounded-md border border-transparent hover:bg-gray-50 cursor-text transition-colors break-words"
    >
      {value}
    </h1>
  )
}

function EditableDescription({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)

  const start = () => { setDraft(value || ''); setEditing(true) }

  const save = async () => {
    if (!plainText(draft)) {
      toast.error('Description is required')
      return
    }
    setSaving(true)
    const ok = await onSave(draft)
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (editing) {
    return (
      <div className="space-y-2 animate-fadeIn">
        <div>
          <RichEditor value={draft} onChange={setDraft} placeholder="Describe the task…" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="h-8 px-3 inline-flex items-center gap-1.5 text-sm font-medium rounded-md bg-[#0B3D26] hover:bg-[#14502F] text-white disabled:opacity-60"
          >
            {saving ? <Spinner className="w-3.5 h-3.5" /> : <Check className="w-4 h-4" />} Save
          </button>
          <button onClick={() => setEditing(false)} disabled={saving} className="h-8 px-3 text-sm rounded-md text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const empty = !plainText(value)
  return (
    <div
      onClick={(e) => { if (!e.target.closest('a')) start() }}
      className="group relative -mx-2 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-text transition-colors"
    >
      {empty ? (
        <p className="text-sm text-gray-400">Add a description…</p>
      ) : (
        <MentionHtml
          className="text-sm text-gray-800 leading-relaxed break-words [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_a]:text-[#0B3D26] [&_a]:underline [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded-md [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_img]:max-w-full [&_img]:rounded-md"
          html={value}
        />
      )}
      <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5 shadow-sm">
        <Pencil className="w-3 h-3" /> Edit
      </span>
    </div>
  )
}

function StatusButton({ status, label, busy, onChange }) {
  return (
    <DropdownMenu
      align="left"
      trigger={({ toggle, open }) => (
        <button
          onClick={toggle}
          aria-expanded={open}
          className={`h-9 px-3 inline-flex items-center gap-2 rounded-md text-sm font-semibold uppercase tracking-wide transition-colors ${STATUS_STYLES[status] || STATUS_STYLES.todo}`}
        >
          {busy ? <Spinner className="w-3.5 h-3.5" /> : <TaskStatusIcon status={status} />}
          {label}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      items={[
        { type: 'header', label: 'Move to' },
        ...TASK_STATUSES.filter((s) => s.id !== status).map((s) => ({
          label: s.name,
          icon: (iconProps) => <TaskStatusIcon status={s.id} {...iconProps} />,
          onClick: () => onChange(s.id),
        })),
      ]}
    />
  )
}

const isoDate = (date) => {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
const daysFromNow = (n) => isoDate(new Date(Date.now() + n * 86400000))

const DUE_SHORTCUTS = [
  ['Today', 0],
  ['Tomorrow', 1],
  ['In 3 days', 3],
  ['Next week', 7],
]

/** Due date as a click-to-edit popover with quick picks, matching FieldPopover. */
function DueDateField({ value, status, onSave }) {
  const today = isoDate(new Date())
  const overdue = !!value && value < today && !['done', 'cancelled'].includes(status)
  const pick = (close, next) => {
    close()
    if ((next || null) !== (value || null)) onSave(next)
  }

  return (
    <Popover
      strategy="fixed"
      showArrow
      width={260}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          title="Edit"
          className="group flex items-center gap-1.5 min-w-0 w-full rounded px-2 py-1.5 hover:bg-gray-100 transition-colors"
        >
          {value ? <DueDate date={value} overdue={overdue} /> : <span className="text-sm text-gray-400">None</span>}
          <Pencil className={`w-3 h-3 flex-shrink-0 transition-opacity ${open ? 'opacity-100 text-[#0B3D26]' : 'opacity-0 group-hover:opacity-100 text-gray-400'}`} />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="px-4 py-2 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-900">Due date</div>
            <div className="text-xs text-gray-500">When this task should be done</div>
          </div>
          <div className="py-1">
            {DUE_SHORTCUTS.map(([label, days]) => {
              const date = daysFromNow(days)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pick(close, date)}
                  className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 transition-colors"
                >
                  <span className={`flex-1 text-sm ${value === date ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{label}</span>
                  <span className="text-xs text-gray-400 tabular-nums">{formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  {value === date && <Check className="w-4 h-4 text-[#0B3D26]" />}
                </button>
              )
            })}
          </div>
          <div className="px-4 py-2.5 border-t border-gray-200 space-y-2">
            <DatePicker
              value={value || ''}
              onChange={(v) => v && pick(close, v)}
              aria-label="Pick a date"
              placeholder="Pick a date"
              size="sm"
            />
            {value && (
              <button
                type="button"
                onClick={() => pick(close, '')}
                className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear due date
              </button>
            )}
          </div>
        </>
      )}
    </Popover>
  )
}

function RelatedTasks({ tasks }) {
  return (
    <section id="related-tasks" className="rounded-xl border border-gray-200 overflow-hidden scroll-mt-16">
      <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Related tasks</h2>
        {tasks.length > 0 && <span className="px-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-500 tabular-nums">{tasks.length}</span>}
      </div>
      {tasks.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <GitBranch className="w-5 h-5 mx-auto text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No related tasks yet</p>
          <p className="text-xs text-gray-400">Tasks in the same project, from the same ticket or with shared tags show up here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {tasks.map((t) => {
            const RelationIcon = RELATION_ICONS[t.relation] || GitBranch
            const closed = t.status === 'done' || t.status === 'cancelled'
            return (
              <li key={t.uuid}>
                <Link
                  href={`/tasks/${t.uuid}/`}
                  title={`${t.title} · ${t.status_display}`}
                  className="group flex items-start gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="mt-0.5 flex-shrink-0"><TaskStatusIcon status={t.status} /></span>
                  <span className="flex-1 min-w-0">
                    <span className={`block truncate text-sm ${closed ? 'text-gray-400 line-through' : 'text-gray-900 group-hover:text-[#0B3D26]'}`}>
                      {t.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                      <span className="tabular-nums">{taskKey(t)}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1 min-w-0 truncate">
                        <RelationIcon className="w-3 h-3 flex-shrink-0" /> {t.relation_display}
                      </span>
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 flex-shrink-0">
                    <PriorityIcon priority={t.priority} />
                    <MiniAvatar user={t.assignee} />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
