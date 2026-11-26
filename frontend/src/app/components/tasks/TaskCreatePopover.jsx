import React from 'react'
import { Popover } from '../../../components/Popover'
import TaskCreateForm from './TaskCreateForm'

/**
 * Popover wrapper around TaskCreateForm. `trigger` receives the Popover's
 * { open, toggle, close } so any button can open the form.
 */
export default function TaskCreatePopover({
  trigger,
  status,
  defaultProject,
  lockProject = false,
  onCreated,
  placement = 'auto',
  strategy = 'fixed', // escapes scrolling/clipping containers such as boards
  className = '',
  width: requestedWidth = 500,
}) {
  const width = typeof window !== 'undefined' ? Math.min(requestedWidth, window.innerWidth - 16) : requestedWidth

  return (
    <Popover
      width={width}
      maxHeight={600}
      showArrow={true}
      placement={placement}
      strategy={strategy}
      className={className}
      trigger={trigger}
    >
      {({ close, open }) => open && (
        <TaskCreateForm
          close={close}
          status={status}
          defaultProject={defaultProject}
          lockProject={lockProject}
          onCreated={onCreated}
        />
      )}
    </Popover>
  )
}
