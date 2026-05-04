import React, { useState, useEffect } from 'react'

function useCountdown(targetDate, isPaused) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!targetDate) return null
    return Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000)
  })

  useEffect(() => {
    if (!targetDate || isPaused) return

    const tick = () => {
      setTimeLeft(Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [targetDate, isPaused])

  return timeLeft
}

function formatCountdown(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined) return null
  const isOverdue = totalSeconds < 0
  const abs = Math.abs(totalSeconds)
  const days = Math.floor(abs / 86400)
  const hours = Math.floor((abs % 86400) / 3600)
  const minutes = Math.floor((abs % 3600) / 60)
  const seconds = abs % 60

  let parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  parts.push(`${String(seconds).padStart(2, '0')}s`)

  return { text: parts.join(' '), isOverdue }
}

function CountdownDisplay({ targetDate, breached, isPaused, label }) {
  const timeLeft = useCountdown(targetDate, isPaused)
  const countdown = formatCountdown(timeLeft)

  if (!targetDate) {
    return <span className="text-gray-400 text-sm">Not set</span>
  }

  if (isPaused) {
    return (
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-yellow-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-yellow-600 font-semibold text-lg">Paused</span>
      </div>
    )
  }

  const isOverdue = breached || countdown?.isOverdue

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500' : timeLeft < 3600 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
      <span className={`font-mono text-xl font-bold tabular-nums ${isOverdue ? 'text-red-600' : timeLeft < 3600 ? 'text-yellow-600' : 'text-green-600'}`}>
        {isOverdue ? '−' : ''}{countdown?.text}
      </span>
      {isOverdue && <span className="text-xs text-red-500 font-medium">OVERDUE</span>}
    </div>
  )
}

export default function SLATab({ slaData }) {
  if (!slaData) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500 text-lg">No SLA policy applied</p>
        <p className="text-gray-400 text-sm mt-1">This ticket is not covered by an SLA policy</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white -sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">SLA Information</h3>
        </div>

        {/* SLA Status */}
        {slaData.is_on_hold && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-yellow-800">SLA Timer is On Hold</p>
                <p className="text-sm text-yellow-700 mt-1"><strong>Reason:</strong> {slaData.hold_reason}</p>
                {slaData.hold_started_at && (
                  <p className="text-xs text-yellow-600 mt-1">Hold started: {new Date(slaData.hold_started_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Countdown Timers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`p-5 rounded-xl border-2 ${
            slaData.response_breached ? 'bg-red-50 border-red-300' :
            slaData.is_on_hold ? 'bg-yellow-50 border-yellow-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <label className="text-sm font-semibold text-gray-700">First Response</label>
              </div>
              {slaData.response_breached && (
                <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full font-medium">Breached</span>
              )}
            </div>
            <CountdownDisplay
              targetDate={slaData.response_due_at}
              breached={slaData.response_breached}
              isPaused={slaData.is_on_hold}
            />
            <p className="text-xs text-gray-500 mt-2">
              Due: {slaData.response_due_at ? new Date(slaData.response_due_at).toLocaleString() : 'Not set'}
            </p>
            {slaData.responded_at && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Responded at: {new Date(slaData.responded_at).toLocaleString()}
              </p>
            )}
          </div>

          <div className={`p-5 rounded-xl border-2 ${
            slaData.resolution_breached ? 'bg-red-50 border-red-300' :
            slaData.is_on_hold ? 'bg-yellow-50 border-yellow-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <label className="text-sm font-semibold text-gray-700">Resolution</label>
              </div>
              {slaData.resolution_breached && (
                <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full font-medium">Breached</span>
              )}
            </div>
            <CountdownDisplay
              targetDate={slaData.resolution_due_at}
              breached={slaData.resolution_breached}
              isPaused={slaData.is_on_hold}
            />
            <p className="text-xs text-gray-500 mt-2">
              Due: {slaData.resolution_due_at ? new Date(slaData.resolution_due_at).toLocaleString() : 'Not set'}
            </p>
            {slaData.resolved_at && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Resolved at: {new Date(slaData.resolved_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Policy Details */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Policy Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Policy Name</label>
                <p className="text-gray-900 font-medium">{slaData.policy?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Priority</label>
                <p className="text-gray-900">
                  <span className={`px-2 py-1 text-sm rounded-full ${
                    slaData.policy?.priority === 'critical' ? 'bg-red-100 text-red-700' :
                    slaData.policy?.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    slaData.policy?.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {slaData.policy?.priority}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Total Hold Time</label>
                <p className="text-gray-900">{slaData.total_hold_time || 0} minutes</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">First Response Target</label>
                <p className="text-gray-900">{slaData.policy?.first_response_time} minutes</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Resolution Target</label>
                <p className="text-gray-900">{slaData.policy?.resolution_time} minutes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hold History */}
        {slaData.hold_history && slaData.hold_history.length > 0 && (
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Hold History</h4>
            <div className="space-y-2">
              {slaData.hold_history.map((hold, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{hold.reason}</p>
                    <p className="text-gray-500 text-xs">
                      {hold.started_at && `Started: ${new Date(hold.started_at).toLocaleString()}`}
                      {hold.ended_at && ` • Ended: ${new Date(hold.ended_at).toLocaleString()}`}
                    </p>
                  </div>
                  <span className="text-gray-600">{hold.duration_minutes || 0} min</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
